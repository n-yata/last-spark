# 設計書

## アーキテクチャ概要

`docs/architecture.md` のレイヤードアーキテクチャ(クライアント内)に従う。依存方向は Scene → System → Entity → (config/types)、および Scene → Persistence の一方向。

```
scenes/   (Boot/Preload/Title/Game/UI/GameOver/Clear/Orientation)
   ↓
systems/  (InputController/CombatSystem/SpawnSystem/bossAi/shot)
   ↓
entities/ (Player/Enemy/Boss/Projectile)
   ↓
config/ , types/   ← 最下位・共有
scenes/ → persistence/ (SaveManager → localStorage)
```

## 主要な設計判断(MVP固有)

1. **アセットはコード生成テクスチャで成立させる**: 本番スプライト/タイルセットは未用意のため、`PreloadScene` で Phaser `Graphics.generateTexture()` により矩形/発光風プレースホルダを生成する。世界観(暗め基調+発光アクセント)は配色で表現。将来アトラスに差し替え可能な命名(テクスチャキー定数)にする。
2. **ステージは Tiled JSON ではなくコード定義のステージデータで構成**: MVP は1ステージのため、`src/config/stage1.ts` に足場矩形・敵配置・ボストリガX座標を定義し `SpawnSystem` が読む。`stageId` で読む構造を保ち、後で Tiled ローダに差し替え可能。
3. **純粋ロジックを Phaser 非依存に切り出す**: `bossAi.ts`(`pickNextBossAction`/`weightedRandom`)、`shot.ts`(`isChargedShot`)、`SaveManager` の検証関数群はユニットテスト可能にする。

## コンポーネント設計

### config/(最下位)
**責務**: チューニング値・キー定数の集中管理。マジックナンバー排除。
- `balance.ts`: `PLAYER` / `SHOT` / `BOSS` / `ENEMY` パラメータ。
- `gameConfig.ts`: `Phaser.Types.Core.GameConfig`(解像度/Scale FIT/Arcade物理/重力)。
- `sceneKeys.ts`: シーンキー定数。
- `storageKeys.ts`: `lastspark:save`。
- `assetKeys.ts`: 生成テクスチャ/アニメのキー定数。
- `stage1.ts`: ステージ1の足場・敵配置・ボストリガ。

### types/(最下位)
- `save.ts`: `SaveData` / `GameSettings`。
- `input.ts`: `InputState`。
- `combat.ts`: `Damageable` インターフェース、`ProjectileKind`。
- `boss.ts`: `BossPhase` / `BossAction`。
- `enemy.ts`: `EnemyPattern`。

### persistence/SaveManager
**責務**: `load()`(失敗時 throw せず既定値)、`save()`(不可時 no-op+warn)、`markCleared(timeMs)`、`updateSettings()`。型/version 検証は純粋関数 `isValidSaveData` に分離。

### systems/
- `bossAi.ts`: `pickNextBossAction(phase,last,rng?)`、`weightedRandom(entries,rng?)`。`rng` 注入でテスト決定化。
- `shot.ts`: `isChargedShot(elapsedMs)`、`createProjectileSpec(kind)`。
- `InputController`: Pointer(左ゾーン/右仮想ボタン)+ Keyboard フォールバックを `InputState` に正規化。マルチタッチはポインタID追跡。
- `CombatSystem`: collider 登録(弾⇔敵/ボス、player⇔敵/ボス/敵弾)、`applyDamage`、無敵時間。Scene へはコールバックで通知(逆依存禁止)。
- `SpawnSystem`: `loadStage(stageId)`、`update(cameraX)`(進行に応じ出現)、`onBossTrigger(cb)`。

### entities/(Arcade.Sprite 継承)
- `Player`: `applyInput`/`takeDamage`/`startCharge`/`releaseShot`、点滅無敵。
- `Enemy`: `walker`/`turret` パターン。
- `Boss`: `update(time,playerX)` でフェーズ/アクション遷移(`bossAi` を利用)、`takeDamage`。
- `Projectile`: プールで再利用(`normal`/`charged`)。

### ui/(UIScene から状態を受けて描画)
- `LifeBar` / `BossHpBar` / `ChargeGauge` / `TouchControls`。

### scenes/
Boot→Preload→Title→Game(+UI 並行)→Clear/GameOver。`OrientationScene` は縦持ち検知でオーバーレイ。

## データフロー

### チャージショット(UC-1)
```
1. 右ショットボタン押下 → InputState.shootHeld=true → Player.startCharge()
2. 押下中 UIScene.ChargeGauge 更新、しきい値で発光
3. 離す → shootReleased=true → isChargedShot(elapsed) で kind 決定 → Projectile 発射
4. cooldownMs 未満なら発射しない
```

### ボス戦突入〜撃破(UC-2)
```
1. GameScene が SpawnSystem.update(cameraX) → onBossTrigger 発火
2. Boss 出現 + BossHpBar 表示
3. Boss.update でフェーズ/アクション抽選、CombatSystem が被弾処理
4. HP0 → SaveManager.markCleared(timeMs) → ClearScene
```

## エラーハンドリング戦略

- localStorage 不可/破損: `SaveManager` が既定値フォールバック、`save` は no-op+warn。throw しない。
- 縦持ち: `OrientationScene` を最前面、ゲーム一時停止。横向き復帰で再開。
- 想定外例外: 当該シーンを停止しタイトル復帰(内部情報を露出しない)。
- サウンド自動再生ブロック: 初回ポインタで解放するまで無音。

## テスト戦略

### ユニットテスト(Vitest, Phaser 非依存)
- `bossAi`: phase1 で charge を選ばない、直前同一アクションの連続抑制(rng 注入で決定化)。
- `shot.isChargedShot`: しきい値境界(未満=false、ちょうど=true)。
- `SaveManager`/`isValidSaveData`: 既定値、version 不一致フォールバック、localStorage 例外時 throw しない。
- ダメージ/無敵: 無敵中は重複ダメージを受けない(無敵判定純粋関数)。

### 統合テスト(Vitest)
- 入力→Player 移動/発射の反映(`InputState` 経由)。
- 弾⇔敵/ボスの衝突で HP 減少→撃破/ゲームオーバー遷移(Phaser 依存は最小モック)。

### E2Eテスト(Playwright)
- タイトル→スタート→ボス撃破→クリア→タイトル。
- 縦持ち案内表示。リロード後のクリア状況保持。

## 依存ライブラリ

```json
{
  "dependencies": { "phaser": "^3.80.0" },
  "devDependencies": {
    "vite": "^5.4.0",
    "vite-plugin-pwa": "^0.20.0",
    "typescript": "~5.6.0",
    "vitest": "^2.1.0",
    "@playwright/test": "^1.47.0",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "prettier": "^3.3.0",
    "eslint-config-prettier": "^9.1.0",
    "jsdom": "^25.0.0"
  }
}
```
※ 実際のバージョンはインストール時に解決(`^`/`~` 方針は development-guidelines に準拠)。

## ディレクトリ構造(新規作成)

`docs/repository-structure.md` の構造に従う。ルートに設定ファイル群、`src/{scenes,entities,systems,persistence,config,ui,types}`、`tests/{unit,integration,e2e}`、`public/{icons,assets}`、`index.html`、`CREDITS.md`、`README.md`。

## 実装の順序

1. プロジェクト基盤(設定ファイル群 + 最小 main.ts で起動確認)
2. config / types(最下位)
3. persistence(SaveManager)+ ユニットテスト
4. systems の純粋ロジック(bossAi / shot)+ ユニットテスト
5. entities(Player/Projectile/Enemy/Boss)
6. systems のクラス(InputController/CombatSystem/SpawnSystem)
7. ui(HUD/TouchControls)
8. scenes(Boot→…→Clear/Orientation)+ main.ts 完成
9. PWA(manifest/icons/vite-plugin-pwa)
10. 統合テスト / E2E
11. 品質チェック(test/lint/typecheck/build)
12. ドキュメント(README/CREDITS)・振り返り

## セキュリティ考慮事項

- 外部通信なし。URL/キーをソース・ドキュメントに持たない。
- localStorage 読込値は型/version/値域検証し不正値は既定へ。
- 第三者IP(キャラ/名称/音楽)を使わない。生成図形のみで成立させる。

## パフォーマンス考慮事項

- 弾/エフェクトはオブジェクトプール再利用。`update` 内で new しない。
- 物理は Arcade のみ。画面外の敵は更新抑制。

## 将来の拡張性

- ステージ: `stage1.ts` を Tiled ローダに差し替え可能な `stageId` 経由構造。
- 武器交換: `Projectile.kind` を列挙拡張可能に。
- オンライン: `SaveManager` をインターフェース化し背後をサーバ同期に差し替え可能。
