import { describe, it, expect } from 'vitest';
import { getStageData, STAGE_IDS } from '../../../src/config/stage1';
import { PLAYER, STAGE } from '../../../src/config/balance';

// クリア可能性ガード(②構成再配置の安全網)。各ステージの地面の奈落(ギャップ)が、
// ジャンプで越えられる or 梯子で迂回できることを守る。奈落幅を誤って広げてもここで検知する。

// 最大水平ジャンプ距離(px)。滞空時間(2 × |初速| / 重力)× 横移動速度で近似する。
const MAX_JUMP_DISTANCE =
  PLAYER.moveSpeed * ((2 * Math.abs(PLAYER.jumpVelocity)) / STAGE.gravityY);

/** 地面セグメント(height>40・地面上端)を x 昇順に並べ、隣接セグメント間の隙間幅(px)を返す。 */
function groundGaps(stageId: string): number[] {
  const stage = getStageData(stageId);
  const grounds = stage.platforms
    .filter((p) => p.height > 40 && p.y === STAGE.groundY)
    .sort((a, b) => a.x - b.x);
  const gaps: number[] = [];
  for (let i = 1; i < grounds.length; i += 1) {
    const prevRight = grounds[i - 1].x + grounds[i - 1].width;
    const gap = grounds[i].x - prevRight;
    if (gap > 0) gaps.push(gap);
  }
  return gaps;
}

describe('クリア可能性: 地面の奈落', () => {
  it('最大ジャンプ距離は既存の単発奈落(最大72px)より十分広い(前提の健全性)', () => {
    expect(MAX_JUMP_DISTANCE).toBeGreaterThan(150);
  });

  for (const id of STAGE_IDS) {
    it(`${id}: 地面の奈落はジャンプで越えられる、または梯子で迂回できる`, () => {
      const stage = getStageData(id);
      const hasLadders = (stage.ladders?.length ?? 0) > 0;
      for (const gap of groundGaps(id)) {
        // 梯子があるステージ(stage2)は、ジャンプ不可の広い奈落を梯子で越える設計。
        const passable = gap <= MAX_JUMP_DISTANCE || hasLadders;
        expect(passable, `${id} に越えられない奈落(幅 ${gap}px)がある`).toBe(true);
      }
    });
  }

  it('stage2 以外は梯子なしでも全奈落をジャンプで越えられる(梯子はstage2の縦攻略専用)', () => {
    for (const id of STAGE_IDS) {
      if (id === 'stage2') continue;
      for (const gap of groundGaps(id)) {
        expect(gap).toBeLessThanOrEqual(MAX_JUMP_DISTANCE);
      }
    }
  });
});
