import { test, expect } from '@playwright/test';
import { startGame } from '../_helpers';

// ボス HP バーのフェーズ2目盛り(HUD.bossPhase2Ratio)が実際のボス出現経路で registry へ
// 正しく積まれ、実弾でその閾値を割るとボス自身も phase2 へ移行することを検証する。
// (BossHpBar の目盛り描画は phase2Ratio と実HP比率だけで決まる純粋な条件分岐であり、
//  ユニットテストで判定ロジックは検証済みのため、ここでは本番経路の配線を確認する)

test('通常ボス出現で phase2Ratio が registry に設定され、閾値を割ると phase2 へ移行する', async ({
  page,
}) => {
  await page.goto('/');
  await startGame(page);

  const spawned = await page.evaluate(() => {
    const scene = window.lastSpark!.scene.getScene('GameScene') as unknown as {
      spawnBoss: () => void;
      boss?: { maxHp: number; hp: number; getPhase: () => string };
    };
    scene.spawnBoss();
    const reg = window.lastSpark!.registry;
    return {
      phase2Ratio: reg.get('hud.boss.phase2Ratio') as number,
      maxHp: reg.get('hud.boss.maxHp') as number,
      phaseBeforeDamage: scene.boss?.getPhase(),
    };
  });

  expect(spawned.phase2Ratio).toBeGreaterThan(0);
  expect(spawned.phase2Ratio).toBeLessThan(1);
  expect(spawned.maxHp).toBeGreaterThan(0);
  expect(spawned.phaseBeforeDamage).toBe('phase1');

  // ボス HP バー(目盛り付き)を1フレーム描かせてから見た目を確認する。
  await page.waitForTimeout(50);
  await page.screenshot({ path: 'test-results/boss-phase2-tick-phase1.png' });

  // 実弾(本番の takeDamage 経路)でフェーズ2閾値未満まで削る(1撃で丁度その HP へ)。
  await page.evaluate((phase2Ratio) => {
    const scene = window.lastSpark!.scene.getScene('GameScene') as unknown as {
      boss?: { maxHp: number; hp: number; takeDamage: (a: number) => void };
    };
    const b = scene.boss!;
    const targetHp = Math.max(1, Math.floor(b.maxHp * phase2Ratio) - 1);
    b.takeDamage(b.hp - targetHp);
  }, spawned.phase2Ratio);
  // phase の再計算は Boss.update(毎フレーム) で行われるため、次フレームまで待つ。
  await page.waitForTimeout(50);
  const afterDamage = await page.evaluate(() => {
    const scene = window.lastSpark!.scene.getScene('GameScene') as unknown as {
      boss?: { maxHp: number; hp: number; getPhase: () => string };
    };
    const b = scene.boss!;
    return { hp: b.hp, phase: b.getPhase() };
  });

  expect(afterDamage.phase).toBe('phase2');
  expect(afterDamage.hp / spawned.maxHp).toBeLessThanOrEqual(spawned.phase2Ratio);

  await page.waitForTimeout(50);
  await page.screenshot({ path: 'test-results/boss-phase2-tick-phase2.png' });
});

test('裏ボス(シャドウレイ)出現でも phase2Ratio が registry に設定される', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  const spawned = await page.evaluate(() => {
    const scene = window.lastSpark!.scene.getScene('GameScene') as unknown as {
      spawnHardSecretBoss: () => void;
    };
    scene.spawnHardSecretBoss();
    const reg = window.lastSpark!.registry;
    return {
      phase2Ratio: reg.get('hud.boss.phase2Ratio') as number,
      bossActive: reg.get('hud.boss.active') as boolean,
    };
  });

  expect(spawned.bossActive).toBe(true);
  expect(spawned.phase2Ratio).toBeGreaterThan(0);
  expect(spawned.phase2Ratio).toBeLessThan(1);
});
