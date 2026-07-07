// タイトル画面演出の純粋ロジック(Phaser 非依存)。
// ロゴのスパーク明滅と、漂う光の粒(残り火)の軌道を、時刻とシードから決定論的に計算する。
// stageBackground.ts と同じ方針: Math.random を使わず、同じ入力には常に同じ結果を返す
// (テスト可能性と、リサイズ・再描画での見た目の安定のため)。

/** 粒(残り火)1つ分の不変パラメータ。createMotes がシードから決定論生成する。 */
export interface Mote {
  /** 基準 X(画面幅比 0..1)。 */
  baseX: number;
  /** 軌道の位相オフセット(0..1)。上昇の開始位置と横揺れの位相をずらす。 */
  phase: number;
  /** 上昇速度(画面高さ比/秒)。0.02〜0.06 程度のゆっくりした立ち上り。 */
  riseSpeed: number;
  /** 横揺れの振幅(画面幅比)。 */
  swayAmp: number;
  /** 横揺れの角速度(rad/秒)。 */
  swayFreq: number;
  /** 粒の半径(論理px)。scaled() は描画側で掛ける。 */
  size: number;
  /** 基本アルファ(0..1)。粒ごとの明るさの個性。 */
  baseAlpha: number;
}

/** 粒の1フレーム分の描画情報。 */
export interface MotePoint {
  x: number;
  y: number;
  alpha: number;
}

// --- 決定論的 PRNG(mulberry32。stageBackground.ts と同方式) ---

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ロゴのスパーク明滅アルファを返す(値域 [minAlpha, 1])。
 * 非整数比の周期を持つ複数の sin を合成して非周期的な揺らぎを作り、合成値が深く沈む
 * 瞬間だけ 2 乗整形で強調する——「基本は灯っていて、時折ふっと暗くなる」劣化ネオンの表情。
 * 同じ nowMs には常に同じ値を返す(決定論)。
 */
export function logoFlickerAlpha(nowMs: number, minAlpha: number): number {
  const lo = Math.max(0, Math.min(1, minAlpha));
  const t = nowMs / 1000;
  // 周期比が無理数的(非整数比)な3波の合成。単調な明滅に見えない最小構成。
  const wave =
    Math.sin(t * 2.1) * 0.45 + Math.sin(t * 5.3 + 1.7) * 0.35 + Math.sin(t * 13.7 + 4.2) * 0.2;
  // wave は概ね [-1,1]。0..1 に正規化し、暗い側だけ 2 乗で深く沈める(明側は平坦に保つ)。
  const n = Math.max(0, Math.min(1, (wave + 1) / 2));
  const shaped = 1 - (1 - n) * (1 - n);
  return lo + (1 - lo) * shaped;
}

/**
 * 粒(残り火)のパラメータ一式をシードから生成する。同じ (seed, count) は常に同じ結果。
 */
export function createMotes(seed: number, count: number): Mote[] {
  const rand = mulberry32(seed);
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    motes.push({
      baseX: rand(),
      phase: rand(),
      riseSpeed: 0.02 + rand() * 0.04, // 画面高の 2〜6%/秒でゆっくり立ち上る
      swayAmp: 0.008 + rand() * 0.02, // 画面幅の 0.8〜2.8% の緩い横揺れ
      swayFreq: 0.4 + rand() * 0.9, // rad/秒
      size: 1.5 + rand() * 2.0, // 論理px(描画側で scaled)
      baseAlpha: 0.25 + rand() * 0.45,
    });
  }
  return motes;
}

/**
 * 粒の現在位置とアルファを返す(決定論)。
 * - y: phase で開始位置をずらしつつ riseSpeed で上昇し、画面上端を抜けたら下端へ循環する。
 * - x: baseX を中心に sin で緩く横揺れする。
 * - alpha: 画面の上下端に近づくほどフェードして、湧き/消えの唐突さを消す。
 */
export function motePosition(
  mote: Mote,
  nowMs: number,
  width: number,
  height: number,
): MotePoint {
  const t = nowMs / 1000;
  // 0..1 の循環進行(0=下端、1=上端)。margin なしでも端フェードで自然に見える。
  const progress = (mote.phase + t * mote.riseSpeed) % 1;
  const y = height * (1 - progress);
  const x = width * mote.baseX + width * mote.swayAmp * Math.sin(t * mote.swayFreq + mote.phase * Math.PI * 2);
  // 端 12% でフェードイン/アウト(中央帯は baseAlpha)。
  const edge = Math.min(progress, 1 - progress);
  const edgeFade = Math.max(0, Math.min(1, edge / 0.12));
  return { x, y, alpha: mote.baseAlpha * edgeFade };
}
