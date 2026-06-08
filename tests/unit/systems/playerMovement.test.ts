import { describe, it, expect } from 'vitest';
import {
  resolveHorizontalVelocity,
  shouldJump,
  resolveFacing,
  facingSign,
  shouldCutJump,
  cutJumpVelocity,
} from '../../../src/systems/playerMovement';
import { PLAYER } from '../../../src/config/balance';
import type { InputState } from '../../../src/types/input';

const baseInput: InputState = {
  moveDir: 0,
  jumpPressed: false,
  jumpHeld: false,
  shootHeld: false,
  shootReleased: false,
};

describe('resolveHorizontalVelocity', () => {
  it('moveDir に moveSpeed を掛けた速度を返す', () => {
    expect(resolveHorizontalVelocity(-1)).toBe(-PLAYER.moveSpeed);
    expect(resolveHorizontalVelocity(0)).toBe(0);
    expect(resolveHorizontalVelocity(1)).toBe(PLAYER.moveSpeed);
  });
});

describe('shouldJump', () => {
  it('接地中の立ち上がり入力でのみ真', () => {
    expect(shouldJump({ ...baseInput, jumpPressed: true }, true)).toBe(true);
  });
  it('空中では発動しない', () => {
    expect(shouldJump({ ...baseInput, jumpPressed: true }, false)).toBe(false);
  });
  it('入力が無ければ発動しない', () => {
    expect(shouldJump(baseInput, true)).toBe(false);
  });
});

describe('resolveFacing', () => {
  it('移動入力がある時は向きを更新、停止時は維持', () => {
    expect(resolveFacing('right', -1)).toBe('left');
    expect(resolveFacing('left', 1)).toBe('right');
    expect(resolveFacing('left', 0)).toBe('left');
  });
});

describe('facingSign', () => {
  it('left=-1, right=1', () => {
    expect(facingSign('left')).toBe(-1);
    expect(facingSign('right')).toBe(1);
  });
});

describe('shouldCutJump(可変ジャンプ)', () => {
  it('上昇中(vy<0)にボタンを離したらカットする', () => {
    expect(shouldCutJump(false, true, -300)).toBe(true);
  });
  it('押し続けている間はカットしない(最大まで上昇)', () => {
    expect(shouldCutJump(true, true, -300)).toBe(false);
  });
  it('下降中(vy>=0)はカットしない', () => {
    expect(shouldCutJump(false, true, 0)).toBe(false);
    expect(shouldCutJump(false, true, 100)).toBe(false);
  });
  it('ジャンプ上昇フェーズでなければカットしない', () => {
    expect(shouldCutJump(false, false, -300)).toBe(false);
  });
});

describe('cutJumpVelocity', () => {
  it('上向き速度を倍率で弱める(短押し=低いジャンプ)', () => {
    expect(cutJumpVelocity(-620, 0.5)).toBe(-310);
  });

  it('短押しの最高到達点は最大ジャンプより低くなる', () => {
    const g = 1200;
    const maxHeight = PLAYER.jumpVelocity ** 2 / (2 * g);
    const cutVy = cutJumpVelocity(PLAYER.jumpVelocity, PLAYER.jumpCutMultiplier);
    const cutHeight = cutVy ** 2 / (2 * g);
    expect(cutHeight).toBeLessThan(maxHeight);
  });
});
