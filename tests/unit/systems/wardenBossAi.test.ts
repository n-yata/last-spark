import { describe, it, expect } from 'vitest';
import {
  pickNextBossAction,
  pickNextFlyingBossAction,
  pickNextWardenBossAction,
  allowedWardenActions,
} from '../../../src/systems/bossAi';
import type { BossAction } from '../../../src/types/boss';

// 収容番人(stage3)の行動抽選(Phaser 非依存の純粋ロジック)の検証。
// stage1 接地ボスとの差別化の要となる固有アクション「missile」が、warden の重みには含まれ、
// 接地/飛行には混入しないこと、phase2 で増えること、連続抑制が効くことを確認する。

describe('pickNextWardenBossAction', () => {
  const collect = (phase: 'phase1' | 'phase2', last: BossAction, n = 400): Set<BossAction> =>
    new Set(
      Array.from({ length: n }, (_, i) => pickNextWardenBossAction(phase, last, () => (i + 0.5) / n)),
    );

  it('warden の重みには missile が含まれる', () => {
    expect(collect('phase1', 'shoot').has('missile')).toBe(true);
    expect(collect('phase2', 'shoot').has('missile')).toBe(true);
  });

  it('接地アクション(move/shoot/idle/jump)も併せ持つ', () => {
    const all = collect('phase1', 'missile');
    expect(all.has('move')).toBe(true);
    expect(all.has('shoot')).toBe(true);
    expect(all.has('jump')).toBe(true);
  });

  it('接地(stage1)ボスには missile が混入しない', () => {
    const all = new Set<BossAction>([
      ...Array.from({ length: 400 }, (_, i) =>
        pickNextBossAction('phase1', 'shoot', () => (i + 0.5) / 400),
      ),
      ...Array.from({ length: 400 }, (_, i) =>
        pickNextBossAction('phase2', 'shoot', () => (i + 0.5) / 400),
      ),
    ]);
    expect(all.has('missile')).toBe(false);
  });

  it('飛行(stage2)ボスには missile が混入しない', () => {
    const all = new Set<BossAction>([
      ...Array.from({ length: 400 }, (_, i) =>
        pickNextFlyingBossAction('phase1', 'shoot', () => (i + 0.5) / 400),
      ),
      ...Array.from({ length: 400 }, (_, i) =>
        pickNextFlyingBossAction('phase2', 'shoot', () => (i + 0.5) / 400),
      ),
    ]);
    expect(all.has('missile')).toBe(false);
  });

  it('missile は phase2 でより出やすい', () => {
    const countMissile = (phase: 'phase1' | 'phase2'): number => {
      const n = 3000;
      let c = 0;
      for (let i = 0; i < n; i++) {
        // last は missile 以外にして連続抑制の影響を排除する。
        if (pickNextWardenBossAction(phase, 'shoot', () => (i + 0.5) / n) === 'missile') c++;
      }
      return c;
    };
    expect(countMissile('phase2')).toBeGreaterThan(countMissile('phase1'));
  });

  it('連続抑制が効く(直前と同じ missile は出にくい)', () => {
    const n = 3000;
    const countMissileWith = (last: BossAction): number => {
      let c = 0;
      for (let i = 0; i < n; i++) {
        if (pickNextWardenBossAction('phase2', last, () => (i + 0.5) / n) === 'missile') c++;
      }
      return c;
    };
    expect(countMissileWith('missile')).toBeLessThan(countMissileWith('shoot'));
  });

  it('返り値は必ずそのフェーズの許可アクションである', () => {
    const allowed = new Set(allowedWardenActions('phase2'));
    for (let i = 0; i < 200; i++) {
      const picked = pickNextWardenBossAction('phase2', 'move', () => (i + 0.5) / 200);
      expect(allowed.has(picked)).toBe(true);
    }
  });
});
