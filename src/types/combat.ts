// 戦闘に関わる共有型。

// normal/charged はプレイヤー弾、missile は番人(stage3)の放物線弾、
// lance は使者(stage5)の高速槍弾(任意角度・非貫通)。見た目と挙動を種別で出し分ける。
export type ProjectileKind = 'normal' | 'charged' | 'missile' | 'lance';
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
