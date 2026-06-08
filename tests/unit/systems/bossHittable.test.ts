import { describe, it, expect } from 'vitest';
import { PLAYER, BOSS, STAGE } from '../../../src/config/balance';
import { getStageData } from '../../../src/config/stage1';

// 「地上のプレイヤーの水平ショットがボスの当たり判定に重なる」ことを保証する回帰テスト。
// 以前はボスが空中に浮いており、地上ショット(プレイヤー中心の高さ)が下を通過して
// 当たらず、ボスを撃破できなかった。その再発を防ぐ。

describe('ボスは地上ショットで当てられる(撃破可能性)', () => {
  const groundTop = STAGE.groundY;

  // プレイヤーが地面に立ったときの中心 Y(本体下端=地面)。ショットはこの高さで水平に飛ぶ。
  const playerShotY = groundTop - PLAYER.height / 2;

  const boss = getStageData('stage1').bossSpawn;
  const bossTop = boss.y - BOSS.height / 2;
  const bossBottom = boss.y + BOSS.height / 2;

  it('プレイヤーのショット高さがボスの上下範囲内にある', () => {
    expect(playerShotY).toBeGreaterThanOrEqual(bossTop);
    expect(playerShotY).toBeLessThanOrEqual(bossBottom);
  });

  it('ボスは地面に接地している(本体下端=地面)', () => {
    expect(bossBottom).toBeCloseTo(groundTop, 5);
  });

  it('チャージ弾で有限回(現実的な手数)で撃破できる', () => {
    const chargedHits = Math.ceil(BOSS.maxHp / 3); // SHOT.chargedDamage=3
    expect(chargedHits).toBeLessThanOrEqual(20);
  });
});
