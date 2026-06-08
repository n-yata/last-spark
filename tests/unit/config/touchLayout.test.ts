import { describe, it, expect } from 'vitest';
import {
  moveDirFromX,
  isInMoveZone,
  isInsideButton,
  MOVE_ZONE,
  MOVE_DEADZONE_PX,
  JUMP_BUTTON,
} from '../../../src/config/touchLayout';

const CENTER = MOVE_ZONE.x + MOVE_ZONE.width / 2;

describe('moveDirFromX(方向ゾーン式の押し分け)', () => {
  it('ゾーン中央より左(不感帯外)を押すと左(-1)', () => {
    expect(moveDirFromX(CENTER - MOVE_DEADZONE_PX - 1)).toBe(-1);
  });

  it('ゾーン中央より右(不感帯外)を押すと右(1)', () => {
    expect(moveDirFromX(CENTER + MOVE_DEADZONE_PX + 1)).toBe(1);
  });

  it('中央付近の不感帯では停止(0)', () => {
    expect(moveDirFromX(CENTER)).toBe(0);
    expect(moveDirFromX(CENTER - MOVE_DEADZONE_PX)).toBe(0);
    expect(moveDirFromX(CENTER + MOVE_DEADZONE_PX)).toBe(0);
  });

  it('画面左端(x=0)でも左入力が成立する(後退できないバグの回帰防止)', () => {
    expect(moveDirFromX(0)).toBe(-1);
  });

  it('移動ゾーン右端付近でも右入力が成立する', () => {
    expect(moveDirFromX(MOVE_ZONE.width - 1)).toBe(1);
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
