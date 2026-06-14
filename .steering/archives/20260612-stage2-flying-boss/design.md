# 設計書

## アーキテクチャ概要

stage2 専用の飛行/浮遊型ボスを、既存の接地ボス(`Boss`)を**継承**して実装する。
共有ロジック(被ダメージ・けぞり・撃破・フェーズ判定・アリーナ拘束・リグ同期・破棄)は
`Boss` に集約済みのため、`Boss` を**コンフィグ駆動**へ小さくリファクタし、
`FlyingBoss extends Boss` が移動・行動だけを差し替える。これにより:

- stage1 接地ボスは「デフォルト引数」で従来と完全に同一挙動(リグレッションなし)。
- `CombatSystem.registerBoss(boss: Boss)` / `GameScene.boss?: Boss` の型をそのまま流用できる
  (`FlyingBoss` は `Boss` のサブタイプ)。
- 行動抽選(`bossAi.ts`)は純粋ロジックを汎用化し、飛行用の重みテーブルを追加する
  (既存テストは無改変で通る)。

```
GameScene.spawnBoss()
  ├─ stage.bossKind==='flying' → new FlyingBoss(...)   (重力なし・地面コライダなし)
  └─ それ以外               → new Boss(...)           (重力あり・地面コライダあり)
        ↓ 両者とも
  setProjectiles / setArenaBounds / combat.registerBoss(boss)

FlyingBoss extends Boss
  - 重力 OFF、リグ系統 'bossFlying'、コンフィグ FLYING_BOSS
  - 行動: hover(その場で上下バブ) / move(高度を保って左右) / shoot / dive(急降下) / stagger
  - 高度維持(hover target を velocityY で追従) + 上下クランプ
```

## コンポーネント設計

### 1. 型・設定の拡張

**責務**: 飛行ボスの行動種別・系統・チューニング値を定義する。

- `src/types/boss.ts`:
  - `BossAction` に `'dive' | 'hover'` を追加(接地は従来どおり jump 等を使用)。
  - `BossKind = 'ground' | 'flying'` を追加。
- `src/config/balance.ts`:
  - `BossConfig` インターフェースを定義(共通必須フィールド + 任意の `jumpVelocity?`)。
  - 既存 `BOSS` は `BossConfig` を満たす接地設定として維持。
  - `FLYING_BOSS` を追加(maxHp=24 で同等、bulletSpeed/moveSpeed をやや強化、
    飛行固有: `hoverAltitude / hoverAmplitude / hoverPeriodMs / diveSpeed / diveBottomMargin`、
    `actionDurationMs` は hover/move/shoot/dive/stagger)。
  - `actionDurationMs` は `Partial<Record<BossAction, number>>` 型にする。

### 2. 行動抽選の汎用化(`src/systems/bossAi.ts`)

**責務**: フェーズ別・系統別の重み付き抽選を提供する純粋ロジック。

- 既存 `weightedRandom` / `pickNextBossAction(phase,last,rng)` は**シグネチャ維持**
  (接地の `GROUND_WEIGHTS` を使用 = 既存テストそのまま通過)。
- 内部に汎用 `pickWeightedAction<A>(table, last, rng)` を切り出して再利用。
- 追加: `FLYING_WEIGHTS`、`pickNextFlyingBossAction(phase,last,rng)`、`allowedFlyingActions(phase)`。
- 追加: `bossActionDuration(map, action, fallback)`(欠損キーは fallback を返す純粋関数)。

**実装の要点**:
- `dive` は phase1/phase2 双方で出現、phase2 で重みを増やし攻勢を強める。
- 接地側に `dive/hover` が混入しないことをテストで保証。

### 3. `Boss` のコンフィグ駆動リファクタ(`src/entities/Boss.ts`)

**責務**: 接地ボスの挙動を維持しつつ、サブクラスが移動・行動・見た目を差し替えられるようにする。

**実装の要点**:
- コンストラクタに任意の `options?: { config?: BossConfig; rigFamily?: RigFamily; gravity?: boolean }`。
  既定は `BOSS / 'boss' / true`(=従来挙動)。
- インスタンス可変値の参照を `BOSS.*` → `this.cfg.*` に置換(maxHp/contactDamage/width/height/
  moveSpeed/jumpVelocity/bulletSpeed/staggerDamageThreshold/actionDurationMs/phase2SpeedFactor)。
- サブクラスが上書きする以下を `private` → `protected` に緩める:
  `beginNextAction / executeAction / updateRig / fireVolley / startJump / chooseMoveDir /
  clampToArena / onGround` と、関連フィールド(phase/currentAction/lastAction/actionEndsAt/
  paceDir/targetY/projectiles/arenaMinX/arenaMaxX/rig/isAlive)。
- 行動継続時間取得を `bossActionDuration(this.cfg.actionDurationMs, next, fallback)` に変更。

### 4. `FlyingBoss`(`src/entities/FlyingBoss.ts`)

**責務**: 浮遊・急降下・空中射撃を実装する。

**実装の要点**:
- `super(scene,x,y,{ config: FLYING_BOSS, rigFamily:'bossFlying', gravity:false })`。
- `setHoverBounds()` 相当の上下可動域を保持(基準高度・バブ振幅・dive 最下点)。
- `update()` を上書き: フェーズ更新 → targetY 更新 → アクション更新 → 高度追従 + 上下クランプ →
  左右アリーナクランプ → リグ同期。
- `beginNextAction()` を上書き: `pickNextFlyingBossAction` で抽選、dive 開始時に降下方向を決める。
- `executeAction()` を上書き: hover/move は基準高度へ追従、dive は player へ向け降下、
  shoot は水平発射(targetY 狙い)、stagger は停止。
- dive 終了後は次アクションの高度追従で自然に上昇復帰する(専用の復帰状態は持たない)。
- `updateRig()` を上書き: 接地概念がないため idle 基調、dive 中は fall 姿勢、stagger は被弾色。

### 5. 見た目リグ `bossFlying`(`characterRig.ts` / `assetKeys.ts`)

**責務**: 接地ボス(赤・脚あり)と視覚的に明確に区別する空中ドローン。

**実装の要点**:
- `PALETTE.bossFlying`(寒色: シアン主 × バイオレット副)を追加。
- 脚なし: 本体(roundedBox)+ センサー頭 + 左右ウィング(roundedBox)+ 下部キャノン(cannon)。
- **新しい `PartShape` は追加しない**(既存形状を流用 → `PreloadScene` は無改変で自動生成)。
- `swingRad:0 / walkCycleMs:0`(歩行スイングなし、shoot 時のみキャノンがリコイル)。
- `RIGS` / `RIG_BODY_SIZE` / `PART.bossFlying` に登録。`RigFamily` 型に自動追加される。

### 6. ステージ統合(`stage1.ts` / `GameScene.ts`)

**責務**: stage2 で飛行ボスを出し分ける。

**実装の要点**:
- `StageData` に `bossKind?: BossKind` を追加。stage2 を `'flying'`、stage1 は未指定(=ground)。
- stage2 の `bossSpawn.y` を空中(基準高度)へ変更。
- `GameScene.spawnBoss()` を分岐: flying は地面コライダを付けず(浮遊)、高度域を設定。
  HUD の `bossMaxHp` は `this.boss.maxHp` を使用(設定値非依存にする)。

## データフロー

### stage2 ボス戦
```
1. プレイヤーがボストリガ X を超える → SpawnSystem が onBossTrigger 発火
2. GameScene.spawnBoss(): stage.bossKind==='flying' → FlyingBoss 生成(重力なし)
3. FlyingBoss.update(): hover/move/shoot/dive を抽選し空中で行動、dive で接近・射撃で圧
4. プレイヤー弾の overlap → CombatSystem.hitDamageable → takeDamage(継承) → HP 減・けぞり
5. HP0 → onBossDefeated → handleClear(最終ステージ=タイトルへ)
```

## エラーハンドリング戦略

- 新規の例外クラスは不要。`projectiles` 未設定時は `fireVolley` が早期 return(既存踏襲)。
- `bossActionDuration` は欠損キーで fallback を返し、未定義時間によるクラッシュを防ぐ。

## テスト戦略

### ユニットテスト
- `bossAi`: 飛行重みに dive/hover を含む / 接地に dive/hover が混入しない /
  dive は phase2 でより出やすい / `allowedFlyingActions` 整合 / 連続抑制が飛行でも効く。
- `bossActionDuration`: マップ値の取得と欠損時 fallback。
- 飛行ボスの**当てやすさ回帰**: dive 最下点でボスの上下範囲が地上プレイヤーのショット高さを含む
  (既存 `bossHittable.test` と同思想)。
- `FLYING_BOSS` 設定の整合(高度・振幅・dive 最下点が地面より上で妥当)。

### 統合/E2E
- 既存 `full-playthrough` が stage1→stage2→ボス撃破まで通ること(stage2 が飛行ボスでも撃破可能)。

## 依存ライブラリ

新規追加なし。

## ディレクトリ構造

```
src/
  types/boss.ts            # 変更: BossAction 拡張 + BossKind
  config/balance.ts        # 変更: BossConfig + FLYING_BOSS
  config/assetKeys.ts      # 変更: PART.bossFlying
  config/characterRig.ts   # 変更: bossFlying リグ + PALETTE + RIG_BODY_SIZE
  config/stage1.ts         # 変更: StageData.bossKind, stage2 を flying・空中 spawn
  systems/bossAi.ts        # 変更: 汎用化 + 飛行重み + bossActionDuration
  entities/Boss.ts         # 変更: コンフィグ駆動・protected 化
  entities/FlyingBoss.ts   # 新規: 飛行ボス
  scenes/GameScene.ts      # 変更: spawnBoss 分岐
tests/unit/systems/
  flyingBossAi.test.ts     # 新規
  flyingBossHittable.test.ts # 新規(or 既存 bossHittable に追記)
```

## 実装の順序

1. 型・設定(types/boss, balance)
2. bossAi 汎用化 + 飛行重み + duration ヘルパ
3. リグ(assetKeys, characterRig)
4. Boss コンフィグ駆動リファクタ
5. FlyingBoss 実装
6. ステージ統合(stage1.ts, GameScene)
7. テスト(ユニット) + 既存テスト確認

## セキュリティ考慮事項

- 外部入力なし・URL/シークレットのハードコードなし。チューニング値は `balance.ts` に集約。

## パフォーマンス考慮事項

- 飛行ボスは弾プール(既存 `enemyShots`)を流用。新規の常時生成オブジェクトは増やさない。
- 高度追従は velocity の単純追従で、毎フレームの重い計算を避ける。

## 将来の拡張性

- `BossKind` と `bossAi` の系統別テーブルにより、第3のボス種別も同パターンで追加可能。
- `Boss` のコンフィグ駆動化で、ステージごとのボス強度差し替えが容易になる。
