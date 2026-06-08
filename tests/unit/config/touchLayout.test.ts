import { describe, it, expect } from 'vitest';
import {
  moveDirFromDelta,
  clampStick,
  isInMoveZone,
  isInsideButton,
  MOVE_ZONE,
  MOVE_DEADZONE_PX,
  MOVE_PAD_MAX_RADIUS,
  JUMP_BUTTON,
} from '../../../src/config/touchLayout';

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
    // 原点が画面左端(0)でも、そこから左へ動かせば左入力が成立する
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
  it('左半分はゾーン内、右半分はゾーン外', () => {
    expect(isInMoveZone(MOVE_ZONE.width - 1)).toBe(true);
    expect(isInMoveZone(MOVE_ZONE.width + 1)).toBe(false);
  });
});

describe('isInsideButton', () => {
  it('ボタン中心はヒット、半径外は非ヒット', () => {
    expect(isInsideButton(JUMP_BUTTON, JUMP_BUTTON.x, JUMP_BUTTON.y)).toBe(true);
    expect(isInsideButton(JUMP_BUTTON, JUMP_BUTTON.x + JUMP_BUTTON.radius + 5, JUMP_BUTTON.y)).toBe(
      false,
    );
  });
});
