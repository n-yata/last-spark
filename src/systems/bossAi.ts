import type { BossPhase, BossAction } from '../types/boss';

// ボス行動抽選(Phaser 非依存の純粋ロジック)。
// 直前と同じアクションは重みを半減し、連続を抑制する。

/** 0 以上 1 未満の乱数を返す関数。テストでは決定的な実装を注入できる。 */
export type Rng = () => number;

/** フェーズ別の行動重みテーブル(相対値)。phase2 は攻勢を強める。 */
const WEIGHTS: Record<BossPhase, Partial<Record<BossAction, number>>> = {
  phase1: { move: 35, shoot: 35, idle: 15, jump: 15 },
  phase2: { move: 30, shoot: 35, idle: 5, jump: 30 },
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
 * ボスの次アクションを重み付き抽選で決定する。
 * 直前と同じアクションは重みを半減させ、連続を抑制する。
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
  const table = WEIGHTS[phase];
  const adjusted = (Object.entries(table) as Array<[BossAction, number]>).map(
    ([action, weight]) => [action, action === last ? weight * REPEAT_PENALTY : weight] as [
      BossAction,
      number,
    ],
  );
  return weightedRandom(adjusted, rng);
}

/** フェーズで許可されるアクション一覧(テスト/UI 用)。 */
export function allowedActions(phase: BossPhase): BossAction[] {
  return Object.keys(WEIGHTS[phase]) as BossAction[];
}
