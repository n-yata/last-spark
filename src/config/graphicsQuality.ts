// プレイ画面のポストFX(色調補正・ブルーム・ビネット)の有効可否を解決する。
// Phaser 非依存の純関数として切り出し、vitest で直接検証できる(副作用なし)。
//
// 設計意図: カットシーン(厚塗り一枚絵)との質感差を、ゲーム本体カメラへのポストFXで縮める。
// ただし postFX は WebGL 専用かつ bloom は塗りつぶし負荷が高いため、レンダラ・端末密度に
// 応じて段階的に有効化し、低スペック端末の 60fps を守る。既定は自動判定(auto)だが、
// オプションメニューの「エフェクト」設定(GameSettings.graphicsFx)で上書きできる。

import type { GraphicsFxMode } from '../types/save';

export interface GraphicsQuality {
  /** 色調補正(暗め基調を締める)。軽量。 */
  colorGrade: boolean;
  /** 発光ブルーム。塗りつぶし負荷が高く、高密度端末では落とす。 */
  bloom: boolean;
  /** 四隅を沈めるビネット。軽量。 */
  vignette: boolean;
}

const ALL_DISABLED: GraphicsQuality = { colorGrade: false, bloom: false, vignette: false };

/** bloom を落とす生 DPR の閾値。これを超える高密度端末ではフィルレート負荷を避ける。 */
export const BLOOM_MAX_DPR = 2;

/**
 * ポストFXの有効可否を決める。
 * - WebGL でない(Canvas フォールバック)なら mode に関わらず全FX無効(postFX は WebGL 専用のため)。
 * - mode='off' は全FX無効(低スペック端末の fps 確保・素の画面を好むユーザー向け)。
 * - mode='high' は DPR 不問で全FX有効(高密度端末でも bloom を有効化する明示的な選択)。
 * - mode='auto'(未指定含む)は自動判定: bloom のみ生 DPR が BLOOM_MAX_DPR を超える
 *   高密度端末で無効化し、軽量な colorGrade / vignette を残す。
 *
 * @param opts.webgl レンダラが WebGL か(Canvas は false)。
 * @param opts.dpr   端末の生 devicePixelRatio(クランプ前の値)。
 * @param opts.mode  ユーザー設定の画質モード(省略時 'auto')。
 */
export function resolveGraphicsQuality(opts: {
  webgl: boolean;
  dpr: number;
  mode?: GraphicsFxMode;
}): GraphicsQuality {
  if (!opts.webgl) return { ...ALL_DISABLED };
  const mode = opts.mode ?? 'auto';
  if (mode === 'off') return { ...ALL_DISABLED };
  if (mode === 'high') return { colorGrade: true, vignette: true, bloom: true };
  const dpr = Number.isFinite(opts.dpr) ? opts.dpr : 1;
  return {
    colorGrade: true,
    vignette: true,
    bloom: dpr <= BLOOM_MAX_DPR,
  };
}

/** オプションメニューの表示ラベル(difficultyLabel の流儀)。 */
export function graphicsFxLabel(mode: GraphicsFxMode): string {
  if (mode === 'high') return 'HIGH';
  if (mode === 'off') return 'OFF';
  return 'AUTO';
}

/** トグルの巡回順: auto → high → off → auto(toggleDifficulty の流儀)。 */
export function cycleGraphicsFx(mode: GraphicsFxMode): GraphicsFxMode {
  if (mode === 'auto') return 'high';
  if (mode === 'high') return 'off';
  return 'auto';
}
