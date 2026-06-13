// ボスのフェーズ・アクションを表す共有型。

/** HP に応じた行動フェーズ。HP 50% で phase2 に移行する。 */
export type BossPhase = 'phase1' | 'phase2';

/**
 * ボスが実行する個々の行動。フェーズ別の重み付き抽選で選ばれる。
 * 接地ボスは idle/move/shoot/jump/stagger、飛行ボスは hover/move/shoot/dive/stagger、
 * 収容番人(stage3)は接地アクション + 固有の missile(放物線ミサイル)を使う
 * (系統ごとに重みテーブルで使用アクションを限定する)。
 */
export type BossAction =
  | 'idle'
  | 'move'
  | 'shoot'
  | 'jump'
  | 'stagger'
  | 'dive'
  | 'hover'
  | 'missile';

/**
 * ボスの系統。接地型(stage1)・飛行/浮遊型(stage2)・重装ミサイル型(stage3 収容番人)を
 * 出し分ける。
 */
export type BossKind = 'ground' | 'flying' | 'warden';
