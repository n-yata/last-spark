// RAY 横向きキービジュアル(art-src/ray-side.png)を、カットアウト・リグ用の4パーツ
// (上半身 / 前腕キャノン / 前脚 / 後脚)へ切り分けるアセットパイプライン。
// 腕も脚も胴と地続きなので矩形では切れない。アルファを走査し、
//  - 脚: 行ごとに左クラスタ=後脚 / 右クラスタ=前脚 のマスクで分離
//  - 前腕: 肩より前(右)へ突き出た「腕の帯」の張り出し部分だけをマスクで分離
// し、本体(上半身)からはそれらの画素を除いて二重描画(ゴースト)を防ぐ。
// 併せてキャノン先端(発射位置)も検出して records に出す。
// 出力: public/assets/characters/parts/*.webp(lossless) + console に幾何(records)。
// 一時依存 sharp(npm i sharp --no-save)。再生成専用・CI 不要。

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
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
const rightX = (y) => { const r = rowRuns(y); return r.length ? r[r.length - 1][1] : -1; };

let minX = W, maxX = 0, minY = H, maxY = 0;
for (let y = 0; y < H; y++) {
  const runs = rowRuns(y);
  if (!runs.length) continue;
  minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  for (const [a, b] of runs) { minX = Math.min(minX, a); maxX = Math.max(maxX, b); }
}
const figH = maxY - minY;
const cx = (minX + maxX) / 2;

let splitY = -1;
for (let y = minY + Math.floor(figH * 0.45); y <= maxY; y++) {
  const big = rowRuns(y).filter(([a, b]) => b - a >= 12).sort((p, q) => p[0] - q[0]);
  if (big.length >= 2 && big[1][0] - big[0][1] >= 6) { splitY = y; break; }
}
if (splitY < 0) splitY = minY + Math.floor(figH * 0.55);

// --- 前腕(キャノン)の帯を検出 ---
const cannonTipX = (() => { let m = 0; for (let y = minY; y <= splitY; y++) m = Math.max(m, rightX(y)); return m; })();
// 腕(キャノン)の帯 = rightX が胴前縁より十分突出する連続行。
const armThresh = cx + (cannonTipX - cx) * 0.35;
let armTop = -1, armBot = -1;
for (let y = minY; y <= splitY; y++) {
  if (rightX(y) >= armThresh) { if (armTop < 0) armTop = y; armBot = y; }
}
// 胴前縁(=肩の付け根x): 腕帯のテーパーを拾わないよう、帯から十分離れた腹部(armBot+30以降)と
// 胸(armTopの少し上)の安定領域から取る。
let torsoFrontX = 0;
for (let y = armBot + 30; y <= splitY; y++) torsoFrontX = Math.max(torsoFrontX, rightX(y));
if (armTop - 8 >= minY) torsoFrontX = Math.max(torsoFrontX, rightX(armTop - 8));
const shoulderX = torsoFrontX;
const ARM_OVERLAP = 18;
const armLeft = Math.max(minX, shoulderX - ARM_OVERLAP);
const isArmPixel = (x, y) => y >= armTop && y <= armBot && x >= armLeft;

function buildMasked(pred) {
  let lMinX = W, lMaxX = 0, lMinY = H, lMaxY = 0;
  for (let y = minY; y <= maxY; y++) for (const [a, b] of rowRuns(y)) for (let x = a; x <= b; x++) {
    if (!pred(x, y)) continue;
    lMinX = Math.min(lMinX, x); lMaxX = Math.max(lMaxX, x); lMinY = Math.min(lMinY, y); lMaxY = Math.max(lMaxY, y);
  }
  const w = lMaxX - lMinX + 1, h = lMaxY - lMinY + 1;
  const buf = Buffer.alloc(w * h * 4, 0);
  for (let y = lMinY; y <= lMaxY; y++) for (const [a, b] of rowRuns(y)) for (let x = a; x <= b; x++) {
    if (!pred(x, y)) continue;
    const s = (y * W + x) * C, d = ((y - lMinY) * w + (x - lMinX)) * 4;
    buf[d] = data[s]; buf[d + 1] = data[s + 1]; buf[d + 2] = data[s + 2]; buf[d + 3] = data[s + 3];
  }
  return { left: lMinX, top: lMinY, width: w, height: h, buf };
}

const legPred = (side) => (x, y) => {
  if (y < splitY) return false;
  for (const [a, b] of rowRuns(y)) if (x >= a && x <= b) return (((a + b) / 2 < cx) === (side === 'back'));
  return false;
};
const hipOf = (leg, side) => {
  const top = rowRuns(leg.top).filter(([a, b]) => (((a + b) / 2 < cx) === (side === 'back')));
  const hx = top.length ? Math.round((top[0][0] + top[top.length - 1][1]) / 2) : Math.round(leg.left + leg.width / 2);
  return { hipX: hx, hipY: leg.top };
};

const legBack = buildMasked(legPred('back')); const lb = hipOf(legBack, 'back');
const legFront = buildMasked(legPred('front')); const lf = hipOf(legFront, 'front');
const armFront = buildMasked(isArmPixel);
const BODY_OVERLAP = 16;
const bodyBottom = splitY + BODY_OVERLAP;
const body = buildMasked((x, y) => y <= bodyBottom && !isArmPixel(x, y));

await mkdir(OUT_DIR, { recursive: true });
const save = (p, name) => sharp(p.buf, { raw: { width: p.width, height: p.height, channels: 4 } }).webp({ lossless: true }).toFile(join(OUT_DIR, name));
await save(body, 'ray-body.webp');
await save(armFront, 'ray-arm-front.webp');
await save(legFront, 'ray-leg-front.webp');
await save(legBack, 'ray-leg-back.webp');

const muzzle = { x: cannonTipX, y: Math.round((armTop + armBot) / 2) };
const strip = (p, extra = {}) => ({ left: p.left, top: p.top, width: p.width, height: p.height, ...extra });
const records = {
  bbox: { minX, maxX, minY, maxY }, splitY, cx: Math.round(cx),
  body: strip(body),
  armFront: strip(armFront, { shoulderX, shoulderY: Math.round((armTop + armBot) / 2) }),
  legFront: strip(legFront, lf),
  legBack: strip(legBack, lb),
  muzzle,
};
console.log(JSON.stringify(records, null, 2));
