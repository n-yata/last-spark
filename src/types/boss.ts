// ボスのフェーズ・アクションを表す共有型。

/** HP に応じた行動フェーズ。HP 50% で phase2 に移行する。 */
export type BossPhase = 'phase1' | 'phase2';

/**
 * ボスが実行する個々の行動。フェーズ別の重み付き抽選で選ばれる。
 * 接地ボスは idle/move/shoot/jump/stagger、飛行ボスは hover/move/shoot/dive/stagger を使う
 * (系統ごとに重みテーブルで使用アクションを限定する)。
 */
export type BossAction = 'idle' | 'move' | 'shoot' | 'jump' | 'stagger' | 'dive' | 'hover';

/** ボスの系統。接地型(stage1)と飛行/浮遊型(stage2)を出し分ける。 */
export type BossKind = 'ground' | 'flying';
