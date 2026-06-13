# 設計: stage3 WardenBoss とミサイル攻撃

## アプローチ

FlyingBoss が `Boss` を継承して飛行固有アクション(dive/hover)を足したのと同じ
パターンで、stage3 専用の `WardenBoss` を新設し、固有アクション `missile` を足す。
共通の被ダメ/けぞり/フェーズ/撃破/アリーナ拘束は基底 `Boss` を再利用する。

## ミサイルの仕様(放物線アーティラリー)

- ミサイルは重力(STAGE.gravityY)を受ける放物線弾。発射時に「上向き初速 + 水平速度」を
  与え、プレイヤー周辺の地面に着弾するよう水平速度を逆算する。
- 純粋関数 `computeLobVelocity(startX, startY, targetX, landY, launchSpeed, gravity)` を
  `systems/shot.ts` に追加(Phaser 非依存・テスト可能)。落下到達時刻 T を解の公式で求め、
  `vx = (targetX - startX) / T`、`vy = -launchSpeed` を返す。
- phase ごとに本数を変える(phase1: 2 発 / phase2: 3 発)。着弾点はプレイヤー X を中心に
  `missileSpread` 間隔で左右へ散らし、移動を強制する。

## 変更点

### 型
- `types/combat.ts`: `ProjectileKind` に `'missile'` を追加。
- `types/boss.ts`: `BossAction` に `'missile'`、`BossKind` に `'warden'` を追加。

### 設定(config/balance.ts)
- `SHOT` にミサイルの物理値(missileDamage / missileSize / missileLaunchSpeed)を追加。
- `WardenBossConfig`(BossConfig 継承)を新設し、`missileCountP1 / missileCountP2 /
  missileSpread` を追加。`CONTAINMENT_WARDEN` をこの型にし、missile の actionDurationMs と
  ミサイル本数・散布を定義。

### 弾(entities/Projectile.ts, systems/shot.ts)
- `createProjectileSpec` に `'missile'` 分岐を追加。
- `Projectile.fire` に任意の `{ velocityY, gravity }` を受ける拡張を加え、放物線を可能にする。
  ミサイルは専用テクスチャを使う。`preUpdate` で地面到達時に回収する。

### AI(systems/bossAi.ts)
- `WARDEN_WEIGHTS` と `pickNextWardenBossAction` / `allowedWardenActions` を追加。
  missile を両フェーズで出し、phase2 で増量。

### エンティティ(entities/WardenBoss.ts 新規)
- `Boss` を継承。`beginNextAction` で warden 用ピッカーを使い、`missile` 開始時に
  `fireMissiles` を呼ぶ。

### テクスチャ(config/assetKeys.ts, scenes/PreloadScene.ts)
- `TEX.projectileMissile` を追加し、ロケット風の専用テクスチャを生成。

### ステージ/シーン
- `config/stage1.ts` の STAGE3 を `bossKind: 'warden'` に変更。
- `scenes/GameScene.ts` の `spawnBoss` で warden 系統を出し分け。

## テスト
- `wardenBossAi.test.ts`: missile が warden 重みに含まれ、接地/飛行には混入しない。
  phase2 で missile 増加。許可アクション整合。
- `shot.test.ts`: `computeLobVelocity` が着弾点(targetX, landY)に到達する。
- `wardenBoss.test.ts`: stage3 が warden 系統、CONTAINMENT_WARDEN のミサイル設定、
  ミサイル spec の妥当性。
</content>
</invoke>
