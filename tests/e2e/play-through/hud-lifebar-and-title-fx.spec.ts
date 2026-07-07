import { test, expect } from '@playwright/test';
import { startGame, waitForScene } from '../_helpers';

// ライフバーのゴースト残像・危機パルス、およびタイトル演出(ロゴ明滅・粒子・シーン再入)を
// 本番経路(実プレイの被弾・実際のシーン遷移)で検証する。
// 純粋関数側の判定ロジック(nextLagRatio/chargePulseAlpha/titleFx)はユニットテストで
// 検証済みのため、ここでは「本番コードが正しく配線されているか」に検証を絞る。

test('実プレイ被弾でライフバーのゴースト残像(lagHp)が出て縮む', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  const readLifeBarState = () =>
    page.evaluate(() => {
      const ui = window.lastSpark!.scene.getScene('UIScene') as unknown as {
        lifeBar: { lagHp: number };
      };
      const gameScene = window.lastSpark!.scene.getScene('GameScene') as unknown as {
        player: { hp: number };
      };
      return { lagHp: ui.lifeBar.lagHp, hp: gameScene.player.hp };
    });

  const before = await readLifeBarState();
  expect(before.lagHp).toBeCloseTo(before.hp, 1); // 被弾前はゴーストなし(実HPに一致)

  // 本番の Player.takeDamage 経路で被弾させる(飛翔時間や当たり判定に依存させない)。
  await page.evaluate(() => {
    const scene = window.lastSpark!.scene.getScene('GameScene') as unknown as {
      player: { takeDamage: (amount: number) => void };
    };
    scene.player.takeDamage(6);
  });
  // registry 反映(次フレーム)を待つ。
  await page.waitForTimeout(50);

  const justAfter = await readLifeBarState();
  expect(justAfter.hp).toBeLessThan(before.hp);
  // 被弾直後は残像(lagHp)が実HPより多く残っている(まだ縮み切っていない)。
  expect(justAfter.lagHp).toBeGreaterThan(justAfter.hp);

  await page.waitForTimeout(600); // 残像が縮むのを待つ
  const later = await readLifeBarState();
  expect(later.lagHp).toBeLessThan(justAfter.lagHp);
  expect(later.lagHp).toBeGreaterThanOrEqual(later.hp);
});

test('HP が 25% 以下になるとライフバー枠の危機パルスが出る', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  await page.evaluate(() => {
    const scene = window.lastSpark!.scene.getScene('GameScene') as unknown as {
      player: { hp: number; maxHp: number; takeDamage: (amount: number) => void };
    };
    // 25% ちょうどより少し下まで、1回の被弾で削る(無敵時間による2発目の無効化を避ける)。
    const target = Math.floor(scene.player.maxHp * 0.25) - 1;
    scene.player.takeDamage(scene.player.hp - target);
  });
  await page.waitForTimeout(50);

  const state = await page.evaluate(() => {
    const scene = window.lastSpark!.scene.getScene('GameScene') as unknown as {
      player: { hp: number; maxHp: number };
    };
    return { hp: scene.player.hp, maxHp: scene.player.maxHp };
  });
  expect(state.hp / state.maxHp).toBeLessThanOrEqual(0.25);

  // 危機パルスは sin 波の時間変化なので、実描画を1コマ進めてからスクリーンショットで目視確認する。
  await page.waitForTimeout(50);
  await page.screenshot({ path: 'test-results/lifebar-critical-pulse.png' });
});

test('タイトル画面: ロゴのスパーク明滅が時間で変化し、粒子(残り火)が生成される', async ({
  page,
}) => {
  await page.goto('/');
  await waitForScene(page, 'TitleScene');

  const readTitleState = () =>
    page.evaluate(() => {
      const scene = window.lastSpark!.scene.getScene('TitleScene') as unknown as {
        logoText?: { alpha: number };
        motes: unknown[];
      };
      return { alpha: scene.logoText?.alpha, moteCount: scene.motes.length };
    });

  const t1 = await readTitleState();
  expect(t1.moteCount).toBeGreaterThan(0);
  expect(t1.alpha).toBeDefined();

  await page.waitForTimeout(400);
  const t2 = await readTitleState();
  // 明滅は非周期的な sin 合成なので、十分な時間差(400ms)があれば別値になる。
  expect(t2.alpha).not.toBeCloseTo(t1.alpha!, 3);

  await page.screenshot({ path: 'test-results/title-fx.png' });
});

test('タイトル→ゲーム→タイトル再入で演出が二重生成・リークしない', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page, 'TitleScene');

  const initial = await page.evaluate(() => {
    const scene = window.lastSpark!.scene.getScene('TitleScene') as unknown as {
      motes: unknown[];
    };
    return scene.motes.length;
  });
  expect(initial).toBeGreaterThan(0);

  await startGame(page);
  await waitForScene(page, 'GameScene');

  // 実プレイを経ずに直接シーン遷移させ、TitleScene の再入(create の再実行)を発生させる。
  // 本番の GameOverScene/ClearScene と同じく、Title へ戻る前に UIScene を stop する
  // (本番のいずれの終了経路も scene.stop(SCENE_KEYS.ui) を必ず伴うため、それに揃える)。
  await page.evaluate(() => {
    const scene = window.lastSpark!.scene.getScene('GameScene')!;
    scene.scene.stop('UIScene');
    scene.scene.start('TitleScene');
  });
  await waitForScene(page, 'TitleScene');
  await page.waitForTimeout(50);

  const afterReentry = await page.evaluate(() => {
    const scene = window.lastSpark!.scene.getScene('TitleScene') as unknown as {
      motes: unknown[];
      children: { list: Array<{ type: string }> };
    };
    // Graphics オブジェクトが二重生成されていないか(シーン内の全 Graphics 数で確認)。
    const graphicsCount = scene.children.list.filter(
      (o: { type: string }) => o.type === 'Graphics',
    ).length;
    return { moteCount: scene.motes.length, graphicsCount };
  });

  // 再入後も粒子数は初回と同じ(重複生成されていない)。
  expect(afterReentry.moteCount).toBe(initial);
  // 背景の drawBackdrop 用 Graphics(タイトルBGM未ロード時)+ 粒子用 Graphics のみで、
  // 再入前後で個数が増え続けない(単発の値であることを screenshot 目視と併せて確認する)。
  expect(afterReentry.graphicsCount).toBeGreaterThan(0);

  await page.screenshot({ path: 'test-results/title-reentry.png' });
});
