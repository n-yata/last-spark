// 戦闘に関わる共有型。

export type ProjectileKind = 'normal' | 'charged';
export type ProjectileOwner = 'player' | 'enemy';

/** ダメージを受けられる対象の最小インターフェース。 */
export interface Damageable {
  /** 現在 HP */
  hp: number;
  /** 最大 HP */
  maxHp: number;
  /** ダメージを適用する。HP は 0 未満にならない。 */
  takeDamage(amount: number): void;
  /** 撃破済みか(HP <= 0) */
  isDead(): boolean;
}
