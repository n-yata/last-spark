import type { BossPhase, BossAction } from '../types/boss';

// ボス行動抽選(Phaser 非依存の純粋ロジック)。
// 直前と同じアクションは重みを半減し、連続を抑制する。
// 系統(接地/飛行)ごとに重みテーブルを分け、共通の抽選ロジックを再利用する。

/** 0 以上 1 未満の乱数を返す関数。テストでは決定的な実装を注入できる。 */
export type Rng = () => number;

/** フェーズ別の行動重みテーブル。 */
type WeightTable = Partial<Record<BossAction, number>>;
type PhaseWeights = Record<BossPhase, WeightTable>;

/** 接地ボスのフェーズ別重み(相対値)。phase2 は攻勢を強める。 */
const GROUND_WEIGHTS: PhaseWeights = {
  phase1: { move: 35, shoot: 35, idle: 15, jump: 15 },
  phase2: { move: 30, shoot: 35, idle: 5, jump: 30 },
};

/**
 * 飛行ボスのフェーズ別重み(相対値)。hover(その場で滞空)/move(高度を保って左右)/
 * shoot/dive(急降下)。dive は両フェーズで出現し、phase2 で増量して圧を強める。
 */
const FLYING_WEIGHTS: PhaseWeights = {
  phase1: { hover: 20, move: 30, shoot: 30, dive: 20 },
  phase2: { hover: 10, move: 25, shoot: 30, dive: 35 },
};

/**
 * 収容番人(stage3)のフェーズ別重み(相対値)。接地アクション(move/shoot/idle/jump)に
 * 固有の missile(放物線ミサイル)を加える。missile は両フェーズで主力級、phase2 で増量して
 * 「降り注ぐミサイル」で stage1/2 と明確に差別化する。
 */
const WARDEN_WEIGHTS: PhaseWeights = {
  phase1: { move: 25, shoot: 25, missile: 25, idle: 10, jump: 15 },
  phase2: { move: 20, shoot: 25, missile: 35, idle: 5, jump: 15 },
};

/**
 * 浄化型ボス(stage4・環境管理機)のフェーズ別重み(相対値)。接地型と同じく地上で戦うが、
 * jump を持たず spray(扇状の範囲攻撃)/bloom(時限式の汚染床設置)を主軸にする。phase2 で
 * spray・bloom を増量し、毒霧と足元の汚染床で安全地帯を奪う(揺らぎ・疑いのテーマ)。
 * spray/bloom は浄化型専用のため、このテーブルにのみ含め、他系統の抽選には混入させない。
 */
const PURIFIER_WEIGHTS: PhaseWeights = {
  phase1: { move: 25, shoot: 20, spray: 25, bloom: 25, idle: 5 },
  phase2: { move: 20, shoot: 15, spray: 30, bloom: 35 },
};

/**
 * 使者(stage5・ENVOY)のフェーズ別重み(相対値)。飛行型を継承し滞空(hover)/急降下(dive)を
 * 再利用しつつ、固有の lance(高速槍弾)/blink(瞬間移動)を主軸にする。move は持たず、
 * 位置取りは blink に置き換える。phase2 で blink を増量し、瞬間移動で挟む圧を強める
 * (RAY に「読み(選択)」を強いる刺客)。lance/blink は使者専用のため、このテーブルにのみ含め、
 * 接地/飛行/収容番人/浄化/コアの抽選には混入させない。
 */
const ENVOY_WEIGHTS: PhaseWeights = {
  phase1: { hover: 10, dive: 20, lance: 35, blink: 25, shoot: 10 },
  phase2: { hover: 5, dive: 20, lance: 35, blink: 35, shoot: 5 },
};

/**
 * ECLIPSE本体(stage6 ラスボス)のフェーズ別重み(相対値)。浮遊して静止するコアのため
 * move/jump は持たない。phase1=支援型(配下召喚 summon を主軸に shoot/idle を織り交ぜる)、
 * phase2=直接攻撃型(summon を完全に止め、コアが shoot に集中して圧をかける)。
 * summon は phase1 のみに置き、phase2 へは混入させない(フェーズで攻撃様式を切り替える設計)。
 */
const CORE_WEIGHTS: PhaseWeights = {
  phase1: { summon: 40, shoot: 35, idle: 25 },
  phase2: { shoot: 75, idle: 25 },
};

/** 直前と同一アクションに掛ける重み係数(連続抑制)。 */
const REPEAT_PENALTY = 0.5;

/**
 * 重み付き抽選。重みの合計に対する乱数で 1 件を選ぶ。
 * 合計が 0(候補なし)の場合は先頭を返す。
 */
export function weightedRandom<T>(entries: Array<[T, number]>, rng: Rng = Math.random): T {
  const valid = entries.filter(([, w]) => w > 0);
  if (valid.length === 0) {
    return entries[0][0];
  }
  const total = valid.reduce((sum, [, w]) => sum + w, 0);
  let threshold = rng() * total;
  for (const [item, weight] of valid) {
    threshold -= weight;
    if (threshold < 0) {
      return item;
    }
  }
  // 浮動小数の誤差で末尾に到達した場合のフォールバック
  return valid[valid.length - 1][0];
}

/**
 * 重みテーブルから次アクションを抽選する汎用ロジック。
 * 直前と同じアクションは重みを半減させ、連続を抑制する。系統に依存しない。
 */
function pickWeightedAction(
  table: WeightTable,
  last: BossAction,
  rng: Rng,
): BossAction {
  const adjusted = (Object.entries(table) as Array<[BossAction, number]>).map(
    ([action, weight]) => [action, action === last ? weight * REPEAT_PENALTY : weight] as [
      BossAction,
      number,
    ],
  );
  return weightedRandom(adjusted, rng);
}

/**
 * 接地ボスの次アクションを重み付き抽選で決定する。
 *
 * @param phase - 現在のボスフェーズ
 * @param last - 直前に実行したアクション
 * @param rng - 乱数源(テスト用に注入可能)
 * @returns 次に実行するアクション
 */
export function pickNextBossAction(
  phase: BossPhase,
  last: BossAction,
  rng: Rng = Math.random,
): BossAction {
  return pickWeightedAction(GROUND_WEIGHTS[phase], last, rng);
}

/**
 * 飛行ボスの次アクションを重み付き抽選で決定する。
 *
 * @param phase - 現在のボスフェーズ
 * @param last - 直前に実行したアクション
 * @param rng - 乱数源(テスト用に注入可能)
 * @returns 次に実行するアクション
 */
export function pickNextFlyingBossAction(
  phase: BossPhase,
  last: BossAction,
  rng: Rng = Math.random,
): BossAction {
  return pickWeightedAction(FLYING_WEIGHTS[phase], last, rng);
}

/**
 * 収容番人(stage3)の次アクションを重み付き抽選で決定する。
 *
 * @param phase - 現在のボスフェーズ
 * @param last - 直前に実行したアクション
 * @param rng - 乱数源(テスト用に注入可能)
 * @returns 次に実行するアクション
 */
export function pickNextWardenBossAction(
  phase: BossPhase,
  last: BossAction,
  rng: Rng = Math.random,
): BossAction {
  return pickWeightedAction(WARDEN_WEIGHTS[phase], last, rng);
}

/**
 * 浄化型ボス(stage4)の次アクションを重み付き抽選で決定する。
 *
 * @param phase - 現在のボスフェーズ
 * @param last - 直前に実行したアクション
 * @param rng - 乱数源(テスト用に注入可能)
 * @returns 次に実行するアクション
 */
export function pickNextPurifierBossAction(
  phase: BossPhase,
  last: BossAction,
  rng: Rng = Math.random,
): BossAction {
  return pickWeightedAction(PURIFIER_WEIGHTS[phase], last, rng);
}

/**
 * 使者(stage5・ENVOY)の次アクションを重み付き抽選で決定する。
 * lance/blink を含む ENVOY 専用テーブルを使い、他系統には混入させない。
 *
 * @param phase - 現在のボスフェーズ
 * @param last - 直前に実行したアクション
 * @param rng - 乱数源(テスト用に注入可能)
 * @returns 次に実行するアクション
 */
export function pickNextEnvoyBossAction(
  phase: BossPhase,
  last: BossAction,
  rng: Rng = Math.random,
): BossAction {
  return pickWeightedAction(ENVOY_WEIGHTS[phase], last, rng);
}

/**
 * ECLIPSE本体(stage6 ラスボス)の次アクションを重み付き抽選で決定する。
 * phase1 は summon を含み、phase2 は summon を含まない(フェーズで攻撃様式が変わる)。
 *
 * @param phase - 現在のボスフェーズ
 * @param last - 直前に実行したアクション
 * @param rng - 乱数源(テスト用に注入可能)
 * @returns 次に実行するアクション
 */
export function pickNextCoreBossAction(
  phase: BossPhase,
  last: BossAction,
  rng: Rng = Math.random,
): BossAction {
  return pickWeightedAction(CORE_WEIGHTS[phase], last, rng);
}

/** 接地ボスのフェーズで許可されるアクション一覧(テスト/UI 用)。 */
export function allowedActions(phase: BossPhase): BossAction[] {
  return Object.keys(GROUND_WEIGHTS[phase]) as BossAction[];
}

/** 収容番人のフェーズで許可されるアクション一覧(テスト/UI 用)。 */
export function allowedWardenActions(phase: BossPhase): BossAction[] {
  return Object.keys(WARDEN_WEIGHTS[phase]) as BossAction[];
}

/** 浄化型ボスのフェーズで許可されるアクション一覧(テスト/UI 用)。 */
export function allowedPurifierActions(phase: BossPhase): BossAction[] {
  return Object.keys(PURIFIER_WEIGHTS[phase]) as BossAction[];
}

/** 使者(stage5)のフェーズで許可されるアクション一覧(テスト/UI 用)。 */
export function allowedEnvoyActions(phase: BossPhase): BossAction[] {
  return Object.keys(ENVOY_WEIGHTS[phase]) as BossAction[];
}

/** 飛行ボスのフェーズで許可されるアクション一覧(テスト/UI 用)。 */
export function allowedFlyingActions(phase: BossPhase): BossAction[] {
  return Object.keys(FLYING_WEIGHTS[phase]) as BossAction[];
}

/** ECLIPSE本体(stage6)のフェーズで許可されるアクション一覧(テスト/UI 用)。 */
export function allowedCoreActions(phase: BossPhase): BossAction[] {
  return Object.keys(CORE_WEIGHTS[phase]) as BossAction[];
}

/**
 * アクション継続時間を取得する。マップに該当キーがなければ fallback を返す純粋関数。
 * 系統別に actionDurationMs が一部キーのみ持つ(Partial)ため、未定義での NaN/クラッシュを防ぐ。
 */
export function bossActionDuration(
  map: Partial<Record<BossAction, number>>,
  action: BossAction,
  fallback: number,
): number {
  return map[action] ?? fallback;
}
