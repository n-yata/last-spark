import { test, expect } from '@playwright/test';
import { startGame } from '../_helpers';

// 高DPI(Retina)対応の検証。
// 鮮明化のため、canvas のバッキング解像度(属性 width/height = 描画ピクセル数)を
// deviceScaleFactor 倍へ引き上げる一方、CSS 表示サイズ(style.width/height = px)は
// 物理画面サイズに保つ。これにより「見た目の大きさは不変・描画は高精細」を実現する。
//
// このスペックは deviceScaleFactor=2 のページで、
//   - canvas.width(描画px) が CSS表示幅の概ね2倍
//   - canvas.style.width(CSS px) が deviceScaleFactor に依存しない表示幅
// であることを主アサーションとし、ゲームが進行可能であることを軽く確認する。
test.use({
  deviceScaleFactor: 2,
  viewport: { width: 900, height: 400 }, // 横向き(ランドスケープ)相当
  isMobile: true,
  hasTouch: true,
});

test('deviceScaleFactor=2 で canvas バッキング解像度が表示幅の約2倍・CSS幅は等倍', async ({
  page,
}) => {
  await page.goto('/');
  await startGame(page);

  const metrics = await page.locator('#game-root canvas').evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    return {
      attrWidth: canvas.width, // 描画バッキング解像度(物理px)
      attrHeight: canvas.height,
      cssWidth: parseFloat(canvas.style.width) || rect.width, // CSS 表示幅(px)
      cssHeight: parseFloat(canvas.style.height) || rect.height,
      rectWidth: rect.width,
      devicePixelRatio: window.devicePixelRatio,
    };
  });

  // ブラウザが deviceScaleFactor=2 を反映していることの前提確認。
  expect(metrics.devicePixelRatio).toBeGreaterThanOrEqual(2);

  // 主アサーション1: バッキング解像度が CSS 表示幅の概ね2倍(高精細化されている)。
  // 端数・端ピクセルの誤差を許容し 1.9 倍を下限とする。
  expect(metrics.attrWidth).toBeGreaterThanOrEqual(metrics.cssWidth * 1.9);
  expect(metrics.attrHeight).toBeGreaterThanOrEqual(metrics.cssHeight * 1.9);

  // 主アサーション2: CSS 表示幅は deviceScaleFactor 非依存で物理画面幅(=ビューポート900)に等しい。
  // (もし style.width まで2倍になっていれば見た目が巨大化してしまう=回帰)
  expect(metrics.cssWidth).toBeGreaterThanOrEqual(900 - 2);
  expect(metrics.cssWidth).toBeLessThanOrEqual(900 + 2);

  // 描画px(attrWidth)は表示幅(900)の約2倍 ≒ 1800 付近に来る。
  expect(metrics.attrWidth).toBeGreaterThanOrEqual(900 * 1.9);
});

test('高DPI でもゲームが進行可能(右入力でプレイヤーが前進する)', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  const getX = () =>
    page.evaluate(() => {
      const s = window.lastSpark!.scene.getScene('GameScene') as unknown as {
        player?: { x: number };
      };
      return s.player?.x ?? -1;
    });

  const beforeX = await getX();
  expect(beforeX).toBeGreaterThanOrEqual(0); // player が存在し座標を持つ

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');

  const afterX = await getX();
  expect(afterX).toBeGreaterThan(beforeX); // 高DPI環境でも前進できる
});
