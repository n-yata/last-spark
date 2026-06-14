# 設計書

対象: 新ステージ stage2 追加 + 梯子(ladder)ギミック + すり抜け床(ワンウェイ床)
要求: `requirements.md`（/plan-feature で合意済み・尊重する）

## アーキテクチャ概要

既存の「純粋ロジック(Phaser非依存) + エンティティ/シーン(Phaser依存)」分離を踏襲する。
新しい挙動（すり抜け判定・梯子状態遷移）は `playerMovement.ts` に純粋関数として足し、
`Player` / `GameScene` はそれを呼ぶだけにしてユニットテスト可能性を保つ。

```
InputController ──climbDir(上下)──┐
                                  v
GameScene.update → Player.applyInput(input)
                       ├─ resolveLadderState(...)   [純粋] 梯子に入る/出る判定
                       ├─ climbVelocity(climbDir)   [純粋] 梯子中の鉛直速度
                       └─ 通常移動/ジャンプ(既存)
GameScene.buildPlatforms
   ├─ groundGroup   (従来collider: 全面衝突)
   └─ platformGroup (ワンウェイ: processCallback=shouldLandOnOneWay)
GameScene.buildLadders → ladderRects[](重なり判定用の矩形。物理衝突はさせない)
StageData{ ladders?, nextStageId? } → stage1 / stage2
GameScene.init({stageId}) → 複数ステージ起動。handleClear→次stage or ClearScene
```

## コンポーネント設計

### 1. すり抜け床（ワンウェイ床）

**責務**:
- 浮遊足場(platform)を下から通過・上から着地できる当たり判定にする
- 地面(ground)は従来どおり全面衝突を維持する

**実装の要点**:
- `GameScene.buildPlatforms()` を、地面用 `groundGroup` と足場用 `platformGroup` の
  2 グループ生成に分ける（判定は既存の `isGround = rect.height > 40`）。
- プレイヤー×`platformGroup` の collider に `processCallback` を渡し、
  純粋関数 `shouldLandOnOneWay(playerBottom, playerVelY, platformTop, tolerance)` が
  true の時だけ衝突を有効化する（下降中 かつ 足が床上端付近より上）。
- 敵・ボスは従来どおり `groundGroup` のみと衝突（足場すり抜けは敵に適用しない=暴発回避）。
  ※ 既存は単一 `platforms` だったため、敵/ボスのコライダ対象を `groundGroup` に変更する。
- `playerMovement.ts` に純粋関数を追加し、`Player` には依存させない（GameScene 内で完結）。

### 2. 梯子ギミック（上下移動）

**責務**:
- 梯子に重なって上下入力した時、重力を切って登り降りする
- 梯子から外れたら通常の重力挙動へ戻す

**実装の要点**:
- `StageData` に `ladders?: LadderRect[]`（x,y,width,height = 左上基準）を追加。
- `GameScene.buildLadders()` で梯子テクスチャを敷き（見た目）、矩形配列 `ladderRects` を保持。
  物理衝突はさせず、`Player.applyInput` に `ladderRects` を渡して重なり判定する。
- `Player` に梯子状態 `onLadder: boolean` を持つ。判定は純粋関数に委譲:
  - `overlapsAnyLadder(playerRect, ladders): boolean`
  - `resolveLadderState(prev, overlapping, climbDir, onGround, jumpPressed): boolean`
    把持: 梯子に重なり かつ climbDir≠0 で把持開始。
    離脱: 梯子から外れた / ジャンプ入力 / （把持中に地面に着き下入力）で解除。
  - `climbVelocity(climbDir, speed): number`（climbDir: -1=上,1=下 → 鉛直速度）
- 梯子把持中: `body.setAllowGravity(false)`、`setVelocityX(0)`、`setVelocityY(climbVelocity)`。
  解除時: `body.setAllowGravity(true)` を必ず戻す（戻し忘れ=浮遊バグ防止）。
- 梯子を登りきると上の足場に乗れる動線は「すり抜け床」と併用して自然成立
  （梯子で上昇→足場を下から抜けて頂部へ→把持解除で着地）。

### 3. 上下入力（移動パッドの Y 成分）

**責務**:
- 既存の追従パッドから上下方向の入力意図 `climbDir` を取り出す

**実装の要点**:
- `InputState` に `climbDir: -1 | 0 | 1` を追加（-1=上, 1=下、画面Y方向に一致）。
- `touchLayout.ts` に `CLIMB_DEADZONE_PX`（横より大きめ=誤反応抑制）と
  `climbDirFromDelta(deltaY)` を追加。
- `InputController.onPointerMove` で原点からの Y デルタを保持し、`update()` で
  `climbDir` を算出して返す。キーボードは UP/DOWN を追加で合成。
- 歩行中の縦ブレ誤反応は「梯子に重なっている時だけ Player 側で climbDir を使う」
  ことで実害を防ぐ（InputController は常に climbDir を出す）。

### 4. 新ステージ stage2 と遷移

**責務**:
- stage2 のステージデータを定義し、stage1 クリア後に進めるようにする

**実装の要点**:
- `stage1.ts`（ステージ定義の集約ファイル）に `STAGE2` を追加し `STAGES` に登録。
  stage2 は梯子で登る縦の攻略箇所を最低1つ持ち、終端で既存ボストリガーに突入。
- `StageData` に `nextStageId?: string` を追加。stage1 は `nextStageId: 'stage2'`。
- `GameScene` の `STAGE_ID` 定数を廃し、`init(data: { stageId?: string })` で受ける
  （未指定は 'stage1'）。`SpawnSystem.loadStage` にも同 stageId を渡す。
- `handleClear()`: `this.stage.nextStageId` があれば `ClearScene` に `nextStageId` を渡す。
- `ClearScene` を中継兼用に拡張: `nextStageId` ありなら「STAGE CLEAR / TAP TO CONTINUE」→
  `GameScene` を次 stageId で再起動。なしなら従来どおり最終クリア→タイトル。
  クリア記録 `markCleared` は最終ステージ到達時のみ行う。

### 5. リグの登りモーション

**責務**:
- 梯子を登り降り中であることが分かる表示にする

**実装の要点**:
- `rigAnimation.ts` の `MotionState` に `'climb'` を追加。
- `Player.updateRig` で `onLadder` 時は `'climb'` を選択。
- `CharacterRig` 側で `'climb'` を歩行位相の流用（脚を交互に動かす）で表現し、
  未対応モーションのフォールバックを確認（破綻しないこと）。

## データフロー

### 梯子を登る
```
1. 指を上へ動かす → InputController が climbDir=-1 を出力
2. Player.applyInput: overlapsAnyLadder=true かつ climbDir≠0 → onLadder=true
3. setAllowGravity(false), vx=0, vy=climbVelocity(-1)=上向き
4. 足場の下端をすり抜け(ワンウェイ)、頂部へ
5. 梯子矩形を抜ける/ジャンプ → onLadder=false, setAllowGravity(true) で着地
```

### すり抜け床に下から乗る
```
1. 足場の下からジャンプ(vy<0) → shouldLandOnOneWay=false → 衝突せず通過
2. 頂点を越え下降(vy>0)し足が床上端付近に達する → shouldLandOnOneWay=true → 着地
```

### ステージ遷移
```
1. stage1 ボス撃破 → handleClear → ClearScene({clearTimeMs, nextStageId:'stage2'})
2. ClearScene: 中継表示 → タップ → GameScene.start({stageId:'stage2'})
3. stage2 ボス撃破 → handleClear → nextStageId なし → ClearScene(最終) → Title
```

## エラーハンドリング戦略

- 新規例外クラスは不要（ゲームループ内の状態遷移のため）。
- 防御的処理: 梯子解除時の `setAllowGravity(true)` は必ず通る位置に置く。
  `ladders` / `nextStageId` は任意項目（`?`）で、未定義時は従来挙動にフォールバック。
- `getStageData` は未知 ID を stage1 にフォールバック（既存仕様を維持）。

## テスト戦略

### ユニットテスト（純粋関数中心・既存 playerMovement.test 等に倣う）
- `shouldLandOnOneWay`: 上昇中=false / 下降中かつ足が床上=true / 床下深く=false / 境界値
- `overlapsAnyLadder`: 重なりあり/なし/端境界
- `resolveLadderState`: 把持開始 / ジャンプ離脱 / 梯子外で離脱 / 地面+下入力で離脱
- `climbVelocity`: 上(-1)/下(1)/0 の符号と大きさ
- `climbDirFromDelta`: deadzone 内=0 / 上=-1 / 下=1 / 境界値

### 統合（手動・既存方針に準拠／自動E2Eは対象外）
- stage1 の足場に下から乗れる、地面は抜けない
- stage2 で梯子を登り降りでき、登り切って足場に乗れる
- stage1→stage2→クリアの一連の遷移

## 依存ライブラリ

新規追加なし（Phaser Arcade の範囲で実装）。

## ディレクトリ構造

```
src/
  types/input.ts            （climbDir 追加）
  config/
    touchLayout.ts          （climbDirFromDelta / CLIMB_DEADZONE_PX 追加）
    stage1.ts               （LadderRect / nextStageId / STAGE2 追加）
    balance.ts              （LADDER 速度等の定数追加）
    assetKeys.ts            （TEX.ladder 追加）
  systems/
    playerMovement.ts       （すり抜け・梯子の純粋関数追加）
    InputController.ts       （Y成分・UP/DOWN キー対応）
    rigAnimation.ts         （MotionState に 'climb'）
  entities/Player.ts        （梯子状態・applyInput 分岐・updateRig）
  scenes/
    PreloadScene.ts         （梯子テクスチャ生成）
    GameScene.ts            （ground/platform 分割・buildLadders・init・遷移）
    ClearScene.ts           （中継モード）
tests/                      （上記純粋関数のユニットテスト追加）
```

## 実装の順序

1. 純粋ロジック（playerMovement の追加関数 + touchLayout）とユニットテスト
2. 入力（InputState.climbDir / InputController / キーボード）
3. ステージデータ（LadderRect / nextStageId / STAGE2）と TEX.ladder + 生成
4. GameScene（ground/platform 分割・buildLadders・init/遷移）と Player（梯子状態・rig）
5. ClearScene 中継モード
6. テスト・lint・typecheck・build を通す

## セキュリティ考慮事項

- 外部入力・ネットワーク・シークレットは扱わない（クライアント内ゲームロジックのみ）。
- ハードコードの新規 URL/キー等は発生しない。stage 定義は既存同様コード内の座標データ。

## パフォーマンス考慮事項

- 梯子の重なり判定は矩形 N 個の AABB チェック（stage の梯子は数個）で軽量。毎フレームでも問題なし。
- ワンウェイ判定は collider の processCallback でフレーム内に閉じる（追加の毎フレーム走査なし）。

## 将来の拡張性

- `StageData.nextStageId` 連結により stage3 以降を data 追加だけで増やせる。
- すり抜け・梯子の純粋関数は他エンティティにも再利用可能。
- 現状はコード定義だが、将来 Tiled ローダへ差し替える際も型(LadderRect)を流用できる。
