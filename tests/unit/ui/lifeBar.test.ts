import { describe, it, expect } from 'vitest';
import { LifeBar } from '../../../src/ui/LifeBar';

// LifeBar のゴースト残像・危機パルスを最小の Phaser モックで検証する。
// BossHpBar のテストと同じ方針: fillStyle/lineStyle の直後の呼び出しへ色・alpha を紐付けて記録する。

interface FillCall {
  color: number;
  alpha: number;
  w: number;
}

interface LineCall {
  width: number;
  color: number;
  alpha: number;
}

function makeGraphics() {
  let pendingFill: { color: number; alpha: number } | null = null;
  let pendingLine: LineCall | null = null;
  const fillRectCalls: FillCall[] = [];
  const strokeRoundedRectCalls: LineCall[] = [];
  const o = {
    fillRectCalls,
    strokeRoundedRectCalls,
    setScrollFactor: () => o,
    setDepth: () => o,
    clear: () => {
      fillRectCalls.length = 0;
      strokeRoundedRectCalls.length = 0;
      return o;
    },
    fillStyle: (color: number, alpha: number) => {
      pendingFill = { color, alpha };
      return o;
    },
    fillRect: (_x: number, _y: number, w: number) => {
      if (pendingFill) fillRectCalls.push({ ...pendingFill, w });
      return o;
    },
    fillRoundedRect: () => o,
    lineStyle: (width: number, color: number, alpha: number) => {
      pendingLine = { width, color, alpha };
      return o;
    },
    strokeRect: () => o,
    strokeRoundedRect: () => {
      if (pendingLine) strokeRoundedRectCalls.push(pendingLine);
      return o;
    },
    destroy: () => {},
  };
  return o;
}

function makeText() {
  const o = {
    setOrigin: () => o,
    setScrollFactor: () => o,
    setDepth: () => o,
    destroy: () => {},
  };
  return o;
}

function makeScene() {
  const graphics = makeGraphics();
  const scene = {
    add: {
      graphics: () => graphics,
      text: () => makeText(),
    },
  };
  return { scene, graphics };
}

const COLOR_GHOST = 0xffb14a;
const SEG_WIDTH = 10;

describe('LifeBar のゴースト残像', () => {
  it('被弾直後は失った区間にゴーストが残り、実 HP セグメントは即座に減る', () => {
    const { scene, graphics } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new LifeBar(scene as any);

    bar.render(10, 10, 0); // 満タンで初期化
    bar.render(7, 10, 100); // 被弾: 実 HP は即座に 7 へ

    const ghostFills = graphics.fillRectCalls.filter((c) => c.color === COLOR_GHOST);
    // 失った 3 セグメント(7,8,9)のうち、少なくとも1つはゴーストとして描かれる
    expect(ghostFills.length).toBeGreaterThan(0);
    // 端数セグメントは部分幅(SEG_WIDTH 未満)で描かれる
    expect(ghostFills.some((c) => c.w > 0 && c.w < SEG_WIDTH)).toBe(true);
  });

  it('フレーム経過でゴースト幅が縮んでいく', () => {
    const { scene, graphics } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new LifeBar(scene as any);

    bar.render(10, 10, 0);
    bar.render(7, 10, 100);
    const totalGhostWidthT1 = graphics.fillRectCalls
      .filter((c) => c.color === COLOR_GHOST)
      .reduce((sum, c) => sum + c.w, 0);

    bar.render(7, 10, 200); // HP 変化なし、時間だけ経過
    const totalGhostWidthT2 = graphics.fillRectCalls
      .filter((c) => c.color === COLOR_GHOST)
      .reduce((sum, c) => sum + c.w, 0);

    expect(totalGhostWidthT2).toBeLessThan(totalGhostWidthT1);
  });
});

describe('LifeBar の危機パルス', () => {
  it('非危機時(HP > 25%)は枠線が固定 alpha(0.28)のまま', () => {
    const { scene, graphics } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new LifeBar(scene as any);

    bar.render(10, 10, 0);
    const border1 = graphics.strokeRoundedRectCalls[0];
    bar.render(10, 10, 500);
    const border2 = graphics.strokeRoundedRectCalls[0];

    expect(border1.alpha).toBeCloseTo(0.28);
    expect(border2.alpha).toBeCloseTo(0.28);
  });

  it('危機時(HP <= 25%)は時刻によって枠線 alpha が変化する(パルス)', () => {
    const { scene, graphics } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new LifeBar(scene as any);

    bar.render(2, 10, 0); // 20% <= 25%
    const alphaA = graphics.strokeRoundedRectCalls[0].alpha;
    bar.render(2, 10, 225); // 周期(900ms)の1/4ずらす(sin の位相を変える)
    const alphaB = graphics.strokeRoundedRectCalls[0].alpha;

    expect(alphaA).not.toBeCloseTo(alphaB, 2);
  });
});
