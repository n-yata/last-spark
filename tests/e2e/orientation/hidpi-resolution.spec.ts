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

// 回帰防止(タッチ判定の y ズレ): 高DPIで論理サイズを物理px化(scale.mode=NONE)した際、
// canvas.style を手動で書き換えると ScaleManager の displayScale/canvasBounds が
// 実態(dpr)とズレ、pointer 変換が CSS px のままになる → タッチ判定が表示より上にズレる。
//
// 旧実装(canvas.style 手書き)では displayScale≈1 になっていたため、本テストの
// displayScale ガードが赤になる。現実装(setZoom(1/dpr)+resize)では ScaleManager が
// canvas.style と displayScale(=dpr) を一貫管理するため緑になる = 回帰検出力がある。

// ScaleManager の内部値だけを必要な分だけ抜き出す(型はテストコードにつき緩めてよい)。
type ScaleProbe = {
  displayScaleX: number;
  displayScaleY: number;
  baseSizeHeight: number;
  canvasBoundsHeight: number;
  devicePixelRatio: number;
};

function readScaleProbe(page: import('@playwright/test').Page): Promise<ScaleProbe> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sm = (window as any).lastSpark.scale;
    return {
      displayScaleX: sm.displayScale.x,
      displayScaleY: sm.displayScale.y,
      baseSizeHeight: sm.baseSize.height,
      canvasBoundsHeight: sm.canvasBounds.height,
      devicePixelRatio: window.devicePixelRatio,
    };
  });
}

test('決定的ガード: ScaleManager の displayScale が devicePixelRatio(=2) に一致する', async ({
  page,
}) => {
  await page.goto('/');
  await startGame(page);

  const probe = await readScaleProbe(page);

  // 前提: ブラウザが deviceScaleFactor=2 を反映している。
  expect(probe.devicePixelRatio).toBeGreaterThanOrEqual(2);

  // 主アサーション: displayScale(=baseSize/canvasBounds) が dpr に概ね一致する。
  // 旧バグ(canvas.style 手書き)では displayScale≈1 となり、ここで確実に落ちる。
  expect(probe.displayScaleY).toBeGreaterThanOrEqual(1.9);
  expect(probe.displayScaleY).toBeLessThanOrEqual(2.1);
  expect(probe.displayScaleX).toBeGreaterThanOrEqual(1.9);
  expect(probe.displayScaleX).toBeLessThanOrEqual(2.1);

  // 補足アサーション: baseSize(論理=物理px) / canvasBounds(CSS px) も dpr 近傍。
  // displayScale の導出元が壊れていないことを別経路で裏取りする。
  const boundsRatio = probe.baseSizeHeight / probe.canvasBoundsHeight;
  expect(boundsRatio).toBeGreaterThanOrEqual(1.9);
  expect(boundsRatio).toBeLessThanOrEqual(2.1);
});

test('挙動ガード: タッチ原点 y が物理px化される(CSS y × dpr に一致)', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  const dpr = (await readScaleProbe(page)).devicePixelRatio;

  // 移動ゾーンは画面左半分(x 座標のみで判定)なので、左下寄りの CSS 座標を触れば確実に入る。
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const cssX = Math.round(viewport!.width * 0.25);
  const cssY = Math.round(viewport!.height * 0.6);

  // tap(down→up) は publish フレームを逃しうるため、down を保持したまま読む。
  // publishMovePad は GameScene.update 毎フレームで active=true の間だけ baseY を書く。
  // InputController.onPointerUp は moveOrigin をリセットしないが registry publish は
  // active 中のみ。よって down 中に registry を読むのが確実。
  await page.mouse.move(cssX, cssY);
  await page.mouse.down();
  try {
    // パッドが active になり baseY が publish されるまで待つ(down 保持中に毎フレーム書かれる)。
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const scene = (window as any).lastSpark.scene.getScene('GameScene');
            return scene.registry.get('hud.movepad.active') === true;
          }),
        { timeout: 5_000 },
      )
      .toBe(true);
    // 確定後に baseY を読む(poll は真偽確認のみで値を返さないため別途取得)。
    const padBaseY = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scene = (window as any).lastSpark.scene.getScene('GameScene');
      return scene.registry.get('hud.movepad.baseY') as number;
    });

    // 期待: 原点 y は物理px(= CSS y × dpr)。旧バグでは CSS y のまま(≈半分)になる。
    const expected = cssY * dpr;
    expect(padBaseY).toBeGreaterThanOrEqual(expected - 8);
    expect(padBaseY).toBeLessThanOrEqual(expected + 8);
  } finally {
    await page.mouse.up();
  }
});
