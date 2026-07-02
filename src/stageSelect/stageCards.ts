import { STAGE_IDS } from '../config/stages';
import { stageName } from './stages';
import type { SaveData, StageRank } from '../types/save';

// ステージセレクトのカード表示用モデルとレイアウト計算(Phaser 非依存の純粋ロジック)。
// 描画(stageSelect.ts)と分離し、解放判定・タイム整形・グリッド配置を vitest で直接検証できる。

/** カード1枚分の表示モデル。 */
export interface StageCardModel {
  id: string;
  /** 1 始まりのステージ番号(表示用)。 */
  stageNo: number;
  /** ステージ名(「崩れた都市」等。STAGE n の番号は含まない)。 */
  name: string;
  /** 今周回でクリア済みか(CLEAR バッジ)。 */
  cleared: boolean;
  /** ベストタイム(ms)。未クリアなら undefined。周回をまたいで保持される。 */
  bestTimeMs?: number;
  /** 最高ランク(S/A/B)。未記録なら undefined。周回をまたいで保持される。 */
  bestRank?: StageRank;
  /** 未解放か(暗転 + LOCKED 表示、タップ無効)。 */
  locked: boolean;
}

/** カード1枚分の配置矩形(論理座標)。 */
export interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** cardGridLayout のオプション(全て論理px)。 */
export interface CardGridOptions {
  /** グリッド上端(見出しの下)。 */
  top: number;
  /** グリッド下端(BACK ボタンの上)。 */
  bottom: number;
  /** 左右マージン。 */
  marginX: number;
  /** カード間ガター。 */
  gutter: number;
  /** 列数。既定 3。 */
  columns?: number;
}

/**
 * ステージが解放済みかを判定する。
 * - 先頭(index 0)は常に解放。
 * - それ以外は「直前のステージを一度でもクリアした記録がある」場合に解放:
 *   今周回のクリア(clearedStages) **または** 過去周回を含むベストタイム(bestTimeMs)。
 * bestTimeMs は周回(New Game+)で clearedStages がリセットされても消えないため、
 * 一度到達したステージは周回後も選び直せる(既存の自由選択体験を周回プレイヤーから奪わない)。
 */
export function isStageUnlocked(
  index: number,
  clearedStages: readonly string[],
  bestTimeMs: Record<string, number> | undefined,
  stageIds: readonly string[] = STAGE_IDS,
): boolean {
  if (index <= 0) return true;
  const prevId = stageIds[index - 1];
  if (prevId === undefined) return false;
  return clearedStages.includes(prevId) || bestTimeMs?.[prevId] !== undefined;
}

/**
 * ベストタイムを `m:ss` 形式へ整形する(TitleScene / ClearScene の表示と同一形式)。
 * 秒は切り捨て。負値・非有限値は 0 として扱う(表示用の防御)。
 */
export function formatBestTime(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSec = Math.floor(safe / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * カードのグリッド配置を計算する。columns 列で左上から行順に敷き、
 * 利用可能領域(top〜bottom / marginX〜width-marginX)へ均等に収める。
 * カード同士は重ならず、領域からはみ出さない。
 */
export function cardGridLayout(
  width: number,
  count: number,
  opts: CardGridOptions,
): CardRect[] {
  const columns = Math.max(1, opts.columns ?? 3);
  const rows = Math.ceil(count / columns);
  const innerW = width - opts.marginX * 2;
  const innerH = opts.bottom - opts.top;
  const cardW = (innerW - opts.gutter * (columns - 1)) / columns;
  const cardH = (innerH - opts.gutter * (rows - 1)) / rows;
  const rects: CardRect[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    rects.push({
      x: opts.marginX + col * (cardW + opts.gutter),
      y: opts.top + row * (cardH + opts.gutter),
      width: cardW,
      height: cardH,
    });
  }
  return rects;
}

/** SaveData から全ステージのカードモデルを構築する(STAGES 登録順)。 */
export function buildStageCardModels(
  save: Pick<SaveData, 'clearedStages' | 'bestTimeMs' | 'bestRank'>,
  stageIds: readonly string[] = STAGE_IDS,
): StageCardModel[] {
  return stageIds.map((id, index) => ({
    id,
    stageNo: index + 1,
    name: stageName(id),
    cleared: save.clearedStages.includes(id),
    bestTimeMs: save.bestTimeMs?.[id],
    bestRank: save.bestRank?.[id],
    locked: !isStageUnlocked(index, save.clearedStages, save.bestTimeMs, stageIds),
  }));
}
