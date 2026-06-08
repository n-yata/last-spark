import { test, expect, type Page } from '@playwright/test';

// レターボックス(左右の黒帯)が出ず、キャンバスが物理画面いっぱいに広がること、
// および画面左端のタッチが移動ゾーンとして拾われることを検証する。
// (以前は 16:9 固定 + FIT のため横長端末で左右に空白が出て、左端の操作が切れていた)

async function activeScenes(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (window.lastSpark?.scene.getScenes(true) ?? []).map((s) => s.scene.key),
  );
}

async function waitForScene(page: Page, key: string): Promise<void> {
  await expect
    .poll(async () => (await activeScenes(page)).includes(key), { timeout: 10_000 })
    .toBe(true);
}

async function startGame(page: Page): Promise<void> {
  await waitForScene(page, 'TitleScene');
  await page.locator('#game-root canvas').click();
  await waitForScene(page, 'GameScene');
}

test('横長端末でキャンバスが画面いっぱいに広がり左右の空白が出ない', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 400 }); // 2.25:1(16:9 より横長)
  await page.goto('/');
  await startGame(page);

  const box = await page.locator('#game-root canvas').boundingBox();
  expect(box).not.toBeNull();
  // キャンバスがビューポート幅・高さをほぼ埋めている(左右/上下の黒帯が無い)
  expect(box!.width).toBeGreaterThanOrEqual(900 - 2);
  expect(box!.height).toBeGreaterThanOrEqual(400 - 2);
  expect(box!.x).toBeLessThanOrEqual(1);
});

test('画面左端のタッチが移動ゾーンとして拾われ、左移動できる', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 400 });
  await page.goto('/');
  await startGame(page);

  const getX = () =>
    page.evaluate(() => {
      const s = window.lastSpark!.scene.getScene('GameScene') as unknown as {
        player?: { x: number };
      };
      return s.player?.x ?? -1;
    });

  // まず右へ少し進んでおく(左端に余地を作る)
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');
  const beforeX = await getX();

  // 画面左端近く(x=24)に触れて原点を作り、さらに左へドラッグ → 左移動入力
  await page.mouse.move(60, 240);
  await page.mouse.down();
  await page.mouse.move(24, 240); // 原点より左 = 左入力
  // パッドが有効化されていること(左端のタッチが拾えている)
  const padActive = await page.evaluate(
    () => (window.lastSpark!.registry.get('hud.movepad.active') as boolean) ?? false,
  );
  await page.waitForTimeout(700);
  await page.mouse.up();
  const afterX = await getX();

  expect(padActive).toBe(true);
  expect(afterX).toBeLessThan(beforeX); // 左へ移動した
});
