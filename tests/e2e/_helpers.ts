import { expect, type Page } from '@playwright/test';

// E2E 共通ヘルパー(Phaser は canvas 描画のため、表示ではなく公開 game インスタンス
// `window.lastSpark` のシーン状態を読む)。*.spec.ts でないため Playwright のテスト収集対象外。

/** 現在アクティブ(実行中=一時停止していない)なシーンキー一覧を返す。 */
export async function activeScenes(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (window.lastSpark?.scene.getScenes(true) ?? []).map((s) => s.scene.key),
  );
}

/** 指定シーンがアクティブになるまで待つ。 */
export async function waitForScene(page: Page, key: string): Promise<void> {
  await expect
    .poll(async () => (await activeScenes(page)).includes(key), { timeout: 10_000 })
    .toBe(true);
}

/**
 * タイトルからゲームを開始し、開始演出(stage1 は背景つき CutsceneScene が GameScene を
 * 一時停止する)を送り切って、GameScene が実行中の状態にして返す。
 * 演出を持たないステージでは即座に GameScene が走るため、そのまま抜ける。
 */
export async function startGame(page: Page): Promise<void> {
  await waitForScene(page, 'TitleScene');
  await page.locator('#game-root canvas').click(); // スタート
  // 開始演出は GameScene 生成の約300ms後に起動するため、立ち上がりを待ってから送る。
  await page.waitForTimeout(700);
  // CutsceneScene が出ている間はタップで送り、GameScene が再開(実行中)するまで進める。
  for (let i = 0; i < 12; i++) {
    const scenes = await activeScenes(page);
    if (scenes.includes('GameScene') && !scenes.includes('CutsceneScene')) return;
    await page.locator('#game-root canvas').click(); // 演出を1行送る(入力ガード350ms超の間隔)
    await page.waitForTimeout(400);
  }
  await waitForScene(page, 'GameScene');
}
