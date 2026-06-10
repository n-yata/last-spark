# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: パーツテクスチャ生成

- [x] `src/config/assetKeys.ts` に PART テクスチャキー群を追加
  - [x] player / walker / turret / boss 各系統の head/torso/arm/leg 等のキー
- [x] `src/scenes/PreloadScene.ts` でパーツテクスチャを Graphics 生成
  - [x] 系統別のネオン配色でパーツを描画するヘルパを追加（`makePart` 形状別描画）
  - [x] 既存 `generateTextures` から各系統のパーツ生成を呼ぶ（`allRigParts()` 走査）

## フェーズ2: リグ構成とアニメ計算

- [x] `src/config/characterRig.ts`（新規）に系統別リグ構成を定義
  - [x] balance の width/height からパーツ配置を比率で算出
  - [x] player=ヘルメット頭+片腕アームキャノン, walker=二足, turret=脚なし砲台, boss=重量級
- [x] `src/systems/rigAnimation.ts`（新規）に純粋関数 + `MotionState` 型を実装
  - [x] `MotionState` 型定義
  - [x] `walkPhase` / `legSwing` / `squashStretch` / `armRecoil` / `hitLean`
- [x] `tests/unit/systems/rigAnimation.test.ts`（新規）でユニットテスト
  - [x] 各関数の符号・境界・周期を検証（Red→Green、14 ケース）

## フェーズ3: 見た目リグの実装

- [x] `src/entities/CharacterRig.ts`（新規）を実装
  - [x] `characterRig` 定義からパーツ Image を生成し Container に組み立て
  - [x] `syncTo(x,y,visible,facing)`（位置・深度・可視・facing 同期）
  - [x] `setMotionState(state)` / `triggerAttack` / `triggerHit`（一過性タイマ開始）
  - [x] `update(time, vy)`（rigAnimation でパーツ変位を反映）
  - [x] `setTint/clearTint` `setAlpha`（子パーツ/Container へ適用）
  - [x] `destroy()`（リグ破棄でリーク防止）

## フェーズ4: エンティティ結線

- [x] `src/entities/Player.ts` を結線
  - [x] コンストラクタでリグ生成＆自スプライト非表示
  - [x] MotionState 導出（接地/速度/ジャンプ/発射/無敵）
  - [x] `setFlipX`→rig facing、`updateBlink`→rig.setAlpha、被弾→triggerHit、発射→triggerAttack
- [x] `src/entities/Enemy.ts` を結線
  - [x] walker=walk＋向き同期、turret=idle＋常時照準＋発射時 attack
  - [x] `disableBody` 時にリグ非表示、`destroy` でリグ破棄
- [x] `src/entities/Boss.ts` を結線
  - [x] `currentAction`→MotionState マップ（stagger/jump/fall/walk/idle）
  - [x] stagger ティントを rig.setTint に置換、`setFlipX`→rig facing、発射→triggerAttack

## フェーズ5: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`（12 ファイル / 123 ケース 全 green）
- [x] リントエラーがないことを確認
  - [x] `npm run lint`（エラーなし）
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`（エラーなし）
- [x] ビルドが成功することを確認
  - [x] `npm run build`（成功。チャンクサイズ警告は既存 Phaser バンドル由来）

## フェーズ6: ドキュメント更新

- [x] 永続ドキュメント（docs/）への影響を判断し、必要なら更新
  - [x] `docs/architecture.md` の Entity レイヤーに「見た目リグの分離」補足を追記
- [x] 実装後の振り返り（このファイル下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-10

### 計画と実績の差分

**計画と異なった点**:
- `MotionState` から `attack` を独立した状態として持つ計画だったが、発射/被弾は
  「状態」ではなく一過性イベントとして扱う方が自然だったため、`triggerAttack` /
  `triggerHit`（時限タイマ）と基本状態（idle/walk/jump/fall/stagger/dead）を分離した。
- `CharacterRig` に当初 `scene` を保持する設計だったが未使用となり削除（lint/型で検出）。
- リグの facing は Container の `scaleX` 符号で表現し、既存 `setFlipX` は全廃した
  （自スプライトは非表示なので flipX は無意味になるため）。

**新たに必要になったタスク**:
- turret の「常時プレイヤー照準」: 発射時だけでなく毎フレーム砲身が向くよう
  `turretDir` を更新する処理を追加（静止待機でも生命感を出すため）。
- 各エンティティに `destroy()` override を追加してリグ破棄を連動（リーク防止）。

### 学んだこと

**技術的な学び**:
- 物理(Arcade.Sprite)と見た目(Container リグ)を分離する最小侵襲アプローチにより、
  既存の移動・衝突・AI ロジックとテスト 123 ケースを一切壊さず見た目だけ刷新できた。
- アニメ計算を Phaser 非依存の純粋関数に切り出すと、符号・境界・周期をユニットテスト
  で担保でき、描画の調整と検証を分離できる（rigAnimation 14 ケース）。
- パーツ構成を `config/characterRig.ts` に単一集約し、PreloadScene の生成と
  CharacterRig の組み立ての双方が同一定義を参照することで齟齬を防げた。

### 次回への改善提案
- 目視確認（`npm run dev`）が未実施。手続きアニメはパラメータ調整が要るため、
  実機での歩行/ジャンプ/攻撃/被弾の見え方チェックを次セッションで行う。
- パーツ寸法/オフセットはマジックナンバーが多い。将来は balance の width/height から
  比率で自動算出する補助関数を入れると、寸法変更への追従が楽になる。
