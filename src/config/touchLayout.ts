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

/** 追従式タッチパッドの不感帯(px)。原点からこの距離を超えて動かすと移動入力になる。 */
export const MOVE_DEADZONE_PX = 18;

/** タッチパッドの見た目: 外周リング半径。 */
export const MOVE_PAD_BASE_RADIUS = 52;
/** タッチパッドの見た目: スティック(指)ドット半径。 */
export const MOVE_PAD_STICK_RADIUS = 30;
/** スティック表示が原点から離れられる最大距離(描画クランプ用)。 */
export const MOVE_PAD_MAX_RADIUS = 56;

/**
 * タッチ原点からの横方向の移動量(delta = 現在X - 原点X)から進行方向を求める。
 * 触れた箇所を起点に、左へ動かせば左、右へ動かせば右、不感帯内は停止。
 * 「押している間その向きへ歩き、離すと止まる」を原点相対で判定する。
 */
export function moveDirFromDelta(deltaX: number): -1 | 0 | 1 {
  if (deltaX < -MOVE_DEADZONE_PX) return -1;
  if (deltaX > MOVE_DEADZONE_PX) return 1;
  return 0;
}

/**
 * スティックの表示位置を原点から最大半径内にクランプする。
 * @returns 描画用のスティック座標
 */
export function clampStick(
  baseX: number,
  baseY: number,
  curX: number,
  curY: number,
): { x: number; y: number } {
  const dx = curX - baseX;
  const dy = curY - baseY;
  const dist = Math.hypot(dx, dy);
  if (dist <= MOVE_PAD_MAX_RADIUS || dist === 0) {
    return { x: curX, y: curY };
  }
  const scale = MOVE_PAD_MAX_RADIUS / dist;
  return { x: baseX + dx * scale, y: baseY + dy * scale };
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
