import { RANK } from '../config/balance';
import { STAGE_RANK_ORDER, type StageRank } from '../types/save';

// クリアリザルト(ランク評価・記録更新判定)の純粋ロジック(Phaser 非依存)。
// 表示(ClearScene / ステージセレクトカード)が使う。順序の正本は types/save.ts の
// STAGE_RANK_ORDER(persistence からも参照するため最下位レイヤーに置く)。

/** ランクの表示色(ClearScene / ステージセレクトカードで共有)。既存パレットに準拠。 */
const RANK_COLORS: Record<StageRank, string> = {
  S: '#fff27a', // 金(ALL CLEAR と同系の祝福色)
  A: '#37f7d8', // シアン(タイトル色)
  B: '#cfe9e2', // 通常ラベル色
};

/**
 * 被ダメージからランクを判定する。
 * - S: 無被弾(被ダメージ 0)
 * - A: 被ダメージが maxHp × RANK.aDamageRatio 以下(境界は A)
 * - B: それ以外
 * 不正値(負・NaN・Infinity)は 0 扱いに丸める(表示・保存の防御)。
 */
export function resolveRank(damageTaken: number, maxHp: number): StageRank {
  const safe = Number.isFinite(damageTaken) && damageTaken > 0 ? damageTaken : 0;
  if (safe === 0) return 'S';
  if (safe <= maxHp * RANK.aDamageRatio) return 'A';
  return 'B';
}

/**
 * candidate が current より良いランクか。current が未記録(undefined)なら常に true
 * (初回記録)。同ランクは false(上書き不要)。
 */
export function isBetterRank(candidate: StageRank, current?: StageRank): boolean {
  if (current === undefined) return true;
  return STAGE_RANK_ORDER[candidate] > STAGE_RANK_ORDER[current];
}

/**
 * ベストタイムの更新か。既存記録がある場合にのみ true になり得る
 * (初回クリアは記録の作成であり「更新」ではない。NEW RECORD 演出は更新時のみ)。
 */
export function isNewRecord(prevBestMs: number | undefined, clearTimeMs: number): boolean {
  return prevBestMs !== undefined && clearTimeMs < prevBestMs;
}

/** ランクの表示色(CSS hex)を返す。 */
export function rankColor(rank: StageRank): string {
  return RANK_COLORS[rank];
}
