import { SHOT } from '../config/balance';
import type { ProjectileKind } from '../types/combat';

// ショット関連の純粋ロジック(Phaser 非依存)。

/**
 * 長押し経過時間からチャージショット成立を判定する。
 * しきい値ちょうどで成立(>=)。
 */
export function isChargedShot(elapsedMs: number): boolean {
  return elapsedMs >= SHOT.chargeThresholdMs;
}

export interface ProjectileSpec {
  kind: ProjectileKind;
  damage: number;
  speed: number;
  size: number;
}

/** 弾種に応じたダメージ・速度・サイズの仕様を返す。 */
export function createProjectileSpec(kind: ProjectileKind): ProjectileSpec {
  if (kind === 'charged') {
    return {
      kind,
      damage: SHOT.chargedDamage,
      speed: SHOT.chargedSpeed,
      size: SHOT.chargedSize,
    };
  }
  return {
    kind: 'normal',
    damage: SHOT.normalDamage,
    speed: SHOT.normalSpeed,
    size: SHOT.normalSize,
  };
}

/**
 * 連射クールダウンが明けているかを判定する。
 * @param now - 現在時刻(ms)
 * @param lastShotAt - 直前の発射時刻(ms)。未発射は 0 を渡す。
 */
export function canFire(now: number, lastShotAt: number): boolean {
  return now - lastShotAt >= SHOT.cooldownMs;
}

/** 経過時間からチャージ蓄積率(0–1)を返す。UI ゲージ表示に使う。 */
export function chargeRatio(elapsedMs: number): number {
  const ratio = elapsedMs / SHOT.chargeThresholdMs;
  return Math.max(0, Math.min(1, ratio));
}
