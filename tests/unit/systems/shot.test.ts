import { describe, it, expect } from 'vitest';
import {
  isChargedShot,
  createProjectileSpec,
  canFire,
  chargeRatio,
  computeLobVelocity,
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

  it('missile は config のミサイル値を反映する(通常より重い)', () => {
    const spec = createProjectileSpec('missile');
    expect(spec).toEqual({
      kind: 'missile',
      damage: SHOT.missileDamage,
      speed: SHOT.missileLaunchSpeed,
      size: SHOT.missileSize,
    });
    expect(spec.damage).toBeGreaterThan(createProjectileSpec('normal').damage);
  });
});

describe('computeLobVelocity', () => {
  const gravity = 1200;

  // 与えた初速で放物線を時間 t まで積分し、到達点(x, y)を求めるヘルパ。
  const positionAt = (
    startX: number,
    startY: number,
    vx: number,
    vy: number,
    t: number,
  ): { x: number; y: number } => ({
    x: startX + vx * t,
    y: startY + vy * t + 0.5 * gravity * t * t,
  });

  // y(t) = landY を満たす落下到達時刻(正の根)を解いて返す。
  const timeToLand = (startY: number, vy: number, landY: number): number =>
    (-vy + Math.sqrt(vy * vy - 2 * gravity * (startY - landY))) / gravity;

  it('逆算した初速で着弾点(targetX, landY)にほぼ到達する', () => {
    const startX = 4050;
    const startY = 380;
    const targetX = 4300;
    const landY = 473;
    const { velocityX, velocityY } = computeLobVelocity(
      startX,
      startY,
      targetX,
      landY,
      520,
      gravity,
    );
    const t = timeToLand(startY, velocityY, landY);
    const pos = positionAt(startX, startY, velocityX, velocityY, t);
    expect(pos.x).toBeCloseTo(targetX, 3);
    expect(pos.y).toBeCloseTo(landY, 3);
  });

  it('初速は上向き(velocityY が負)で放物線を描く', () => {
    const { velocityY } = computeLobVelocity(0, 380, 200, 473, 520, gravity);
    expect(velocityY).toBe(-520);
  });

  it('着弾点が発射点より右なら velocityX は正、左なら負', () => {
    const right = computeLobVelocity(100, 380, 400, 473, 520, gravity);
    const left = computeLobVelocity(100, 380, -200, 473, 520, gravity);
    expect(right.velocityX).toBeGreaterThan(0);
    expect(left.velocityX).toBeLessThan(0);
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
