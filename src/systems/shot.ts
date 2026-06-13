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
  if (kind === 'missile') {
    // speed は発射時の上向き初速。水平速度は WardenBoss が computeLobVelocity で逆算する。
    return {
      kind,
      damage: SHOT.missileDamage,
      speed: SHOT.missileLaunchSpeed,
      size: SHOT.missileSize,
    };
  }
  return {
    kind: 'normal',
    damage: SHOT.normalDamage,
    speed: SHOT.normalSpeed,
    size: SHOT.normalSize,
  };
}

/** 放物線弾(ミサイル)の発射初速。velocityX は水平、velocityY は鉛直(上向き負)。 */
export interface LobVelocity {
  velocityX: number;
  velocityY: number;
}

/**
 * 放物線(アーティラリー)弾の発射初速を逆算する純粋関数。
 *
 * 上向き初速 `launchSpeed`(px/s, 正値)で撃ち出し、重力 `gravity`(px/s^2, 正値=下向き)を
 * 受けて落下し、鉛直方向で `landY` に達するまでの時間 T を解の公式で求める。その T で
 * 水平に `targetX` へ届く速度を `velocityX` として返す。画面座標(下方向が +Y)前提。
 *
 * @param startX  発射点 X
 * @param startY  発射点 Y(landY より上=値が小さい想定)
 * @param targetX 着弾させたい X
 * @param landY   着弾させたい Y(地面の高さなど。startY より下=値が大きい想定)
 * @param launchSpeed 上向き初速(px/s, 正値)
 * @param gravity 重力加速度(px/s^2, 正値)
 */
export function computeLobVelocity(
  startX: number,
  startY: number,
  targetX: number,
  landY: number,
  launchSpeed: number,
  gravity: number,
): LobVelocity {
  // y(t) = startY - launchSpeed*t + 0.5*gravity*t^2 = landY を解く。
  // 0.5*g*t^2 - launchSpeed*t + (startY - landY) = 0
  const disc = launchSpeed * launchSpeed - 2 * gravity * (startY - landY);
  // startY <= landY(発射点が着弾点より上)なら disc >= launchSpeed^2 > 0 で必ず実数解。
  const safeDisc = Math.max(0, disc);
  // 落下して landY を下向きに横切る側(正の大きい根)を採用する。
  const t = (launchSpeed + Math.sqrt(safeDisc)) / gravity;
  const velocityX = t > 0 ? (targetX - startX) / t : 0;
  return { velocityX, velocityY: -launchSpeed };
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
