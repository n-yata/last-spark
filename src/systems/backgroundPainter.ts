import Phaser from 'phaser';
import {
  generateSilhouetteColumns,
  hexToNum,
  lerpColor,
  type BackgroundLayerTheme,
  type SilhouetteColumn,
  type StageBackgroundTheme,
} from '../config/stageBackground';

// ステージ背景の手続き描画。stageBackground のテーマ(純データ)を入力に、空グラデーションと
// 多層シルエットを Graphics で描く。座標はワールド系(論理 px)。UI と違い uiScale は適用しない。
//
// パララックスは setScrollFactor(<1) で実現する。各レイヤーはワールド幅全域 [0, worldWidth] に
// 描くため、カメラがどこを映しても可視範囲が必ず覆われる(ボス戦の bounds 縮約後も同様)。
// よって create で一度だけ生成すればよく、RESIZE/ズーム変化での再構築は不要。

// depth は地形(0)・梯子(5)・敵(8)・ボス(9)・プレイヤー(10)・UI(95+)より背面に置く。
const SKY_DEPTH = -30;
const ATMOSPHERE_DEPTH = -26;
const LAYER_DEPTH_BASE = -20; // LAYER_DEPTH_BASE + layerIndex。全ステージ 2 層なので実際は -20/-19 のみ。地形(0)等より必ず背面。
const SKY_SCROLL_FACTOR = 0.1; // 空はほぼ固定(横方向は一様なので体感は奥行きのみ)
const ATMOSPHERE_SCROLL_FACTOR = 0.18;
const SKY_TOP_Y = -200; // 画面上に余白を持たせ、縦リサイズでも空が切れないようにする
const SKY_BANDS = 32; // グラデーションを近似する横帯の数

/**
 * ステージ背景を描画し、生成した GameObject 群を返す(呼び出し側が必要なら破棄に使える)。
 * 通常はシーン再生成時に表示リストごと破棄されるため、保持は不須。
 */
export function paintStageBackground(
  scene: Phaser.Scene,
  theme: StageBackgroundTheme,
  worldWidth: number,
  groundY: number,
): Phaser.GameObjects.GameObject[] {
  const created: Phaser.GameObjects.GameObject[] = [];

  // 1) 空グラデーション(縦バンドで skyTop→skyBottom を線形補間)。
  const sky = scene.add.graphics();
  sky.setDepth(SKY_DEPTH).setScrollFactor(SKY_SCROLL_FACTOR);
  drawSkyGradient(sky, worldWidth, groundY, theme);
  created.push(sky);

  // 2) 地平線付近の靄と発光線。暗さを保ったままステージ色を一段立たせる。
  const atmosphere = scene.add.graphics();
  atmosphere.setDepth(ATMOSPHERE_DEPTH).setScrollFactor(ATMOSPHERE_SCROLL_FACTOR);
  drawAtmosphere(atmosphere, worldWidth, groundY, theme);
  created.push(atmosphere);

  // 3) レイヤー(奥→手前)を手続きシルエットで描く。
  theme.layers.forEach((layer, i) => {
    const g = scene.add.graphics();
    g.setDepth(LAYER_DEPTH_BASE + i).setScrollFactor(layer.scrollFactor);
    drawLayer(g, layer, worldWidth, groundY, theme, i);
    created.push(g);
  });

  return created;
}

/** 空グラデーションを横帯の集合で描く(WebGL/Canvas 双方で動く)。 */
function drawSkyGradient(
  g: Phaser.GameObjects.Graphics,
  worldWidth: number,
  groundY: number,
  theme: StageBackgroundTheme,
): void {
  const top = hexToNum(theme.skyTop);
  const bottom = hexToNum(theme.skyBottom);
  const horizonY = groundY; // 地平線=地面上端。ここまでをグラデーションにする
  const bandH = (horizonY - SKY_TOP_Y) / SKY_BANDS;
  for (let i = 0; i < SKY_BANDS; i++) {
    const t = i / (SKY_BANDS - 1);
    g.fillStyle(lerpColor(top, bottom, t), 1);
    // 帯を僅かに重ねて継ぎ目を消す。
    g.fillRect(0, SKY_TOP_Y + i * bandH, worldWidth, bandH + 1);
  }
  // 地平線より下(奈落・地面裏)は skyBottom で塗っておく(カメラ背景色の保険)。
  g.fillStyle(bottom, 1);
  g.fillRect(0, horizonY, worldWidth, 240);
}

/** 地平線の靄と、ステージのアクセント色に寄せた薄い光の筋。 */
function drawAtmosphere(
  g: Phaser.GameObjects.Graphics,
  worldWidth: number,
  groundY: number,
  theme: StageBackgroundTheme,
): void {
  const accent = hexToNum(theme.accent);
  const bottom = hexToNum(theme.skyBottom);

  for (let i = 0; i < 4; i++) {
    const y = groundY - 112 + i * 24;
    g.fillStyle(bottom, 0.1 - i * 0.012);
    g.fillRect(0, y, worldWidth, 18);
  }

  g.lineStyle(2, accent, 0.18);
  g.lineBetween(0, groundY - 6, worldWidth, groundY - 6);
  g.lineStyle(1, accent, 0.08);
  g.lineBetween(0, groundY - 42, worldWidth, groundY - 42);

  const glowStep = Math.max(220, Math.floor(worldWidth / 8));
  for (let x = glowStep / 2; x < worldWidth; x += glowStep) {
    drawGlow(g, x, groundY - 88, 36, accent);
  }
}

/** 1レイヤーを種別に応じて描く。 */
function drawLayer(
  g: Phaser.GameObjects.Graphics,
  layer: BackgroundLayerTheme,
  worldWidth: number,
  groundY: number,
  theme: StageBackgroundTheme,
  layerIndex: number,
): void {
  const columns = generateSilhouetteColumns(layer, worldWidth, theme.seed + layerIndex);
  const fill = hexToNum(layer.color);
  const accent = hexToNum(theme.accent);
  switch (layer.shape) {
    case 'ruinedCity':
      drawRuinedCity(g, columns, groundY, fill, accent, layerIndex);
      break;
    case 'shaftTown':
      drawShaftTown(g, columns, groundY, fill, accent);
      break;
    case 'facility':
      drawFacility(g, columns, groundY, fill, accent);
      break;
    case 'wasteland':
      drawWasteland(g, columns, worldWidth, groundY, fill, accent, layerIndex);
      break;
    case 'outerWorks':
      drawOuterWorks(g, columns, groundY, fill, accent);
      break;
    case 'core':
      drawCore(g, columns, groundY, fill, accent);
      break;
  }
}

/** 柔らかい発光グロー(同心円・外側ほど淡い)。 */
function drawGlow(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  color: number,
): void {
  g.fillStyle(color, 0.1);
  g.fillCircle(x, y, r);
  g.fillStyle(color, 0.18);
  g.fillCircle(x, y, r * 0.6);
  g.fillStyle(color, 0.35);
  g.fillCircle(x, y, r * 0.3);
}

/** stage1: 崩れたビル群。各列を高低 2 ブロックに割り、頂部をギザギザにする。窓灯を点す。 */
function drawRuinedCity(
  g: Phaser.GameObjects.Graphics,
  columns: SilhouetteColumn[],
  groundY: number,
  fill: number,
  accent: number,
  layerIndex: number,
): void {
  columns.forEach((c, i) => {
    const leftW = c.width * 0.55;
    const rightW = c.width - leftW;
    const hL = c.height;
    const hR = c.height * 0.68; // 崩れて低い側
    g.fillStyle(fill, 1);
    g.fillRect(c.x, groundY - hL, leftW, hL);
    g.fillRect(c.x + leftW, groundY - hR, rightW, hR);
    // 手前レイヤーの一部のビルにだけ、まばらな窓灯(琥珀)を点す。
    if (layerIndex > 0 && i % 3 === 0) {
      drawWindows(g, c.x + 4, groundY - hL + 8, leftW - 8, hL - 16, accent);
    }
  });
}

/** 窓灯のグリッド(まばら)。 */
function drawWindows(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: number,
): void {
  if (w < 10 || h < 10) return;
  const cell = 16;
  g.fillStyle(accent, 0.5);
  for (let wy = y; wy < y + h; wy += cell) {
    for (let wx = x; wx < x + w; wx += cell) {
      // 市松状に間引いて「いくつかの部屋だけ灯る」見た目に。
      if (((wx / cell) | 0) % 2 === ((wy / cell) | 0) % 2) {
        g.fillRect(wx, wy, 4, 6);
      }
    }
  }
}

/** stage2: 立坑の鉄骨。縦ビーム 2 本 + 横ストラットで足場やぐらを表す。上端に作業灯。 */
function drawShaftTown(
  g: Phaser.GameObjects.Graphics,
  columns: SilhouetteColumn[],
  groundY: number,
  fill: number,
  accent: number,
): void {
  columns.forEach((c, i) => {
    const top = groundY - c.height;
    const beamW = Math.max(4, c.width * 0.12);
    const leftX = c.x + c.width * 0.18;
    const rightX = c.x + c.width * 0.7;
    g.fillStyle(fill, 1);
    // 縦ビーム 2 本
    g.fillRect(leftX, top, beamW, c.height);
    g.fillRect(rightX, top, beamW, c.height);
    // 横ストラット(やぐらの段)
    for (let y = top + 40; y < groundY; y += 64) {
      g.fillRect(leftX, y, rightX - leftX + beamW, Math.max(3, beamW * 0.6));
    }
    // 一部のやぐら頭頂に冷たい作業灯。
    if (i % 2 === 0) {
      drawGlow(g, leftX + beamW / 2, top + 4, 10, accent);
    }
  });
}

/** stage3: 収容施設。等間隔の収容パネル + 上端の発光ライン + 監視灯の一列。 */
function drawFacility(
  g: Phaser.GameObjects.Graphics,
  columns: SilhouetteColumn[],
  groundY: number,
  fill: number,
  accent: number,
): void {
  columns.forEach((c) => {
    const top = groundY - c.height;
    g.fillStyle(fill, 1);
    g.fillRect(c.x, top, c.width, c.height);
    // 上端の冷たい発光ライン(人工照明)。
    g.fillStyle(accent, 0.4);
    g.fillRect(c.x, top, c.width, 2);
    g.fillStyle(accent, 0.12);
    g.fillRect(c.x, top + 5, c.width, 1);
    // 監視灯の一列(等間隔のドット)。
    const lampY = top + c.height * 0.35;
    g.fillStyle(accent, 0.6);
    for (let lx = c.x + 14; lx < c.x + c.width - 8; lx += 28) {
      g.fillCircle(lx, lampY, 2.2);
    }
  });
}

/** stage4: 汚染地帯。低く崩れた枯れ構造物 + 横たなびく毒の靄(緑の半透明帯)。 */
function drawWasteland(
  g: Phaser.GameObjects.Graphics,
  columns: SilhouetteColumn[],
  worldWidth: number,
  groundY: number,
  fill: number,
  accent: number,
  layerIndex: number,
): void {
  columns.forEach((c, i) => {
    // 不揃いに崩れたスタンプ状(2 段の段差)。
    const h1 = c.height;
    const h2 = c.height * (0.4 + (i % 3) * 0.12);
    const w1 = c.width * 0.6;
    g.fillStyle(fill, 1);
    g.fillRect(c.x, groundY - h1, w1, h1);
    g.fillRect(c.x + w1, groundY - h2, c.width - w1, h2);
  });
  // 手前レイヤーにだけ、地表付近を漂う毒の靄を数本重ねる。
  if (layerIndex > 0) {
    for (let k = 0; k < 3; k++) {
      const y = groundY - 40 - k * 26;
      g.fillStyle(accent, 0.06);
      g.fillRect(0, y, worldWidth, 18);
    }
  }
}

/** stage5: ECLIPSE外縁部。高密度の角張った機械ブロック + 上に小段 + 縦の通気スリット光。 */
function drawOuterWorks(
  g: Phaser.GameObjects.Graphics,
  columns: SilhouetteColumn[],
  groundY: number,
  fill: number,
  accent: number,
): void {
  columns.forEach((c, i) => {
    const top = groundY - c.height;
    g.fillStyle(fill, 1);
    g.fillRect(c.x, top, c.width, c.height);
    // 上面に一段低いブロックを載せて機械的な段差を作る。
    const capW = c.width * 0.5;
    const capH = Math.min(40, c.height * 0.2);
    g.fillRect(c.x + c.width * 0.25, top - capH, capW, capH);
    // 一部に冷たい青の通気スリット光(縦)。
    if (i % 2 === 0) {
      g.fillStyle(accent, 0.5);
      g.fillRect(c.x + c.width * 0.5 - 1, top + 12, 2, Math.min(60, c.height - 24));
      g.fillStyle(accent, 0.16);
      g.fillRect(c.x + c.width * 0.5 - 4, top + 12, 8, Math.min(60, c.height - 24));
    }
  });
}

/** stage6: 支配中枢。背の高いモノリスを疎に立て、合間に不吉なコアの赤グローを脈打たせる。 */
function drawCore(
  g: Phaser.GameObjects.Graphics,
  columns: SilhouetteColumn[],
  groundY: number,
  fill: number,
  accent: number,
): void {
  columns.forEach((c, i) => {
    const top = groundY - c.height;
    const w = c.width * 0.5; // 細く高いモノリス
    g.fillStyle(fill, 1);
    g.fillRect(c.x + (c.width - w) / 2, top, w, c.height);
    // モノリスの合間に、地平付近で脈打つコアの赤光。
    if (i % 2 === 1) {
      drawGlow(g, c.x + c.width, groundY - c.height * 0.4, 60, accent);
    }
    if (i % 3 === 0) {
      g.lineStyle(2, accent, 0.25);
      g.lineBetween(c.x + c.width / 2, top + 18, c.x + c.width / 2, groundY - 24);
    }
  });
}
