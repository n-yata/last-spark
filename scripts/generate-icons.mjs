// PWA アイコン生成スクリプト(ビルド成果物ではなく開発補助)。
// 外部依存なしで、ブランドカラー(暗め基調 + 発光アクセント)の
// 「最後の灯(spark)」を表す円形アイコン PNG を生成する。
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// CRC32(PNG チャンク用)
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 各スキャンラインの先頭にフィルタバイト 0 を付与
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function drawIcon(size, sparkScale) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const coreR = size * 0.16 * sparkScale;
  const glowR = size * 0.34 * sparkScale;
  // 背景色 #0a0e14
  const bg = [10, 14, 20];
  // 発光色 #37f7d8
  const neon = [55, 247, 216];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      let r = bg[0];
      let g = bg[1];
      let b = bg[2];
      if (d <= glowR) {
        // グロー(外周ほど淡く)
        const t = Math.max(0, 1 - d / glowR);
        const k = t * t;
        r = Math.round(bg[0] + (neon[0] - bg[0]) * k);
        g = Math.round(bg[1] + (neon[1] - bg[1]) * k);
        b = Math.round(bg[2] + (neon[2] - bg[2]) * k);
      }
      if (d <= coreR) {
        // コア(明るい中心)
        r = 220;
        g = 255;
        b = 245;
      }
      const i = (y * size + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, rgba);
}

writeFileSync(join(outDir, 'icon-192.png'), drawIcon(192, 1));
writeFileSync(join(outDir, 'icon-512.png'), drawIcon(512, 1));
// maskable はセーフゾーン考慮で spark を小さめに
writeFileSync(join(outDir, 'icon-512-maskable.png'), drawIcon(512, 0.7));
console.log('icons generated in', outDir);
