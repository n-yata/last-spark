import { describe, it, expect } from 'vitest';
import { PLAYER, SHADOW_RAY } from '../../../src/config/balance';
import { RIG_BODY_SIZE, RIGS } from '../../../src/config/characterRig';

describe('hard mode 裏ボス Shadow RAY', () => {
  it('RAY と同じ物理サイズで戦う', () => {
    expect(SHADOW_RAY.width).toBe(PLAYER.width);
    expect(SHADOW_RAY.height).toBe(PLAYER.height);
    expect(RIG_BODY_SIZE.bossShadowRay).toEqual({
      width: PLAYER.width,
      height: PLAYER.height,
    });
  });

  it('小さい当たり判定に合わせて HP は ECLIPSE 本体より低く、行動は素早い', () => {
    expect(SHADOW_RAY.maxHp).toBeLessThan(58);
    expect(SHADOW_RAY.moveSpeed).toBeGreaterThan(PLAYER.moveSpeed * 0.75);
    expect(SHADOW_RAY.actionDurationMs.shoot).toBeLessThan(700);
  });

  it('専用リグはプレイヤーと同じ数のパーツを持つ', () => {
    expect(RIGS.bossShadowRay.parts).toHaveLength(RIGS.player.parts.length);
  });
});
