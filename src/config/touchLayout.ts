import { GAME_WIDTH, GAME_HEIGHT } from './gameConfig';

// 横向き・両手持ち専用のタッチUIレイアウト。
// InputController(入力判定)と TouchControls(描画)で共有する。

export interface CircleButton {
  x: number;
  y: number;
  radius: number;
}

/** 画面左半分=移動ゾーン。 */
export const MOVE_ZONE = {
  x: 0,
  y: 0,
  width: GAME_WIDTH / 2,
  height: GAME_HEIGHT,
} as const;

/** 方向ゾーン式の押し分けデッドゾーン(px)。初期接地点からの横ぶれ閾値。 */
export const MOVE_DEADZONE_PX = 16;

/** 右手親指で押すジャンプボタン(右下寄り)。 */
export const JUMP_BUTTON: CircleButton = {
  x: GAME_WIDTH - 110,
  y: GAME_HEIGHT - 90,
  radius: 56,
};

/** 右手親指で押すショットボタン(ジャンプの左上)。 */
export const SHOOT_BUTTON: CircleButton = {
  x: GAME_WIDTH - 250,
  y: GAME_HEIGHT - 140,
  radius: 56,
};

/** 点 (px,py) がボタン円内かを判定する。 */
export function isInsideButton(button: CircleButton, px: number, py: number): boolean {
  const dx = px - button.x;
  const dy = py - button.y;
  return dx * dx + dy * dy <= button.radius * button.radius;
}

/** 点 (px) が移動ゾーン(左半分)内かを判定する。 */
export function isInMoveZone(px: number): boolean {
  return px < MOVE_ZONE.width;
}
