# 設計

## 方針

ジャンプ入力を「右下のJUMP仮想ボタン」から「左追従パッドの上スワイプ（上方向変位）」へ移行する。これにより：

- 左親指: 移動（横変位）＋ジャンプ（上変位）を1本で兼務
- 右親指: SHOT長押し（チャージ）専任

指の競合が解消され、チャージしながらジャンプが物理的に可能になる。

可変ジャンプは「上スワイプ後に指を上方向へ留め続ける長さ」で高さを制御する。既存の `shouldCutJump` / `cutJumpVelocity`（`playerMovement.ts`）と `jumpHeld` のセマンティクスはそのまま流用し、`jumpHeld` の導出元だけを「ボタン押下」から「上方向変位がしきい値以上か」に差し替える。

## 入力モデルの中核ロジック（純粋関数）

`src/config/touchLayout.ts` に Phaser 非依存の純粋関数として上スワイプ判定を切り出す。これによりエッジ/再アーム挙動をユニットテスト可能にする。

```ts
/** 上スワイプでジャンプとみなす、原点からの上方向変位しきい値(px)。 */
export const JUMP_SWIPE_PX = 48;

export interface JumpSwipeState {
  /** ジャンプ保持中（上変位がしきい値以上） */
  held: boolean;
  /** 次の上方向クロスでジャンプを発火できる状態か（連続発火防止） */
  armed: boolean;
}

export function initialJumpSwipe(): JumpSwipeState;

/**
 * 上方向変位(upwardDelta = originY - curY, 上が正)を1ステップ評価し、
 * 立ち上がりエッジ(pressed)と次状態を返す。
 * - しきい値以上 かつ armed: pressed=true, held=true, armed=false（発火、再アーム解除）
 * - しきい値未満: held=false, armed=true（原点側に戻すと再アーム）
 * - しきい値以上 だが not armed: held=true 維持、pressed=false（保持継続）
 */
export function stepJumpSwipe(prev: JumpSwipeState, upwardDelta: number): {
  state: JumpSwipeState;
  pressed: boolean;
};
```

### しきい値の設計

- `JUMP_SWIPE_PX = 48` は横移動の `MOVE_DEADZONE_PX = 18` より十分大きく取り、横移動の意図を上スワイプと誤検出しにくくする。
- 横移動（X変位）と上スワイプ（Y変位）は直交軸なので、純粋な横移動では `upwardDelta ≈ 0` となり誤発火しない。斜め上方向は「移動しながらジャンプ」として意図通り両方成立する。

## InputController の変更

- `jumpButton` 由来の `onPointerDown` 分岐・`jumpPointerId` フィールドを削除する。
- ジャンプは移動ポインタ（`movePointerId`）に紐づける。
- `onPointerMove`（移動ポインタ時）で `upwardDelta = moveOriginY - pointer.y` を計算し `stepJumpSwipe` を実行。`pressed` なら `jumpPressedEdge = true`、`jumpHeld = state.held`。
- `onPointerDown`（移動ゾーン）/`onPointerUp`（移動ポインタ解放）/`onGameOut` で `jumpSwipe` 状態を `initialJumpSwipe()` に戻し、`jumpHeld=false` にする（着地後の再ジャンプ用に再アーム）。
- キーボード SPACE フォールバックは現状維持（`jumpPressed`/`jumpHeld` を従来どおり合成）。

## touchLayout の変更

- `TouchLayout` インターフェースから `jumpButton` を削除。`createTouchLayout` も `jumpButton` を生成しない。
- `shootButton`・`isInsideButton`・移動ゾーン系は不変。

## UI の変更

### TouchControls（仮想ボタンガイド）
- JUMP ボタンの円描画・`jumpLabel`・`JUMP_COLOR` を削除。右側は SHOT のみ描画する。

### MovePad（追従パッド描画）
- 上＝ジャンプを示すガイドとして、原点の上方向にしきい値位置の控えめなシェブロン（▲）を表示する。
- 上変位がしきい値以上のとき（`isJumpSwipeHeld` 相当）、スティックをハイライトしてジャンプ発動が伝わるようにする。`MovePad` は受け取る `baseY/curY` から自前で `upwardDelta` を算出する（新規 registry キーは追加しない）。

## テスト方針

- `tests/unit/config/touchLayout.test.ts`:
  - `jumpButton` 依存アサーションを削除（`isInsideButton` テストは `shootButton` に置換）。
  - `JUMP_SWIPE_PX > MOVE_DEADZONE_PX` の不変条件。
  - `stepJumpSwipe`: しきい値未満→以上で `pressed=true`・`held=true`、保持中は `pressed=false`、原点側に戻すと再アーム、戻してから再度上で再発火（再ジャンプ）の一連を検証。
- 既存の `player-control.test.ts`（`InputState` ベースのパイプライン）はインターフェース不変のため影響なし。

## スコープ外（要求どおり）
- チャージ/ショット仕様、キーボード挙動、ボスAI/ステージ調整は変更しない。
