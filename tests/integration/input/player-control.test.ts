import { describe, it, expect } from 'vitest';
import type { InputState } from '../../../src/types/input';
import {
  resolveHorizontalVelocity,
  shouldJump,
  resolveFacing,
  facingSign,
} from '../../../src/systems/playerMovement';
import { isChargedShot, canFire } from '../../../src/systems/shot';
import { PLAYER, SHOT } from '../../../src/config/balance';

// 入力 → プレイヤー制御(移動/向き/ジャンプ/発射判定)の一連を、
// InputState を入力にした制御パイプラインとして統合検証する。
// (Player エンティティが内部で用いる純粋ロジックの結合を確認する)

interface ControlModel {
  facing: 'left' | 'right';
  velocityX: number;
  onGround: boolean;
  vy: number;
  isCharging: boolean;
  chargeStartedAt: number;
  lastShotAt: number;
  shots: Array<{ kind: 'normal' | 'charged'; dir: -1 | 1 }>;
}

function step(model: ControlModel, input: InputState, now: number): void {
  model.velocityX = resolveHorizontalVelocity(input.moveDir);
  model.facing = resolveFacing(model.facing, input.moveDir);
  if (shouldJump(input, model.onGround)) {
    model.vy = PLAYER.jumpVelocity;
    model.onGround = false;
  }
  if (input.shootHeld && !model.isCharging) {
    model.isCharging = true;
    model.chargeStartedAt = now;
  }
  if (input.shootReleased) {
    const elapsed = model.isCharging ? now - model.chargeStartedAt : 0;
    model.isCharging = false;
    if (canFire(now, model.lastShotAt)) {
      model.lastShotAt = now;
      model.shots.push({
        kind: isChargedShot(elapsed) ? 'charged' : 'normal',
        dir: facingSign(model.facing),
      });
    }
  }
}

function newModel(): ControlModel {
  return {
    facing: 'right',
    velocityX: 0,
    onGround: true,
    vy: 0,
    isCharging: false,
    chargeStartedAt: 0,
    lastShotAt: -SHOT.cooldownMs,
    shots: [],
  };
}

const idle: InputState = {
  moveDir: 0,
  jumpPressed: false,
  jumpHeld: false,
  shootPressed: false,
  shootHeld: false,
  shootReleased: false,
  shootCancel: false,
};

describe('入力→プレイヤー移動', () => {
  it('左入力で左向き・負の速度、離すと停止', () => {
    const m = newModel();
    step(m, { ...idle, moveDir: -1 }, 0);
    expect(m.facing).toBe('left');
    expect(m.velocityX).toBe(-PLAYER.moveSpeed);
    step(m, idle, 16);
    expect(m.velocityX).toBe(0);
  });

  it('停止入力では直前の向きを維持する(ショット方向の安定)', () => {
    const m = newModel();
    step(m, { ...idle, moveDir: -1 }, 0);
    step(m, idle, 16);
    expect(m.facing).toBe('left');
  });

  it('接地時のみジャンプし、空中では再ジャンプしない', () => {
    const m = newModel();
    step(m, { ...idle, jumpPressed: true }, 0);
    expect(m.vy).toBe(PLAYER.jumpVelocity);
    m.vy = 0; // 落下中とみなす
    step(m, { ...idle, jumpPressed: true }, 16);
    expect(m.vy).toBe(0); // 空中では発動しない
  });
});

describe('入力→発射(チャージ判定)', () => {
  it('短い押下→離すは通常弾を前方へ発射', () => {
    const m = newModel();
    step(m, { ...idle, shootHeld: true }, 1000);
    step(m, { ...idle, shootReleased: true }, 1000 + (SHOT.chargeThresholdMs - 50));
    expect(m.shots).toHaveLength(1);
    expect(m.shots[0]).toEqual({ kind: 'normal', dir: 1 });
  });

  it('しきい値以上の長押し→離すはチャージ弾', () => {
    const m = newModel();
    step(m, { ...idle, shootHeld: true }, 1000);
    step(m, { ...idle, shootReleased: true }, 1000 + SHOT.chargeThresholdMs);
    expect(m.shots[0].kind).toBe('charged');
  });

  it('左向き時はチャージ弾が左方向(-1)に出る', () => {
    const m = newModel();
    step(m, { ...idle, moveDir: -1, shootHeld: true }, 1000);
    step(m, { ...idle, moveDir: -1, shootReleased: true }, 1000 + SHOT.chargeThresholdMs);
    expect(m.shots[0]).toEqual({ kind: 'charged', dir: -1 });
  });

  it('クールダウン中の連続発射は抑制される', () => {
    const m = newModel();
    step(m, { ...idle, shootHeld: true, shootReleased: true }, 1000);
    // クールダウン未満で再度離す
    step(m, { ...idle, shootHeld: true, shootReleased: true }, 1000 + (SHOT.cooldownMs - 10));
    expect(m.shots).toHaveLength(1);
  });
});
