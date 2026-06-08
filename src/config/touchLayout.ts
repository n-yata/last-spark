import { GAME_WIDTH, GAME_HEIGHT } from './dimensions';

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

/** 方向ゾーン式の押し分けデッドゾーン(px)。ゾーン中央からの不感帯の半幅。 */
export const MOVE_DEADZONE_PX = 16;

/**
 * 移動ゾーン内のタッチ X 座標から進行方向を求める(方向ゾーン式の押し分け)。
 * ゾーン中央より左を押せば左、右を押せば右、中央付近は停止。
 * 「押している間その向きへ歩き、離すと止まる」を、初期接地点に依存しない
 * 絶対位置で判定する(画面端でも左右どちらにも入力できる)。
 */
export function moveDirFromX(px: number): -1 | 0 | 1 {
  const center = MOVE_ZONE.x + MOVE_ZONE.width / 2;
  if (px < center - MOVE_DEADZONE_PX) return -1;
  if (px > center + MOVE_DEADZONE_PX) return 1;
  return 0;
}

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
