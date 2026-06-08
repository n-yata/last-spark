import { describe, it, expect } from 'vitest';
import {
  createTouchLayout,
  moveDirFromDelta,
  clampStick,
  isInMoveZone,
  isInsideButton,
  MOVE_DEADZONE_PX,
  MOVE_PAD_MAX_RADIUS,
} from '../../../src/config/touchLayout';

describe('createTouchLayout(実画面サイズ基準のレイアウト)', () => {
  it('移動ゾーンは画面左半分を占め、左端は x=0(物理画面端まで届く)', () => {
    const layout = createTouchLayout(1200, 540);
    expect(layout.moveZone.x).toBe(0);
    expect(layout.moveZone.width).toBe(600);
    expect(layout.moveZone.height).toBe(540);
  });

  it('画面が広い端末では移動ゾーンもその分広がる', () => {
    const wide = createTouchLayout(1600, 540);
    expect(wide.moveZone.width).toBe(800);
  });

  it('ジャンプ/ショットボタンは画面右下に配置される', () => {
    const layout = createTouchLayout(1200, 540);
    expect(layout.jumpButton.x).toBe(1200 - 84);
    expect(layout.jumpButton.y).toBe(540 - 72);
    expect(layout.shootButton.x).toBe(1200 - 188);
    expect(layout.shootButton.x).toBeLessThan(layout.jumpButton.x); // ショットはジャンプの左
    expect(layout.jumpButton.radius).toBe(44); // 親指で押しやすい控えめサイズ
  });
});

describe('moveDirFromDelta(追従式パッドの方向判定)', () => {
  it('原点から左へ不感帯を超えて動かすと左(-1)', () => {
    expect(moveDirFromDelta(-(MOVE_DEADZONE_PX + 1))).toBe(-1);
  });

  it('原点から右へ不感帯を超えて動かすと右(1)', () => {
    expect(moveDirFromDelta(MOVE_DEADZONE_PX + 1)).toBe(1);
  });

  it('不感帯内(原点付近)は停止(0)', () => {
    expect(moveDirFromDelta(0)).toBe(0);
    expect(moveDirFromDelta(-MOVE_DEADZONE_PX)).toBe(0);
    expect(moveDirFromDelta(MOVE_DEADZONE_PX)).toBe(0);
  });

  it('原点相対なので画面位置に依存せず左右どちらにも入力できる(後退できないバグの回帰防止)', () => {
    expect(moveDirFromDelta(-30)).toBe(-1);
    expect(moveDirFromDelta(30)).toBe(1);
  });
});

describe('clampStick(スティック表示位置のクランプ)', () => {
  it('最大半径内なら現在位置をそのまま返す', () => {
    expect(clampStick(100, 100, 120, 100)).toEqual({ x: 120, y: 100 });
  });

  it('最大半径を超えたら原点から最大半径上に丸める', () => {
    const r = clampStick(100, 100, 100 + MOVE_PAD_MAX_RADIUS * 3, 100);
    expect(r.x).toBeCloseTo(100 + MOVE_PAD_MAX_RADIUS, 5);
    expect(r.y).toBeCloseTo(100, 5);
  });

  it('原点と同一点でも例外なく原点を返す', () => {
    expect(clampStick(50, 50, 50, 50)).toEqual({ x: 50, y: 50 });
  });
});

describe('isInMoveZone', () => {
  it('ゾーン内(左端0含む)は true、ゾーン外(右半分)は false', () => {
    const { moveZone } = createTouchLayout(1200, 540);
    expect(isInMoveZone(moveZone, 0)).toBe(true);
    expect(isInMoveZone(moveZone, moveZone.width - 1)).toBe(true);
    expect(isInMoveZone(moveZone, moveZone.width + 1)).toBe(false);
  });
});

describe('isInsideButton', () => {
  it('ボタン中心はヒット、半径外は非ヒット', () => {
    const { jumpButton } = createTouchLayout(1200, 540);
    expect(isInsideButton(jumpButton, jumpButton.x, jumpButton.y)).toBe(true);
    expect(isInsideButton(jumpButton, jumpButton.x + jumpButton.radius + 5, jumpButton.y)).toBe(
      false,
    );
  });
});
