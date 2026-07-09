// ボスのフェーズ・アクションを表す共有型。

/** HP に応じた行動フェーズ。HP 50% で phase2 に移行する。 */
export type BossPhase = 'phase1' | 'phase2';

/**
 * ボスが実行する個々の行動。フェーズ別の重み付き抽選で選ばれる。
 * 接地ボスは idle/move/shoot/jump/stagger、飛行ボスは hover/move/shoot/dive/stagger、
 * 収容番人(stage3)は接地アクション + 固有の missile(放物線ミサイル) / containment(一時拘束フィールド)、
 * 浄化型(stage4)は idle/move/shoot/spray/stagger + 固有の bloom(汚染床設置)、
 * 使者(stage5)は飛行アクション + 固有の lance(高速槍弾)/blink(瞬間移動)、
 * ECLIPSE本体(stage6 ラスボス)は idle/shoot/stagger + 固有の summon(配下召喚)を使う
 * (系統ごとに重みテーブルで使用アクションを限定する)。
 * missile は放物線で降り注ぐアーティラリー、containment は一時拘束フィールド、
 * spray は扇状の範囲攻撃(毒霧スプレー)、
 * bloom はプレイヤー足元へ時限式の汚染床を設置する地形干渉、lance は任意角度の高速槍弾、
 * blink は逆サイドへの瞬間移動(残像)、summon は配下 Enemy の動的生成で、
 * それぞれ専用の重みテーブルに閉じる。
 */
export type BossAction =
  | 'idle'
  | 'move'
  | 'shoot'
  | 'jump'
  | 'stagger'
  | 'dive'
  | 'hover'
  | 'missile'
  | 'containment'
  | 'spray'
  | 'bloom'
  | 'lance'
  | 'blink'
  | 'summon';

/**
 * ボスの系統。接地型(stage1)・飛行/浮遊型(stage2)・重装ミサイル型(stage3 収容番人)・
 * 巨大コア型(stage6 ECLIPSE本体・非人型で浮遊し配下を召喚するラスボス)を出し分ける。
 */
export type BossKind = 'ground' | 'flying' | 'warden' | 'core';
