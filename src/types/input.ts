// タッチ/キーボード入力を抽象化した 1 フレーム分の操作意図。

export type MoveDir = -1 | 0 | 1;

export interface InputState {
  /** -1=左, 0=停止, 1=右 */
  moveDir: MoveDir;
  /** 梯子昇降の上下入力。-1=上(登る), 0=なし, 1=下(降りる)。梯子に重なっている時のみ Player 側で使用。 */
  climbDir: -1 | 0 | 1;
  /** このフレームでジャンプ入力が立ち上がったか(ジャンプ開始トリガ) */
  jumpPressed: boolean;
  /** ジャンプボタン押下中か(可変ジャンプの高さ制御に使用) */
  jumpHeld: boolean;
  /** このフレームでショット入力が立ち上がったか(タップ/連射判定の起点) */
  shootPressed: boolean;
  /** ショットボタン押下中(連射・押下継続判定に使用) */
  shootHeld: boolean;
  /** このフレームで離されたか(タップ確定トリガ) */
  shootReleased: boolean;
  /** ショット操作を強制中断するか(画面外フォーカス喪失等。チャージ含め待機へ戻す) */
  shootCancel: boolean;
}
