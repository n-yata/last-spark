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

  // 開始カットシーンは GameScene create の約300ms後にタイマー起動する。この出現前の窓で
  // 「GameScene active && CutsceneScene なし」を見て早抜けすると、後から演出が遅延起動して
  // GameScene を pause してしまい、その後の処理(クリア遷移等)と競合する。そのため、まず
  // カットシーンの出現(または「演出なし」の確定)を待ってから送りループに入る。
  const appearanceDeadline = Date.now() + 5_000;
  let noSceneStreakStart: number | null = null;
  for (;;) {
    const scenes = await activeScenes(page);
    if (scenes.includes('CutsceneScene')) break; // 演出が出現 → 送りループへ
    if (scenes.includes('GameScene')) {
      // GameScene が active のまま 1.5s 連続で演出が出なければ「演出なし」設定と判断する。
      // pause で active から消えた場合はリセットし、誤って「演出なし」と判定しないようにする。
      if (noSceneStreakStart === null) noSceneStreakStart = Date.now();
      if (Date.now() - noSceneStreakStart >= 1_500) break; // 演出なし設定 → 送りループ(即終了)へ
    } else {
      noSceneStreakStart = null;
    }
    if (Date.now() > appearanceDeadline) break; // 保険。以降の送りループ/waitForScene に委ねる
    await page.waitForTimeout(100);
  }

  // CutsceneScene が出ている間はタップで送り、GameScene が再開(実行中)するまで進める。
  for (let i = 0; i < 20; i++) {
    const scenes = await activeScenes(page);
    if (scenes.includes('GameScene') && !scenes.includes('CutsceneScene')) return;
    await page.locator('#game-root canvas').click(); // 演出を1行送る(入力ガード350ms超の間隔)
    await page.waitForTimeout(400);
  }
  await waitForScene(page, 'GameScene');
}
