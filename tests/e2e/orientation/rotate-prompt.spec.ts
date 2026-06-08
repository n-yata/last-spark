import { test, expect, type Page } from '@playwright/test';

// 縦持ち(ポートレート)検知で横向き案内(OrientationScene)が表示され、
// 横向きに戻すとゲームが再開することを、実シーン状態で検証する。

async function activeScenes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const game = window.lastSpark;
    if (!game) return [];
    return game.scene.getScenes(true).map((s) => s.scene.key);
  });
}

async function waitForScene(page: Page, key: string): Promise<void> {
  await expect
    .poll(async () => (await activeScenes(page)).includes(key), { timeout: 10_000 })
    .toBe(true);
}

test('縦持ちで横向き案内が表示され、横向き復帰で案内が消える', async ({ page }) => {
  // 横向きで開始
  await page.setViewportSize({ width: 800, height: 400 });
  await page.goto('/');
  await waitForScene(page, 'TitleScene');
  await page.locator('#game-root canvas').click();
  await waitForScene(page, 'GameScene');

  // 縦持ちに変更 → OrientationScene が前面に出る
  await page.setViewportSize({ width: 400, height: 800 });
  await waitForScene(page, 'OrientationScene');

  // 横向きに戻す → 案内が消え、GameScene が再びアクティブ
  await page.setViewportSize({ width: 800, height: 400 });
  await expect
    .poll(async () => (await activeScenes(page)).includes('OrientationScene'), { timeout: 10_000 })
    .toBe(false);
  await waitForScene(page, 'GameScene');
});
