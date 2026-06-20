import type { BossPhase } from '../types/boss';
import type { ProjectileKind, ProjectileOwner } from '../types/combat';
import { BOSS, BOSS_SHIELD } from '../config/balance';

// 戦闘ルールの純粋ロジック(Phaser 非依存)。

/**
 * 被弾後の無敵時間中かを判定する。
 * @param now - 現在時刻(ms)
 * @param invincibleUntil - 無敵終了時刻(ms)。0=無敵でない。
 */
export function isInvincible(now: number, invincibleUntil: number): boolean {
  return now < invincibleUntil;
}

/**
 * HP にダメージを適用した結果の HP を返す(0 未満にならない)。
 * 状態を直接変えない純粋関数として撃破判定をテスト可能にする。
 */
export function applyDamageToHp(hp: number, amount: number): number {
  return Math.max(0, hp - Math.max(0, amount));
}

/**
 * プレイヤーが受ける実ダメージを解決する。
 * sourceMultiplierOverride がある攻撃は、難易度の globalMultiplier ではなく個別倍率を使う。
 */
export function resolvePlayerDamage(
  amount: number,
  globalMultiplier: number,
  sourceMultiplierOverride?: number,
): number {
  return Math.ceil(amount * (sourceMultiplierOverride ?? globalMultiplier));
}

/** HP が尽きた(撃破)かを判定する。 */
export function isDead(hp: number): boolean {
  return hp <= 0;
}

/** ボスの現在 HP からフェーズを判定する。HP <= 50% で phase2。 */
export function bossPhaseForHp(hp: number, maxHp: number): BossPhase {
  if (maxHp <= 0) return 'phase2';
  return hp / maxHp <= BOSS.phase2HpRatio ? 'phase2' : 'phase1';
}

/** チャージ中に吸収できる弾。強攻撃のミサイル/槍弾は回避対象として残す。 */
export function isChargeAbsorbableProjectile(
  kind: ProjectileKind,
  owner: ProjectileOwner,
): boolean {
  return owner === 'enemy' && kind === 'normal';
}

export type ShieldHitKind = ProjectileKind | 'beam';

export interface BossShieldHitInput {
  shieldHp: number;
  hpDamage: number;
  hitKind: ShieldHitKind;
}

export interface BossShieldHitResult {
  nextShieldHp: number;
  shieldDamage: number;
  hpDamage: number;
  brokeShield: boolean;
}

function shieldDamageForHit(kind: ShieldHitKind): number {
  if (kind === 'charged') return BOSS_SHIELD.chargedDamage;
  if (kind === 'beam') return BOSS_SHIELD.beamDamage;
  return BOSS_SHIELD.normalDamage;
}

/**
 * ボスシールドへの命中を解決する。シールドが残っている間は本体ダメージを遮断し、
 * シールドを割った命中だけ余剰分を本体へ通す。
 */
export function resolveBossShieldHit(input: BossShieldHitInput): BossShieldHitResult {
  const shieldHp = Math.max(0, input.shieldHp);
  const hpDamage = Math.max(0, input.hpDamage);
  if (shieldHp <= 0) {
    return { nextShieldHp: 0, shieldDamage: 0, hpDamage, brokeShield: false };
  }

  const shieldDamage = Math.max(0, shieldDamageForHit(input.hitKind));
  const appliedShieldDamage = Math.min(shieldHp, shieldDamage);
  const nextShieldHp = shieldHp - appliedShieldDamage;
  const brokeShield = shieldHp > 0 && nextShieldHp === 0;
  const overflowDamage = brokeShield ? Math.max(0, hpDamage - appliedShieldDamage) : 0;

  return {
    nextShieldHp,
    shieldDamage: appliedShieldDamage,
    hpDamage: overflowDamage,
    brokeShield,
  };
}

export interface DamageState {
  hp: number;
  invincibleUntil: number;
}

/**
 * 無敵時間を考慮してダメージを適用した結果の状態を返す(純粋関数)。
 * 無敵中は HP も無敵終了時刻も変えない(重複ダメージを防ぐ)。被弾時のみ
 * 無敵時間を更新する。Player と統合テストで共有する。
 */
export function resolveInvincibleDamage(
  state: DamageState,
  amount: number,
  now: number,
  invincibleMs: number,
): DamageState {
  if (isInvincible(now, state.invincibleUntil)) {
    return state;
  }
  return {
    hp: applyDamageToHp(state.hp, amount),
    invincibleUntil: now + invincibleMs,
  };
}
