// ボスのフェーズ・アクションを表す共有型。

/** HP に応じた行動フェーズ。HP 50% で phase2 に移行する。 */
export type BossPhase = 'phase1' | 'phase2';

/** ボスが実行する個々の行動。フェーズ別の重み付き抽選で選ばれる。 */
export type BossAction = 'idle' | 'move' | 'shoot' | 'charge' | 'stagger';
