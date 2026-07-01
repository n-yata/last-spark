import { test, expect, type Page } from '@playwright/test';
import { startGame, waitForScene } from '../_helpers';

// 回帰防止(dpr=1 のリサイズ追従): scale.mode=NONE + systems/dprScaling の構成で、
// 旧実装は setZoom(1/dpr) → resize() の順だったため、
//   - setZoom() が _resetZoom 経由で「旧 gameSize 基準」の canvas.style を書き、
//   - resize() は zoom===1 のとき canvas.style を書き換えない(Phaser ScaleManager は
//     styleWidth !== width の場合のみ style を更新する)
// の合わせ技で、dpr=1 環境ではビューポート変更後に canvas の内部解像度(scale.width)だけが
// 追従し、CSS 表示サイズ(style.width)が古いまま残って表示がはみ出していた。
// dpr>1(モバイル)では resize() 側が style を書くため顕在化しない=デスクトップ特有の回帰。
//
// このスペックは deviceScaleFactor=1 でロード後にビューポートを変更し、
//   1) canvas の CSS 表示サイズが新ビューポートに一致する(決定的ガード)
//   2) リサイズ後もポインタ座標変換が表示と一致する(挙動ガード)
// を検証する。あわせて dpr=2 でも同じリサイズ追従が保たれることを確認する。

/** canvas の表示・解像度メトリクスを読む(style 未設定時は rect にフォールバック)。 */
function readCanvasMetrics(page: Page) {
  return page.locator('#game-root canvas').evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    return {
      attrWidth: canvas.width, // バッキング解像度(物理px)
      attrHeight: canvas.height,
      cssWidth: parseFloat(canvas.style.width) || rect.width, // CSS 表示幅(px)
      cssHeight: parseFloat(canvas.style.height) || rect.height,
      rectWidth: rect.width, // 実測の表示幅(px)
      rectHeight: rect.height,
    };
  });
}

test.describe('dpr=1 (デスクトップ相当)', () => {
  test.use({ deviceScaleFactor: 1, viewport: { width: 900, height: 400 } });

  test('決定的ガード: リサイズ後に canvas の CSS 表示サイズがビューポートへ追従する', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForScene(page, 'TitleScene');

    // リサイズ前の前提確認: dpr=1 なので バッキング解像度 = CSS 表示サイズ = ビューポート。
    const before = await readCanvasMetrics(page);
    expect(before.rectWidth).toBeGreaterThanOrEqual(900 - 2);
    expect(before.rectWidth).toBeLessThanOrEqual(900 + 2);

    // ビューポートを変更(横長を維持し、縦持ちガードの介入を避ける)。
    await page.setViewportSize({ width: 780, height: 420 });

    // resize イベント処理(window/visualViewport 両リスナー)の収束を poll で待つ。
    // 旧バグでは attrWidth(内部解像度)だけ 780 になり rectWidth が古いまま残る。
    await expect
      .poll(async () => (await readCanvasMetrics(page)).rectWidth, { timeout: 5_000 })
      .toBeLessThanOrEqual(780 + 2);

    const after = await readCanvasMetrics(page);
    // 主アサーション: CSS 表示サイズ(実測)が新ビューポートに一致(はみ出し・黒帯なし)。
    expect(after.rectWidth).toBeGreaterThanOrEqual(780 - 2);
    expect(after.rectHeight).toBeGreaterThanOrEqual(420 - 2);
    expect(after.rectHeight).toBeLessThanOrEqual(420 + 2);
    // 内部解像度も追従している(dpr=1 なので CSS 表示サイズと等倍)。
    expect(after.attrWidth).toBeGreaterThanOrEqual(780 - 2);
    expect(after.attrWidth).toBeLessThanOrEqual(780 + 2);
    // style と実測が一致(style だけ古い値で残っていない)。
    expect(Math.abs(after.cssWidth - after.rectWidth)).toBeLessThanOrEqual(2);
  });

  test('挙動ガード: リサイズ後もタッチ座標変換が表示と一致する(移動パッド原点)', async ({
    page,
  }) => {
    await page.goto('/');
    await startGame(page);

    // プレイ中にビューポートを変更(横長を維持)。
    await page.setViewportSize({ width: 800, height: 440 });
    await expect
      .poll(async () => (await readCanvasMetrics(page)).rectWidth, { timeout: 5_000 })
      .toBeLessThanOrEqual(800 + 2);

    // 移動ゾーン(画面左半分)の CSS 座標を押し、publish される原点 y を読む。
    // dpr=1 では物理px = CSS px なので、baseY ≈ cssY になるはず。
    // 座標変換が古い canvasBounds のままだと baseY がズレて表示と操作が食い違う。
    const cssX = Math.round(800 * 0.25);
    const cssY = Math.round(440 * 0.6);
    await page.mouse.move(cssX, cssY);
    await page.mouse.down();
    try {
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
      const padBaseY = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scene = (window as any).lastSpark.scene.getScene('GameScene');
        return scene.registry.get('hud.movepad.baseY') as number;
      });
      expect(padBaseY).toBeGreaterThanOrEqual(cssY - 8);
      expect(padBaseY).toBeLessThanOrEqual(cssY + 8);
    } finally {
      await page.mouse.up();
    }
  });
});

test.describe('dpr=2 (モバイル相当) の非回帰', () => {
  test.use({ deviceScaleFactor: 2, viewport: { width: 900, height: 400 } });

  test('リサイズ後も CSS 表示サイズが追従し、バッキング解像度は約2倍を保つ', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForScene(page, 'TitleScene');

    await page.setViewportSize({ width: 780, height: 420 });
    await expect
      .poll(async () => (await readCanvasMetrics(page)).rectWidth, { timeout: 5_000 })
      .toBeLessThanOrEqual(780 + 2);

    const after = await readCanvasMetrics(page);
    expect(after.rectWidth).toBeGreaterThanOrEqual(780 - 2);
    // 高DPI: バッキング解像度は CSS 表示幅の概ね2倍(hidpi-resolution.spec.ts と同じ基準)。
    expect(after.attrWidth).toBeGreaterThanOrEqual(after.rectWidth * 1.9);
  });
});
