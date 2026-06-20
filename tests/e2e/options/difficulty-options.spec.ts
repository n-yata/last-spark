import { test, expect, type Page } from '@playwright/test';
import { waitForScene } from '../_helpers';

const SAVE_KEY = 'lastspark:save';

async function gameSize(page: Page): Promise<{ width: number; height: number; uiScale: number }> {
  return page.evaluate(() => ({
    width: window.lastSpark?.scale.width ?? 0,
    height: window.lastSpark?.scale.height ?? 0,
    uiScale: Math.max(1, Math.min(window.devicePixelRatio || 1, 2)),
  }));
}

async function clickGamePoint(page: Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('#game-root canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not found');
  const { width, height } = await gameSize(page);
  await canvas.click({ position: { x: (x / width) * box.width, y: (y / height) * box.height } });
}

async function savedDifficulty(page: Page): Promise<string | undefined> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw).settings?.difficulty;
  }, SAVE_KEY);
}

test('タイトルの OPTIONS から hard mode を切り替えて保存できる', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page, 'TitleScene');
  await page.evaluate((key) => window.localStorage.removeItem(key), SAVE_KEY);

  const size = await gameSize(page);
  await clickGamePoint(page, 55 * size.uiScale, size.height - 24 * size.uiScale); // OPTIONS

  const modeY = size.height * 0.32;
  await clickGamePoint(page, size.width / 2, modeY); // MODE: NORMAL -> HARD

  await expect.poll(() => savedDifficulty(page)).toBe('hard');

  await clickGamePoint(page, size.width / 2, modeY); // MODE: HARD -> NORMAL
  await expect.poll(() => savedDifficulty(page)).toBe('normal');
});
