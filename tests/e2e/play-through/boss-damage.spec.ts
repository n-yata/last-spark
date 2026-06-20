import { test, expect } from '@playwright/test';
import { SHOT } from '../../../src/config/balance';
import { startGame } from '../_helpers';

// 実ブラウザでボスにチャージ攻撃が命中し、シールドを越えて HP が減ることを検証する。
// (canvas 描画のため、公開済みの game インスタンスからシーン状態を読む)

test('ボスにチャージ攻撃を当てるとシールドを越えて HP が減る', async ({ page }) => {
  await page.goto('/');
  // 開始演出を送り切り、GameScene が実行中になってからボスを出す(演出中は物理が止まる)。
  await startGame(page);

  // ボスを出現させ、最大HPを取得
  const maxHp = await page.evaluate(() => {
    const scene = window.lastSpark!.scene.getScene('GameScene') as unknown as {
      spawnBoss: () => void;
    };
    scene.spawnBoss();
    return window.lastSpark!.registry.get('hud.boss.maxHp') as number;
  });
  expect(maxHp).toBeGreaterThan(0);

  // ボスはシールドを持つため、通常弾だけでは本体 HP が減りづらい。
  // ここでは本番の Boss.takeDamage 経路へ charged 命中を入れ、シールドを割った後に
  // 本体 HP が減ることへ検証を集中させる。弾の飛翔時間には依存させない。
  const bossState = await page.evaluate((chargedDamage) => {
    const scene = window.lastSpark!.scene.getScene('GameScene') as unknown as {
      boss?: {
        hp: number;
        shieldHp: number;
        takeDamage: (amount: number, hitKind: 'charged') => void;
      };
    };
    const b = scene.boss;
    if (!b) {
      return null;
    }
    const beforeShield = b.shieldHp;
    b.takeDamage(chargedDamage, 'charged');
    b.takeDamage(chargedDamage, 'charged');
    b.takeDamage(chargedDamage, 'charged');
    return {
      hp: b.hp,
      shieldHp: b.shieldHp,
      beforeShield,
    };
  }, SHOT.chargedDamage);

  expect(bossState).not.toBeNull();
  expect(bossState!.beforeShield).toBeGreaterThan(0);
  expect(bossState!.shieldHp).toBe(0);
  expect(bossState!.hp).toBeLessThan(maxHp);
  expect(bossState!.hp).toBeLessThanOrEqual(maxHp - 3);
});
