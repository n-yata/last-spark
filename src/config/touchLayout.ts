// 横向き・両手持ち専用のタッチUIレイアウト。
// InputController(入力判定)と UI(描画)で共有する。
// RESIZE スケールに対応するため、レイアウトは実画面サイズから動的に算出する。

export interface CircleButton {
  x: number;
  y: number;
  radius: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TouchLayout {
  /** 画面左半分=移動ゾーン。 */
  moveZone: Rect;
  /** ジャンプボタン(右上に配置)。 */
  jumpButton: CircleButton;
  /** ショットボタン(左下に配置)。 */
  shootButton: CircleButton;
}

const BUTTON_RADIUS = 44;

/** 実画面サイズからタッチUIレイアウトを算出する。 */
export function createTouchLayout(width: number, height: number): TouchLayout {
  return {
    moveZone: { x: 0, y: 0, width: width / 2, height },
    // ジャンプ=右上、ショット=左下(対角配置)。
    jumpButton: { x: width - 84, y: height - 112, radius: BUTTON_RADIUS },
    shootButton: { x: width - 188, y: height - 72, radius: BUTTON_RADIUS },
  };
}

/** 追従式タッチパッドの不感帯(px)。原点からこの距離を超えて動かすと移動入力になる。 */
export const MOVE_DEADZONE_PX = 18;

/** タッチパッドの見た目: 外周リング半径。 */
export const MOVE_PAD_BASE_RADIUS = 58;
/** タッチパッドの見た目: スティック(指)ドット半径。 */
export const MOVE_PAD_STICK_RADIUS = 32;
/** スティック表示が原点から離れられる最大距離(描画クランプ用)。 */
export const MOVE_PAD_MAX_RADIUS = 62;

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

/** 点 (px,py) がボタン円内かを判定する。 */
export function isInsideButton(button: CircleButton, px: number, py: number): boolean {
  const dx = px - button.x;
  const dy = py - button.y;
  return dx * dx + dy * dy <= button.radius * button.radius;
}

/** 点 (px) が移動ゾーン内かを判定する。 */
export function isInMoveZone(moveZone: Rect, px: number): boolean {
  return px >= moveZone.x && px < moveZone.x + moveZone.width;
}
