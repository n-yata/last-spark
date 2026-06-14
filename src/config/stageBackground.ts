// 各ステージの背景テーマ定義と、決定論的なシルエット生成ロジック。
// Phaser に一切依存しない純データ + 純関数として切り出し、vitest で直接検証できる。
// 実際の描画は systems/backgroundPainter.ts が本ファイルの定義を入力に行う。
//
// 設計意図: ストーリーの世界観(崩れた都市→立坑→収容施設→汚染地帯→外縁部→支配中枢)を
// 空グラデーション + 多層シルエットのパララックスで表現し、6ステージを視覚的に差別化する。
// 既存のプレースホルダ哲学(手続き生成)に合わせ、アセットは追加しない。

/** シルエットの形状種別(ステージ世界観ごとの描き分け)。 */
export type SilhouetteShape =
  | 'ruinedCity' // stage1: 崩れたビル群(高さばらつき・崩落した頂部)
  | 'shaftTown' // stage2: 縦坑の鉄骨・足場(縦ビーム + 横ストラット)
  | 'facility' // stage3: 収容区画(等間隔パネル + 監視灯)
  | 'wasteland' // stage4: 枯れた構造物 + 淀んだ靄
  | 'outerWorks' // stage5: 高密度の機械構造体
  | 'core'; // stage6: 支配中枢(中央コアの威圧 + モノリス)

/** パララックス1層のテーマ。奥(scrollFactor 小)から手前(大)へ重ねる。 */
export interface BackgroundLayerTheme {
  /** シルエット塗り色(CSS hex)。 */
  color: string;
  /** パララックス係数(0..1)。小さいほど遠く=遅く動く。 */
  scrollFactor: number;
  /** シルエット形状の種別。 */
  shape: SilhouetteShape;
  /** シルエットの基準高さ(px, world)。groundY からの立ち上がり。 */
  height: number;
  /** モチーフ反復幅の目安(px)。列ピッチ。 */
  step: number;
}

/** 1ステージ分の背景テーマ。 */
export interface StageBackgroundTheme {
  stageId: string;
  /** 空グラデーション上端色。 */
  skyTop: string;
  /** 空グラデーション下端色(地平線側)。 */
  skyBottom: string;
  /** 発光アクセント色(窓灯・監視灯・コア光)。 */
  accent: string;
  /** 遠景→中景のレイヤー(奥→手前の順)。 */
  layers: BackgroundLayerTheme[];
  /** 決定論的レイアウト用シード。 */
  seed: number;
}

/** 生成された1本のシルエット列(矩形)。world 座標。 */
export interface SilhouetteColumn {
  /** 左端 world x。 */
  x: number;
  /** 幅(px)。 */
  width: number;
  /** 立ち上がり高さ(px)。base は groundY。 */
  height: number;
}

// --- 色ユーティリティ(純関数) ---

/** '#rrggbb' / 'rrggbb' を 0xRRGGBB の数値へ変換する。 */
export function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** 2色(数値)を t(0..1)で線形補間する。t は範囲外でもクランプする。 */
export function lerpColor(a: number, b: number, t: number): number {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  return (r << 16) | (g << 8) | bl;
}

// --- 決定論的 PRNG(mulberry32) ---
// 乱数(Math.random)を使わず、seed から再現可能な疑似乱数を返す。リサイズ再描画や
// テストでレイアウトが安定するようにするための選択。

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
 * シルエット列を決定論的に生成する。worldWidth 全域を step ピッチで埋め、各列の高さを
 * 基準高さ(layer.height)の 0.55〜1.0 倍で揺らす。同一 (layer, worldWidth, seed) は常に同一結果。
 * 描画側(backgroundPainter)が種別ごとの装飾(窓・桟・灯り)を列の上に重ねる。
 */
export function generateSilhouetteColumns(
  layer: BackgroundLayerTheme,
  worldWidth: number,
  seed: number,
): SilhouetteColumn[] {
  const rand = mulberry32(seed);
  const step = Math.max(8, layer.step);
  const columns: SilhouetteColumn[] = [];
  // 端の切れを防ぐため worldWidth を僅かに超えるまで敷く。
  for (let x = 0; x < worldWidth + step; x += step) {
    // 列幅は step の 0.7〜1.0(隣との隙間で奥行きの抜けを作る)。
    const width = step * (0.7 + rand() * 0.3);
    // 高さは基準の 0.55〜1.0 倍で揺らす。
    const height = layer.height * (0.55 + rand() * 0.45);
    columns.push({ x, width, height });
  }
  return columns;
}

// --- 各ステージの背景テーマ ---

const STAGE1_BG: StageBackgroundTheme = {
  // 崩れた都市: 錆と蔓草の旧市街。くすんだ夕暮れの空に、崩落したビル群のシルエット。
  stageId: 'stage1',
  skyTop: '#23202a',
  skyBottom: '#3a2f2a',
  accent: '#c9a14a', // 廃ビルにわずかに灯る琥珀の窓明かり
  seed: 0x5a1b01,
  layers: [
    { color: '#181620', scrollFactor: 0.3, shape: 'ruinedCity', height: 220, step: 180 },
    { color: '#0f0d14', scrollFactor: 0.55, shape: 'ruinedCity', height: 300, step: 140 },
  ],
};

const STAGE2_BG: StageBackgroundTheme = {
  // 立坑の街: 縦に潜る工業都市。鉄骨と足場が下方の闇へ続く。冷たいシアンの作業灯。
  // 視認性のため空を stage1 相当まで明度UP(シアンの色相は維持)。シルエットは空より暗いが
  // 鉄骨やぐら・作業灯が読める水準まで持ち上げる(奥>手前の明暗関係は維持)。
  stageId: 'stage2',
  skyTop: '#1b2630',
  skyBottom: '#283a48',
  accent: '#6cf0ff',
  seed: 0x5a1b02,
  layers: [
    { color: '#16242e', scrollFactor: 0.3, shape: 'shaftTown', height: 460, step: 220 },
    { color: '#0e1a22', scrollFactor: 0.55, shape: 'shaftTown', height: 480, step: 160 },
  ],
};

const STAGE3_BG: StageBackgroundTheme = {
  // 収容施設: 無機質な管理施設。等間隔の収容区画と冷たい監視灯。閉塞感。
  // 視認性のため空・施設シルエットを明度UP(白青の色相は維持)。閉塞感は構図・寒色で出し、
  // 暗さには頼らない。監視灯・発光ラインが読める水準へ。
  stageId: 'stage3',
  skyTop: '#222a31',
  skyBottom: '#333f49',
  accent: '#acc4d6', // 冷たい人工照明の白青
  seed: 0x5a1b03,
  layers: [
    { color: '#1e262e', scrollFactor: 0.35, shape: 'facility', height: 300, step: 200 },
    { color: '#141d24', scrollFactor: 0.6, shape: 'facility', height: 380, step: 150 },
  ],
};

const STAGE4_BG: StageBackgroundTheme = {
  // 汚染地帯: 環境破壊の現場。淀んだ黄緑の靄に枯れた構造物。
  // 淀んだ毒緑の色相を保ったまま明度UP。枯れ構造物・毒の靄が判別できる水準へ。
  // カメラ背景色(stage1.ts backgroundColor)も併せて #20280f 系へ持ち上げる。
  stageId: 'stage4',
  skyTop: '#2a3018',
  skyBottom: '#3c4620',
  accent: '#9bd24a', // 毒性の緑光
  seed: 0x5a1b04,
  layers: [
    { color: '#20280f', scrollFactor: 0.3, shape: 'wasteland', height: 200, step: 200 },
    { color: '#161e0a', scrollFactor: 0.55, shape: 'wasteland', height: 280, step: 150 },
  ],
};

const STAGE5_BG: StageBackgroundTheme = {
  // ECLIPSE外縁部: 冷たい金属。高密度の機械構造体に青い光。
  // 冷たい鋼の青を保ったまま明度UP。高密度の機械ブロック・通気スリット光が読める水準へ。
  // カメラ背景色(stage1.ts backgroundColor)も併せて #141d2a 系へ持ち上げる。
  stageId: 'stage5',
  skyTop: '#1a2434',
  skyBottom: '#28384e',
  accent: '#5ab0ff',
  seed: 0x5a1b05,
  layers: [
    { color: '#16202e', scrollFactor: 0.3, shape: 'outerWorks', height: 320, step: 140 },
    { color: '#0d1622', scrollFactor: 0.55, shape: 'outerWorks', height: 420, step: 110 },
  ],
};

const STAGE6_BG: StageBackgroundTheme = {
  // ECLIPSE支配中枢: 太陽を遮る影の核。暗い藍に、不吉に脈打つコアの赤光とモノリス。
  // 全ステージ中で最も暗いトーンは維持しつつ(影の核の威圧)、地形・モノリスが判別できる
  // 最低限まで明度UP。不吉さは暗藍+赤のアクセントで担保し、漆黒には頼らない。
  stageId: 'stage6',
  // skyTop は layers[0](#14101f)より明るくして、モノリス頭頂が空上端に被ってもシルエットが
  // 読めるコントラストを確保する(最暗トーン・不吉さは維持したまま僅かに引き上げる)。
  skyTop: '#1a1928',
  skyBottom: '#1c1730',
  accent: '#e0457a', // コアの不吉な赤
  seed: 0x5a1b06,
  layers: [
    { color: '#14101f', scrollFactor: 0.25, shape: 'core', height: 360, step: 260 },
    { color: '#0c0a16', scrollFactor: 0.5, shape: 'core', height: 460, step: 200 },
  ],
};

const STAGE_BACKGROUNDS: Record<string, StageBackgroundTheme> = {
  stage1: STAGE1_BG,
  stage2: STAGE2_BG,
  stage3: STAGE3_BG,
  stage4: STAGE4_BG,
  stage5: STAGE5_BG,
  stage6: STAGE6_BG,
};

/** stageId に対応する背景テーマを返す。未知 ID は stage1 にフォールバック(getStageData と同方針)。 */
export function getStageBackground(stageId: string): StageBackgroundTheme {
  return STAGE_BACKGROUNDS[stageId] ?? STAGE1_BG;
}
