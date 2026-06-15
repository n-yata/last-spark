// プレイ画面のポストFX(色調補正・ブルーム・ビネット)の有効可否を解決する。
// Phaser 非依存の純関数として切り出し、vitest で直接検証できる(副作用なし)。
//
// 設計意図: カットシーン(厚塗り一枚絵)との質感差を、ゲーム本体カメラへのポストFXで縮める。
// ただし postFX は WebGL 専用かつ bloom は塗りつぶし負荷が高いため、レンダラ・端末密度に
// 応じて段階的に有効化し、低スペック端末の 60fps を守る。将来オプションメニューから
// ユーザー設定で上書きできるよう、判定を 1 関数に集約しておく。

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
 * - WebGL でない(Canvas フォールバック)なら全FX無効(postFX は WebGL 専用のため)。
 * - bloom は塗りつぶしが重いので、生 DPR が BLOOM_MAX_DPR を超える高密度端末では無効化し、
 *   軽量な colorGrade / vignette のみ残す。
 *
 * @param opts.webgl レンダラが WebGL か(Canvas は false)。
 * @param opts.dpr   端末の生 devicePixelRatio(クランプ前の値)。
 */
export function resolveGraphicsQuality(opts: { webgl: boolean; dpr: number }): GraphicsQuality {
  if (!opts.webgl) return { ...ALL_DISABLED };
  const dpr = Number.isFinite(opts.dpr) ? opts.dpr : 1;
  return {
    colorGrade: true,
    vignette: true,
    bloom: dpr <= BLOOM_MAX_DPR,
  };
}
