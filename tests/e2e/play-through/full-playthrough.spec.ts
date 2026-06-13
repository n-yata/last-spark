import { test, expect, type Page } from '@playwright/test';
import { startGame } from '../_helpers';

// 実際のキー入力でタイトル→スタート→ステージ走破→ボス撃破→クリアまでを
// 通しで自動操作する「テストプレイ」。座標固定などのごまかしはしない。
// どこで詰まる/落ちる/倒せないかを実挙動として記録する。

interface GameState {
  x: number;
  y: number;
  hp: number;
  onGround: boolean;
  bossX: number;
  bossActive: boolean;
  bossHp: number;
  clear: boolean;
  gameover: boolean;
}

// ステージ1 の奈落の手前で跳ぶための発射ウィンドウ(プレイヤー中心 X)。
// seg1 は x=1400 で終わり、奈落は 1400–1500。ジャンプ飛距離 ≈165px で越える。
const GAP_LAUNCH = { from: 1320, to: 1396 };

async function readState(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const g = window.lastSpark!;
    const scene = g.scene.getScene('GameScene') as unknown as {
      player?: {
        x: number;
        y: number;
        hp: number;
        body?: { blocked: { down: boolean }; touching: { down: boolean } };
      };
      boss?: { x: number };
    } | null;
    const scenes = g.scene.getScenes(true).map((s) => s.scene.key);
    const p = scene?.player;
    const body = p?.body;
    return {
      x: p?.x ?? -1,
      y: p?.y ?? -1,
      hp: p?.hp ?? -1,
      onGround: body ? body.blocked.down || body.touching.down : false,
      bossX: scene?.boss?.x ?? -1,
      bossActive: (g.registry.get('hud.boss.active') as boolean) ?? false,
      bossHp: (g.registry.get('hud.boss.hp') as number) ?? -1,
      clear: scenes.includes('ClearScene'),
      gameover: scenes.includes('GameOverScene'),
    };
  });
}

test('通しプレイ: タイトルからボス撃破クリアまでを実操作で走破する', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  // スタート + 開始演出(stage1)を送り切り、GameScene が実行中になるまで進める。
  await startGame(page);

  await page.keyboard.down('ArrowRight'); // 前進し続ける

  const timeline: Array<{ t: number; x: number; hp: number; bossHp: number }> = [];
  const startedAt = Date.now();
  let lastX = 0;
  let stuck = 0;
  let lastJumpAt = 0;
  let lastSample = 0;
  let result: 'clear' | 'gameover' | 'timeout' = 'timeout';
  let movingRight = true;

  while (Date.now() - startedAt < 150_000) {
    const st = await readState(page);
    const t = Math.floor((Date.now() - startedAt) / 1000);
    if (t !== lastSample) {
      lastSample = t;
      timeline.push({ t, x: Math.round(st.x), hp: st.hp, bossHp: st.bossHp });
    }
    if (st.clear) {
      result = 'clear';
      break;
    }
    if (st.gameover) {
      result = 'gameover';
      break;
    }

    // 確実に発火するショット(down→保持→up。press だと速すぎてフレームを跨がず不発になる)
    const fireShot = async () => {
      await page.keyboard.down('KeyJ');
      await page.waitForTimeout(70);
      await page.keyboard.up('KeyJ');
    };

    if (st.bossActive) {
      // ボス戦: 左へ下がると向きが反転して弾が逆を向くため、左退避はしない。
      // ボスより十分手前なら接近し、間合いが取れたら停止して右を向いたまま撃ち続ける。
      const tooFar = st.bossX > 0 && st.x < st.bossX - 380;
      if (tooFar && !movingRight) {
        await page.keyboard.down('ArrowRight');
        movingRight = true;
      } else if (!tooFar && movingRight) {
        await page.keyboard.up('ArrowRight');
        movingRight = false;
      }
      await fireShot();
      if (Date.now() - lastJumpAt > 1200) {
        await page.keyboard.down('Space');
        await page.waitForTimeout(180);
        await page.keyboard.up('Space');
        lastJumpAt = Date.now();
      }
      continue;
    }

    await fireShot();

    // 走破フェーズ: 平坦な地上ルートを進み、奈落の手前でだけ跳ぶ(正しいプレイの再現)。
    if (st.x <= lastX + 1) stuck++;
    else stuck = 0;
    lastX = Math.max(lastX, st.x);

    const atGap = st.onGround && st.x >= GAP_LAUNCH.from && st.x <= GAP_LAUNCH.to;
    const blocked = stuck >= 4 && st.onGround; // 想定外の引っ掛かりの保険
    if (atGap || blocked) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(240); // 押し続け=最大ジャンプ
      await page.keyboard.up('Space');
      lastJumpAt = Date.now();
      stuck = 0;
    } else {
      await page.waitForTimeout(90);
    }
  }

  if (movingRight) await page.keyboard.up('ArrowRight');

  // 走破の軌跡を出力(詰まった位置の可視化)
  console.log('=== PLAYTHROUGH TIMELINE (t[s], x, hp, bossHp) ===');
  for (const row of timeline) {
    console.log(`t=${row.t}s x=${row.x} hp=${row.hp} bossHp=${row.bossHp}`);
  }
  const finalState = await readState(page);
  console.log('RESULT:', result, 'maxX=', Math.round(lastX), 'finalState=', JSON.stringify(finalState));

  expect(result).toBe('clear');
});
