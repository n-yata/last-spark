import { describe, it, expect } from 'vitest';
import {
  isChargedShot,
  createProjectileSpec,
  canFire,
  chargeRatio,
} from '../../../src/systems/shot';
import { SHOT } from '../../../src/config/balance';

describe('isChargedShot', () => {
  it('しきい値未満の長押しは通常弾になる', () => {
    expect(isChargedShot(SHOT.chargeThresholdMs - 1)).toBe(false);
  });

  it('しきい値ちょうどの長押しはチャージ弾になる', () => {
    expect(isChargedShot(SHOT.chargeThresholdMs)).toBe(true);
  });

  it('しきい値を超える長押しはチャージ弾になる', () => {
    expect(isChargedShot(SHOT.chargeThresholdMs + 500)).toBe(true);
  });
});

describe('createProjectileSpec', () => {
  it('charged はダメージ・速度・サイズが通常より大きい', () => {
    const normal = createProjectileSpec('normal');
    const charged = createProjectileSpec('charged');
    expect(charged.damage).toBeGreaterThan(normal.damage);
    expect(charged.speed).toBeGreaterThan(normal.speed);
    expect(charged.size).toBeGreaterThan(normal.size);
  });

  it('normal は config の値を反映する', () => {
    const spec = createProjectileSpec('normal');
    expect(spec).toEqual({
      kind: 'normal',
      damage: SHOT.normalDamage,
      speed: SHOT.normalSpeed,
      size: SHOT.normalSize,
    });
  });
});

describe('canFire', () => {
  it('クールダウン未満では発射できない', () => {
    expect(canFire(1000, 1000 - (SHOT.cooldownMs - 1))).toBe(false);
  });

  it('クールダウンちょうどで発射できる', () => {
    expect(canFire(1000, 1000 - SHOT.cooldownMs)).toBe(true);
  });
});

describe('chargeRatio', () => {
  it('0ms は 0、しきい値で 1 になる', () => {
    expect(chargeRatio(0)).toBe(0);
    expect(chargeRatio(SHOT.chargeThresholdMs)).toBe(1);
  });

  it('しきい値を超えても 1 で頭打ちになる', () => {
    expect(chargeRatio(SHOT.chargeThresholdMs * 2)).toBe(1);
  });

  it('途中は 0–1 の比率を返す', () => {
    expect(chargeRatio(SHOT.chargeThresholdMs / 2)).toBeCloseTo(0.5, 5);
  });
});
