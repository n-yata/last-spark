// RAY 横向きキービジュアル(public/assets/characters/ray-side.png)を、カットアウト・リグ用の
// 3パーツ(上半身 / 前脚 / 後脚)へ切り分けるアセットパイプライン。
// 脚は股で交差するため矩形では分離できない。アルファを行ごとに走査し、
// 「左クラスタ=後脚 / 右クラスタ=前脚」だけを残すマスクで塗り分けてから切り出す。
// 出力: public/assets/characters/parts/{ray-body,ray-leg-front,ray-leg-back}.png と
// 組み立て/関節ピボット情報の records.json(SpriteRig 用の単一の真実)。
//
// 一時依存 sharp を使う(npm i sharp --no-save)。再生成専用・CI 不要のスクリプト。

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// ソース絵は art-src/(非配布)。出力パーツのみ public/ へ(WebP・ゲームが load.image する)。
const SRC = join(ROOT, 'art-src/ray-side.png');
const OUT_DIR = join(ROOT, 'public/assets/characters/parts');
const ALPHA = 40;

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const aAt = (x, y) => data[(y * W + x) * C + 3];

function rowRuns(y) {
  const runs = [];
  let start = -1;
  for (let x = 0; x < W; x++) {
    const op = aAt(x, y) >= ALPHA;
    if (op && start < 0) start = x;
    else if (!op && start >= 0) { runs.push([start, x - 1]); start = -1; }
  }
  if (start >= 0) runs.push([start, W - 1]);
  return runs.filter(([a, b]) => b - a >= 4);
}

// 全体 bbox
let minX = W, maxX = 0, minY = H, maxY = 0;
for (let y = 0; y < H; y++) {
  const runs = rowRuns(y);
  if (!runs.length) continue;
  minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  for (const [a, b] of runs) { minX = Math.min(minX, a); maxX = Math.max(maxX, b); }
}
const figH = maxY - minY;
const cx = (minX + maxX) / 2;

// 脚が明確に2本へ割れる最初の行(clean split)。胴の余白(腕の隙間)を拾わないよう中央より下から。
let splitY = -1;
for (let y = minY + Math.floor(figH * 0.45); y <= maxY; y++) {
  const big = rowRuns(y).filter(([a, b]) => b - a >= 12);
  if (big.length >= 2) {
    const sorted = big.sort((p, q) => p[0] - q[0]);
    const gap = sorted[1][0] - sorted[0][1];
    if (gap >= 6) { splitY = y; break; }
  }
}
if (splitY < 0) splitY = minY + Math.floor(figH * 0.55);

// 脚マスク: 各行で run を左右に振り分け、片脚ぶんだけを別バッファへコピー。
// side='back'(左, mid<cx) / 'front'(右, mid>=cx)。
function buildLeg(side) {
  // pass1: bbox
  let lMinX = W, lMaxX = 0, lMinY = H, lMaxY = 0;
  for (let y = splitY; y <= maxY; y++) {
    for (const [a, b] of rowRuns(y)) {
      const mid = (a + b) / 2;
      const isBack = mid < cx;
      if ((side === 'back') !== isBack) continue;
      lMinX = Math.min(lMinX, a); lMaxX = Math.max(lMaxX, b);
      lMinY = Math.min(lMinY, y); lMaxY = Math.max(lMaxY, y);
    }
  }
  const w = lMaxX - lMinX + 1, h = lMaxY - lMinY + 1;
  const buf = Buffer.alloc(w * h * 4, 0); // 透明で初期化
  for (let y = lMinY; y <= lMaxY; y++) {
    for (const [a, b] of rowRuns(y)) {
      const mid = (a + b) / 2;
      const isBack = mid < cx;
      if ((side === 'back') !== isBack) continue;
      for (let x = a; x <= b; x++) {
        const s = (y * W + x) * C, d = ((y - lMinY) * w + (x - lMinX)) * 4;
        buf[d] = data[s]; buf[d + 1] = data[s + 1]; buf[d + 2] = data[s + 2]; buf[d + 3] = data[s + 3];
      }
    }
  }
  // 股関節ピボット: この脚の最上行の中心x。
  const topRun = rowRuns(lMinY).filter(([a, b]) => ((a + b) / 2 < cx) === (side === 'back'));
  const hipX = topRun.length ? Math.round((topRun[0][0] + topRun[topRun.length - 1][1]) / 2) : Math.round((lMinX + lMaxX) / 2);
  return { side, left: lMinX, top: lMinY, width: w, height: h, hipX, hipY: lMinY, buf };
}

const back = buildLeg('back');
const front = buildLeg('front');

// 上半身: bbox 上端〜脚分岐(少し食い込ませて接合)。
const BODY_OVERLAP = 16;
const bodyRect = { left: minX, top: minY, width: maxX - minX + 1, height: splitY + BODY_OVERLAP - minY };

await mkdir(OUT_DIR, { recursive: true });
// パーツは WebP(lossless=アルファ境界を保つ)。ゲームが load.image で読む。
await sharp(SRC).extract({ left: bodyRect.left, top: bodyRect.top, width: bodyRect.width, height: bodyRect.height }).webp({ lossless: true }).toFile(join(OUT_DIR, 'ray-body.webp'));
const saveLeg = (leg, name) =>
  sharp(leg.buf, { raw: { width: leg.width, height: leg.height, channels: 4 } }).webp({ lossless: true }).toFile(join(OUT_DIR, name));
await saveLeg(front, 'ray-leg-front.webp');
await saveLeg(back, 'ray-leg-back.webp');

// 切り分け幾何。src/config/raySprite.ts の RAY_GEOM はこの出力に同期させること(実行時 fetch しない)。
const strip = ({ left, top, width, height, hipX, hipY }) => ({ left, top, width, height, hipX, hipY });
const records = {
  src: { width: W, height: H }, bbox: { minX, maxX, minY, maxY }, splitY,
  body: bodyRect, legFront: strip(front), legBack: strip(back),
};
console.log(JSON.stringify(records, null, 2));
