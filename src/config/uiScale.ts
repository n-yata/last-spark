// 画面座標系の絶対px(fontSize/ボタン半径/配置オフセット等)を高DPI(Retina)で
// 鮮明化するためのスケール係数を一元管理する。Phaser非依存(ユニットテスト容易)。
//
// 背景: Phaser 3.90 は resolution が 1 固定で、canvas のバッキング解像度=論理サイズ。
// 鮮明化のため論理サイズを物理px化(systems/dprScaling)するが、その結果として
// 絶対px指定のUIが 1/dpr に縮む。これを uiScale(=cappedDpr) 倍で打ち消すことで、
// 見た目・操作感を現状と不変に保ったまま、描画解像度だけを引き上げる。

/** DPR の上限。鮮明さは2倍でほぼ飽和し、フィルレート負荷を抑えて60fpsを守る。 */
export const DPR_CAP = 2;

let uiScale = 1;

/**
 * devicePixelRatio を [1, DPR_CAP] にクランプして返す。
 * 引数省略時は window から読む。window 不在(テスト/SSR)や不正値では 1。
 */
export function cappedDpr(
  raw: number = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
): number {
  if (!Number.isFinite(raw)) return 1;
  return Math.max(1, Math.min(raw, DPR_CAP));
}

/** 現在のUIスケール係数(=適用中の cappedDpr)。 */
export function getUiScale(): number {
  return uiScale;
}

/** UIスケール係数を設定する(下限1・不正値は1)。dprScaling から起動時/リサイズ時に呼ぶ。 */
export function setUiScale(scale: number): void {
  uiScale = Number.isFinite(scale) ? Math.max(1, scale) : 1;
}

/** 絶対px(CSS px基準のベース値)を現在のスケールで物理px換算する。 */
export function scaled(px: number): number {
  return px * uiScale;
}

/** fontSize 用に物理px換算した "Npx" 文字列を返す。 */
export function scaledFontPx(px: number): string {
  return `${scaled(px)}px`;
}
