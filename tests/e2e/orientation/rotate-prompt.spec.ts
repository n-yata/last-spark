import { test, expect } from '@playwright/test';
import { activeScenes, waitForScene, startGame } from '../_helpers';

// 縦持ち(ポートレート)検知で横向き案内(OrientationScene)が表示され、
// 横向きに戻すとゲームが再開することを、実シーン状態で検証する。

test('縦持ちで横向き案内が表示され、横向き復帰で案内が消える', async ({ page }) => {
  // 横向きで開始
  await page.setViewportSize({ width: 800, height: 400 });
  await page.goto('/');
  await startGame(page);

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
