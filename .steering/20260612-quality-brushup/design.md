# 設計書

## アーキテクチャ概要

既存のレイヤードアーキテクチャ(Scene → System → Entity → config/types)を維持し、演出は以下の方針で組み込む:

- **演出のチューニング値**は新設の `src/config/effects.ts` に集約(`balance.ts` と同じ `as const` パターン)
- **副作用を伴う演出統括**は新設の System クラス `EffectsManager`(GameScene が所有、CombatSystem のコールバックから呼ぶ)
- **純粋計算**(HUD アニメの進行率等)は `src/systems/hudFx.ts` に Phaser 非依存の純粋関数として切り出し、ユニットテスト対象にする
- **難易度調整**は `balance.ts` に `STAGE_TUNING`(ステージ別係数)を追加し、SpawnSystem → Enemy へ伝搬

```
GameScene ──所有──> EffectsManager(shake/hitstop/explosion/赤フラッシュ)
    │                    │ 参照
    │ コールバック        ▼
CombatSystem ──> onHit(+shotKind)/onEnemyDefeated/onPlayerDamaged/onBossDefeated
    │
UIScene ──> LifeBar(被ダメフラッシュ)/BossHpBar(出現演出)/TouchControls(押下表示)
    │ registry(HUD.* に shoot/jump 押下状態を追加)
sceneTransition.ts(フェード遷移ヘルパ) ──> 全 Scene の scene.start を置換
```

## コンポーネント設計

### 1. `src/config/effects.ts`(新規)

**責務**: 演出のチューニング値の一元管理。

- `EFFECTS` 定数: 爆発パーティクル(数・速度・寿命・色)、カメラシェイク(強度・時間)、ヒットストップ(ms)、被弾フラッシュ(色・ms)、シーンフェード(in/out ms)、HUD 演出(LifeBar フラッシュ ms、BossHpBar フィル ms)、タッチ押下表示(アルファ・スケール)、ボス撃破シーケンス(爆発回数・間隔・総時間)
- 命名は development-guidelines 準拠(単位サフィックス `...Ms` 等)

### 2. `src/systems/EffectsManager.ts`(新規・System クラス)

**責務**: GameScene 上の演出実行(パーティクル爆発・カメラシェイク・ヒットストップ・被ダメ赤フラッシュ・ボス撃破シーケンス)。

**実装の要点**:
- Phaser 3.80 の新パーティクル API(`scene.add.particles(x, y, texture, config)`)で単発爆発を `explosion.explode(count)` 実行。emitter は使い捨てだが `stop()+destroy()` を遅延で確実に行いリークを防ぐ
- パーティクルテクスチャは `TEX.spark`(小さな発光オーブ)を PreloadScene で手続き生成(既存 `makeOrb` 流用)
- **ヒットストップ**: `scene.physics.world.pause()` → `scene.time.delayedCall(ms)` で `resume()`。多重発火は `resumeAt` を後ろへ伸ばすだけにし、二重 resume を防ぐ。GameScene の update は止めない(60〜90ms なので AI タイマー進行は体感不能、物理停止のみで視覚効果は成立)
- **赤フラッシュ**: `cameras.main.flash(durationMs, r, g, b)` を低強度で使用
- **ボス撃破シーケンス**: `time.addEvent`(repeat)でボス位置周辺にランダムオフセットの爆発を連続生成 + 大シェイク + ヒットストップ。完了コールバックで GameScene がクリア遷移する
- シーン SHUTDOWN で内部タイマーを破棄(リーク防止)

### 3. `src/systems/hudFx.ts`(新規・純粋関数)

**責務**: HUD 演出の進行計算(Phaser 非依存)。

- `entranceFillRatio(elapsedMs, fillMs)`: BossHpBar 出現時の 0→1 フィル進行(easeOut)。境界: elapsed≤0 で 0、≥fillMs で 1
- `damageFlashActive(nowMs, damagedAtMs, flashMs)`: 被ダメフラッシュ窓の判定
- `flashBlinkOn(nowMs, damagedAtMs, intervalMs)`: フラッシュ中の点滅位相

### 4. `CharacterRig` 拡張(被弾白フラッシュ)

**責務**: 既存の `triggerHit`(のけぞり)に、ヒット窓中のパーツ白塗りフラッシュ(`setTintFill`)を追加。

**実装の要点**:
- `setTint` は乗算のため白(0xffffff)では変化しない。**`setTintFill`(塗り潰し)を使う**
- `update()` 内で hitActive の立ち上がりで塗り、立ち下がりで `clearTint`。Boss の stagger ティント(`setTint(0xff6b6b)`)は毎フレーム `updateRig` が rig.update より先に再適用するため衝突しない
- フラッシュ色・時間は `EFFECTS` から取得

### 5. `CombatSystem` 拡張(onHit に弾種を追加)

- `onHit?: (x, y, target, shotKind: ProjectileKind)` に拡張し、チャージ弾命中時のみヒットストップを発火できるようにする
- `Projectile` の既存 `kind` を衝突ハンドラで参照して渡す(deactivate 前に読む)

### 6. `src/systems/sceneTransition.ts`(新規)

**責務**: フェード付きシーン遷移の共通化。

- `transitionTo(scene, key, data?)`: 多重発火ガード(`isFading` を scene.data で管理)→ `cameras.main.fadeOut(EFFECTS.fade.outMs)` → 完了で `scene.scene.start(key, data)`
- `fadeIn(scene)`: 各シーン `create()` 冒頭で呼ぶ
- 適用箇所: TitleScene→Game、GameScene→Clear/GameOver、ClearScene→Game/Title、GameOverScene→Game/Title(BootScene→Preload→Title は瞬時のままで可: ロード画面のため)

### 7. HUD 演出(`LifeBar` / `BossHpBar` 拡張)

- **LifeBar**: `render(hp, maxHp, nowMs)` に拡張。HP 減少を検知したらフラッシュ開始時刻を記録し、フラッシュ窓中は失ったセグメントを白/警告色で点滅させてから消す(hudFx の純粋関数で位相計算)
- **BossHpBar**: `show()` で出現時刻を記録し、`render` の表示比率を `min(実比率, entranceFillRatio(経過, fillMs))` にして 0→満タンのフィル演出にする

### 8. タッチ UI 押下フィードバック

- `registryKeys.ts` に `HUD.shootHeld` / `HUD.jumpHeld` を追加
- GameScene が `inputState.shootHeld` / `jumpHeld` を毎フレーム registry へ publish(既存 `publishMovePad` と同様)
- `TouchControls.render` に押下状態を渡し、押下中のボタンは塗りアルファ増加+半径拡大(`EFFECTS.touch`)で「押している」ことを指の外周でも視認できるようにする

### 9. 難易度カーブ(`balance.ts` 拡張)

- `STAGE_TUNING: Record<string, StageTuning>` と `getStageTuning(stageId)`(未知 ID は中立値へフォールバック)を追加
  - `StageTuning = { walkerSpeedFactor, turretIntervalFactor }`
  - stage1: 中立(全て 1.0)/ stage2: walker 速度up・turret 発射間隔短縮(具体値は実装時にテストプレイで決定)
- `SpawnSystem.loadStage` で tuning を保持し、`spawnEnemy` で `Enemy` ヘ渡す。`Enemy` は係数を速度・発射間隔に適用
- ロジックへのマジックナンバー埋め込みなし(係数はすべて balance.ts)

## データフロー

### 敵撃破 → 爆発演出
```
1. CombatSystem が弾⇔敵の overlap で HP 0 を検知
2. onEnemyDefeated(enemy) → GameScene が EffectsManager.explodeSmall(enemy.x, enemy.y) + SE
3. EffectsManager がパーティクル爆発を生成し、寿命後に自動破棄
```

### ボス撃破 → 撃破シーケンス → クリア遷移
```
1. onBossDefeated(boss) → GameScene.handleClear が ended=true・BGM停止・撃破SE
2. EffectsManager.bossDeathSequence(boss.x, boss.y, onComplete)
   - ヒットストップ → 連続爆発(N回・間隔ms) + 大シェイク
3. onComplete → transitionTo(clear) でフェードアウトして ClearScene へ
```

## エラーハンドリング戦略

- 演出は失敗してもプレイ継続を阻害しない(ガイドライン準拠)。パーティクル生成失敗等は握り潰さず通常の例外フローに任せるが、ヒットストップの resume は `delayedCall` 一本化+シーン SHUTDOWN フックで「物理が止まったまま」になる事態を防ぐ
- フェード遷移は `isFading` ガードで多重 `scene.start` を防止

## テスト戦略

### ユニットテスト(新規)
- `tests/unit/systems/hudFx.test.ts`: `entranceFillRatio` 境界(0/中間単調増加/上限1)、`damageFlashActive` 窓境界、`flashBlinkOn` 位相
- `tests/unit/config/stageTuning.test.ts`: stage1 は中立値、stage2 は stage1 より厳しい(speedFactor>1, intervalFactor<1)、未知 stageId は中立へフォールバック

### 統合テスト(既存の維持)
- `damage-flow.test.ts` 等が `onHit` シグネチャ拡張の影響を受ける場合は呼び出し側を追従修正(検証内容は維持)

### E2E(既存の維持)
- フェード追加・ボス撃破シーケンスで遷移タイミングが約 1.5〜2 秒延びる。`full-playthrough` 等のタイムアウトに収まるか確認し、必要なら待機条件を調整

## 依存ライブラリ

追加なし(Phaser 3.80 同梱機能のみ使用)。

## ディレクトリ構造

```
src/
  config/
    effects.ts        # 新規: 演出チューニング値
    balance.ts        # 変更: STAGE_TUNING 追加
    assetKeys.ts      # 変更: TEX.spark 追加
    registryKeys.ts   # 変更: HUD.shootHeld / jumpHeld 追加
  systems/
    EffectsManager.ts # 新規: 演出統括 System
    sceneTransition.ts# 新規: フェード遷移ヘルパ
    hudFx.ts          # 新規: HUD 演出の純粋関数
    CombatSystem.ts   # 変更: onHit に shotKind
    SpawnSystem.ts    # 変更: StageTuning 伝搬
  entities/
    CharacterRig.ts   # 変更: 被弾白フラッシュ
    Enemy.ts          # 変更: tuning 適用
  scenes/
    PreloadScene.ts   # 変更: spark テクスチャ生成
    GameScene.ts      # 変更: EffectsManager 接続・遷移フェード・押下 publish
    TitleScene.ts / ClearScene.ts / GameOverScene.ts # 変更: フェード遷移
  ui/
    LifeBar.ts        # 変更: 被ダメフラッシュ
    BossHpBar.ts      # 変更: 出現フィル演出
    TouchControls.ts  # 変更: 押下フィードバック
tests/
  unit/systems/hudFx.test.ts      # 新規
  unit/config/stageTuning.test.ts # 新規
```

## 実装の順序

1. 基盤: effects.ts / hudFx.ts(+テスト)/ spark テクスチャ
2. 戦闘演出: EffectsManager / CharacterRig フラッシュ / CombatSystem 拡張 / GameScene 配線(敵爆発・被ダメシェイク+赤フラッシュ・チャージヒットストップ・ボス撃破シーケンス)
3. シーン遷移フェード + HUD 演出(LifeBar / BossHpBar)
4. タッチ UI 押下フィードバック
5. 難易度カーブ(STAGE_TUNING)+テスト
6. 品質チェック(test / lint / typecheck / build)

## セキュリティ考慮事項

- 外部通信・外部アセットなし(テクスチャは手続き生成)。ハードコーディング対象(URL/キー)も発生しない

## パフォーマンス考慮事項

- パーティクルは単発 `explode` + 使い捨て emitter。寿命後に必ず destroy しメモリ増加を防ぐ
- `update` 内での毎フレーム生成はしない(爆発はイベント駆動)
- ヒットストップは物理 pause のみで、レンダリングは止めない(60fps 維持)

## 将来の拡張性

- `EffectsManager` に演出を集約したため、武器追加・新ボス時も同じ API(`explodeSmall` 等)を呼ぶだけで済む
- `STAGE_TUNING` は stage3 以降の追加時にエントリを足すだけで難易度カーブを延長できる
