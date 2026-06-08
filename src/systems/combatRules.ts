import type { BossPhase } from '../types/boss';
import { BOSS } from '../config/balance';

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

/** HP が尽きた(撃破)かを判定する。 */
export function isDead(hp: number): boolean {
  return hp <= 0;
}

/** ボスの現在 HP からフェーズを判定する。HP <= 50% で phase2。 */
export function bossPhaseForHp(hp: number, maxHp: number): BossPhase {
  if (maxHp <= 0) return 'phase2';
  return hp / maxHp <= BOSS.phase2HpRatio ? 'phase2' : 'phase1';
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
