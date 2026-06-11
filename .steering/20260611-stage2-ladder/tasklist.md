# タスクリスト

対象: 新ステージ stage2 + 梯子ギミック + すり抜け床
要求: `requirements.md` / 設計: `design.md`

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

- 全てのタスクを `[x]` にする / 未完了 `[ ]` を残して終了しない
- スキップは技術的理由のみ（理由明記）
- タスクが大きすぎる場合はサブタスクに分割する

---

## フェーズ1: 純粋ロジック + ユニットテスト

- [x] すり抜け床の純粋関数を `playerMovement.ts` に追加
  - [x] `shouldLandOnOneWay(playerBottom, playerVelY, platformTop, tolerance)` 実装
  - [x] ユニットテスト（上昇=false / 下降かつ足が床上=true / 床下=false / 境界値）
- [x] 梯子の純粋関数を `playerMovement.ts` に追加
  - [x] `overlapsAnyLadder(playerRect, ladders)` 実装（`boxesOverlap` も追加）
  - [x] `resolveLadderState(prev, overlapping, climbDir, onGround, jumpPressed)` 実装
  - [x] `climbVelocity(climbDir, speed)` 実装
  - [x] ユニットテスト（把持/離脱の各条件・速度符号）
- [x] 上下入力の純粋関数を `touchLayout.ts` に追加
  - [x] `CLIMB_DEADZONE_PX` と `climbDirFromDelta(deltaY)` 実装
  - [x] ユニットテスト（deadzone内=0 / 上=-1 / 下=1 / 境界値）

## フェーズ2: 入力（上下方向の取り込み）

- [x] `types/input.ts` の `InputState` に `climbDir: -1|0|1` を追加（コメント付き）
- [x] `InputController` を Y 成分対応に
  - [x] `onPointerMove` で原点からの Y デルタを保持
  - [x] `update()` で `climbDir` を算出して返す
  - [x] キーボード UP/DOWN を合成
  - [x] `update()` の戻り値に `climbDir` を含める（全 return 経路）

## フェーズ3: ステージデータ + 梯子テクスチャ

- [x] `stage1.ts` に `LadderRect` 型と `StageData.ladders?` / `nextStageId?` を追加
- [x] `stage1` に `nextStageId: 'stage2'` を設定
- [x] `STAGE2` を新規定義（地形・梯子・敵配置・ボス出現、梯子必須の奈落またぎ橋を配置）
- [x] `STAGES` に `stage2` を登録
- [x] `balance.ts` に梯子関連定数（`LADDER.climbSpeed`）を追加
- [x] `assetKeys.ts` に `TEX.ladder` を追加
- [x] `PreloadScene` に梯子テクスチャ生成を追加（桟のある見た目）

## フェーズ4: プレイヤー + シーン統合

- [x] `rigAnimation.ts` の `MotionState` に `'climb'` を追加
- [x] `Player` に梯子状態を実装
  - [x] `onLadder` 状態と `setLadders()`/参照を追加
  - [x] `applyInput` を梯子分岐に対応（重力ON/OFF・vx0・climb速度）
  - [x] 解除時に `setAllowGravity(true)` を必ず戻す
  - [x] `updateRig` で `onLadder` 時に `'climb'` を選択
  - [x] `CharacterRig` の `'climb'` 表示対応（歩行スイングを流用・破綻なし）
- [x] `GameScene` の地形を ground/platform 2グループに分割
  - [x] `buildPlatforms` を分割し、platform をワンウェイ collider（processCallback）に
  - [x] 敵は ground+platform(ワンウェイ)、ボスは ground のみに変更（梯子中はプレイヤーの足場衝突を抑制）
- [x] `GameScene` に `buildLadders` を追加し、梯子矩形を Player に渡す
- [x] `GameScene` を複数ステージ対応に
  - [x] `STAGE_ID` 定数を廃し `init(data:{stageId?})` で受ける
  - [x] `SpawnSystem.loadStage` に同 stageId を渡す

## フェーズ5: ステージ遷移

- [x] `GameScene.handleClear` で `nextStageId` があれば ClearScene に渡す
- [x] `ClearScene` を中継モード対応に（nextStageId あり=CONTINUE→次stage / なし=最終→Title）
- [x] クリア記録 `markCleared` は最終ステージのみ実行に調整

## フェーズ6: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`（151 tests passed）
- [x] リントエラーがないことを確認
  - [x] `npm run lint`（エラーなし）
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`（エラーなし）
- [x] ビルドが成功することを確認
  - [x] `npm run build`（built in 3.92s。チャンクサイズ警告は Phaser 由来の既存事象）

## フェーズ7: ドキュメント更新

- [x] 影響する永続ドキュメント（functional-design 等）を必要に応じて更新
  - [x] `functional-design.md`: InputState に climbDir / InputController 責務 / 地形ギミック節 / 画面遷移図
  - [x] `glossary.md`: すり抜け床・梯子・複数ステージ・MotionState(climb)・InputState(climbDir)・画面遷移・索引
- [x] 実装後の振り返り（このファイル下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-11

### 計画と実績の差分

- **セッション引き継ぎ時の実態が計画と乖離**: 前セッションのサマリーでは Phase 1-2 が実装済みとされていたが、実ファイルを確認すると src には未反映で、テストに `climbDir: 0` の行だけが混入し型エラー状態だった。CLAUDE.md の「サマリーを信頼せず実ファイルを確認」原則に従い、Phase 1 から実装し直した。
- **敵のコライダ方針を design.md から変更**: design では「敵・ボスは ground のみ衝突」としていたが、stage1 には浮遊足場に乗る walker が存在するため、そのまま地面のみにすると挙動が壊れることが判明。**敵も足場(ワンウェイ)に上から乗れる**ようにし、**プレイヤーの梯子昇降中だけ足場衝突を抑制**する方式へ精緻化した（ボスのみ地面限定）。
- **梯子離脱時のジャンプ**: ジャンプで梯子から離脱した際に飛び降り感を出すため、ジャンプ初速を与える処理を追加（design では明記なし）。
- **stage2 を梯子必須の設計に**: 240px の奈落（ジャンプ飛距離≈165px では越えられない）を、梯子で橋へ登り→渡り→降りる動線にし、梯子を必須化した。梯子上端＝橋の上端に揃え、てっぺん乗り移りを保証。

### 学んだこと

- **ワンウェイ床＋梯子の相互作用**: 梯子で床を貫通して登り降りするには、昇降中に該当プレイヤーの足場 collider を `processCallback` 内で抑制する必要がある（`obj === player && player.isOnLadder` で false 返し）。これを忘れると橋の上で詰まる。
- **純粋関数への分離が高速な検証を可能にした**: すり抜け・梯子・上下入力のロジックを `playerMovement.ts` / `touchLayout.ts` の純粋関数にしたことで、Phaser を起動せずユニットテスト（計53→151件）で境界値まで検証でき、型チェック・テスト・lint・build を一気に通せた。
- **Windows + PowerShell 5.1 のフック**: （本作業と並行した防御フック実装での学び）BOM 無し UTF-8 の .ps1 は日本語が文字化けしてパースが壊れる。UTF-8 (BOM付き) で保存する必要がある。

### 次回への改善提案

- **実機での手触り確認が必要**: 梯子の把持/離脱しきい値（`CLIMB_DEADZONE_PX=28`）と昇降速度（`LADDER.climbSpeed=130`）、stage2 の奈落幅・橋の配置は、ブラウザ実機でプレイして微調整する余地がある（自動テストでは手触りまで検証できない）。
- **E2E の追加候補**: stage1→stage2→最終クリアの一連遷移、梯子を使わないと越えられない奈落の踏破を Playwright で回帰防止できると安心。
- **セッション引き継ぎ時は最初に実ファイル差分を git で確認**: サマリーと実態の乖離を早期に検知できると手戻りが減る。
