// タッチ/キーボード入力を抽象化した 1 フレーム分の操作意図。

export type MoveDir = -1 | 0 | 1;

export interface InputState {
  /** -1=左, 0=停止, 1=右 */
  moveDir: MoveDir;
  /** このフレームでジャンプ入力が立ち上がったか */
  jumpPressed: boolean;
  /** ショットボタン押下中(チャージ判定に使用) */
  shootHeld: boolean;
  /** このフレームで離されたか(発射トリガ) */
  shootReleased: boolean;
}
