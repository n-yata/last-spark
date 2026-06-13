// ボスのフェーズ・アクションを表す共有型。

/** HP に応じた行動フェーズ。HP 50% で phase2 に移行する。 */
export type BossPhase = 'phase1' | 'phase2';

/**
 * ボスが実行する個々の行動。フェーズ別の重み付き抽選で選ばれる。
 * 接地ボスは idle/move/shoot/jump/stagger、飛行ボスは hover/move/shoot/dive/stagger、
 * 浄化型(stage4)は idle/move/shoot/spray/stagger を使う
 * (系統ごとに重みテーブルで使用アクションを限定する)。
 * spray は扇状の範囲攻撃(毒霧スプレー)で、浄化型専用の重みテーブルに閉じる。
 */
export type BossAction =
  | 'idle'
  | 'move'
  | 'shoot'
  | 'jump'
  | 'stagger'
  | 'dive'
  | 'hover'
  | 'spray';

/** ボスの系統。接地型(stage1)と飛行/浮遊型(stage2)を出し分ける。 */
export type BossKind = 'ground' | 'flying';
