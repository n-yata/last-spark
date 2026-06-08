import { test, expect, type Page } from '@playwright/test';

// 実ブラウザでボスにショットが命中し HP が減ることを検証する。
// 以前はボスが空中に浮いて地上ショットが当たらず撃破できなかったため、その回帰防止。
// (canvas 描画のため、公開済みの game インスタンスからシーン状態を読む)

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

test('ボスにショットを当てると HP が減る', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page, 'TitleScene');
  await page.locator('#game-root canvas').click();
  await waitForScene(page, 'GameScene');

  // ボスを出現させ、最大HPを取得
  const maxHp = await page.evaluate(() => {
    const scene = window.lastSpark!.scene.getScene('GameScene') as unknown as {
      spawnBoss: () => void;
    };
    scene.spawnBoss();
    return window.lastSpark!.registry.get('hud.boss.maxHp') as number;
  });
  expect(maxHp).toBeGreaterThan(0);

  // プレイヤーとボスを隣接位置に固定しつつ、通常ショットを連射する。
  // (プレイヤー生存を保ち、ボスへの命中=ダメージの有無に検証を集中させる)
  const pin = () =>
    page.evaluate(() => {
      const scene = window.lastSpark!.scene.getScene('GameScene') as unknown as {
        boss?: { x: number; y: number; body: { velocity: { x: number } } };
        player?: {
          x: number;
          y: number;
          hp: number;
          facing: string;
          setFlipX: (b: boolean) => void;
          body: { velocity: { x: number } };
        };
      };
      const b = scene.boss;
      const p = scene.player;
      if (b && p) {
        b.x = 700;
        b.y = 436; // 地面接地時のボス中心 Y
        b.body.velocity.x = 0;
        p.x = 630;
        p.y = 460; // 地面接地時のプレイヤー中心 Y
        p.facing = 'right';
        p.setFlipX(false);
        p.body.velocity.x = 0;
        p.hp = 16; // 検証中はプレイヤーを生存させる
      }
    });

  // 命中の確認が目的。撃破まで撃ち切るとクリア遷移でシーンが変わるため、
  // 目標(HP が明確に減少)を達したら早期に抜ける。
  let bossHp = maxHp;
  for (let i = 0; i < 30; i++) {
    const onGame = (await page.evaluate(() =>
      window.lastSpark!.scene.getScenes(true).map((s) => s.scene.key),
    )).includes('GameScene');
    if (!onGame) break;
    await pin();
    await page.keyboard.down('KeyJ');
    await page.waitForTimeout(80); // しきい値未満=通常弾
    await page.keyboard.up('KeyJ');
    await page.waitForTimeout(140);
    bossHp = await page.evaluate(() => window.lastSpark!.registry.get('hud.boss.hp') as number);
    if (bossHp <= maxHp - 6) break; // 命中を十分確認できたら終了(撃破までは撃たない)
  }

  // 命中していれば HP は明確に減少する(数発以上当たっている)
  expect(bossHp).toBeLessThan(maxHp);
  expect(bossHp).toBeLessThanOrEqual(maxHp - 5);
});
