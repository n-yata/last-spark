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

/** 接地ボスのフェーズで許可されるアクション一覧(テスト/UI 用)。 */
export function allowedActions(phase: BossPhase): BossAction[] {
  return Object.keys(GROUND_WEIGHTS[phase]) as BossAction[];
}

/** 飛行ボスのフェーズで許可されるアクション一覧(テスト/UI 用)。 */
export function allowedFlyingActions(phase: BossPhase): BossAction[] {
  return Object.keys(FLYING_WEIGHTS[phase]) as BossAction[];
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
