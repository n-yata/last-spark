import { describe, it, expect } from 'vitest';
import {
  pickNextBossAction,
  pickNextFlyingBossAction,
  allowedFlyingActions,
  bossActionDuration,
} from '../../../src/systems/bossAi';
import type { BossAction } from '../../../src/types/boss';

// 飛行ボスの行動抽選(Phaser 非依存の純粋ロジック)の検証。
// 接地ボスとアクション集合が異なること、dive が phase2 で増えること、
// 連続抑制が飛行でも効くこと、継続時間取得の fallback を確認する。

describe('pickNextFlyingBossAction', () => {
  // 一様走査で出現しうるアクション集合を集める。
  const collect = (phase: 'phase1' | 'phase2', last: BossAction, n = 400): Set<BossAction> =>
    new Set(
      Array.from({ length: n }, (_, i) => pickNextFlyingBossAction(phase, last, () => (i + 0.5) / n)),
    );

  it('飛行の重みには dive/hover が含まれる', () => {
    const p1 = collect('phase1', 'shoot');
    expect(p1.has('dive')).toBe(true);
    expect(p1.has('hover')).toBe(true);
  });

  it('接地に存在する jump/idle は飛行では選ばれない', () => {
    const all = new Set<BossAction>([...collect('phase1', 'shoot'), ...collect('phase2', 'shoot')]);
    expect(all.has('jump')).toBe(false);
    expect(all.has('idle')).toBe(false);
  });

  it('接地(pickNextBossAction)に dive/hover は混入しない', () => {
    const all = new Set<BossAction>([
      ...Array.from({ length: 400 }, (_, i) =>
        pickNextBossAction('phase1', 'shoot', () => (i + 0.5) / 400),
      ),
      ...Array.from({ length: 400 }, (_, i) =>
        pickNextBossAction('phase2', 'shoot', () => (i + 0.5) / 400),
      ),
    ]);
    expect(all.has('dive')).toBe(false);
    expect(all.has('hover')).toBe(false);
  });

  it('dive は phase2 でより出やすい', () => {
    const countDive = (phase: 'phase1' | 'phase2'): number => {
      const n = 3000;
      let c = 0;
      for (let i = 0; i < n; i++) {
        // last は dive 以外にして連続抑制の影響を排除する。
        if (pickNextFlyingBossAction(phase, 'shoot', () => (i + 0.5) / n) === 'dive') c++;
      }
      return c;
    };
    expect(countDive('phase2')).toBeGreaterThan(countDive('phase1'));
  });

  it('返り値は必ずそのフェーズの許可アクションである', () => {
    const allowed = new Set(allowedFlyingActions('phase2'));
    for (let i = 0; i < 200; i++) {
      const picked = pickNextFlyingBossAction('phase2', 'move', () => (i + 0.5) / 200);
      expect(allowed.has(picked)).toBe(true);
    }
  });

  it('連続抑制が飛行でも効く(直前と同じアクションは出にくい)', () => {
    const n = 3000;
    const countDiveWith = (last: BossAction): number => {
      let c = 0;
      for (let i = 0; i < n; i++) {
        if (pickNextFlyingBossAction('phase2', last, () => (i + 0.5) / n) === 'dive') c++;
      }
      return c;
    };
    expect(countDiveWith('dive')).toBeLessThan(countDiveWith('shoot'));
  });
});

describe('bossActionDuration', () => {
  it('マップに存在するキーはその値を返す', () => {
    expect(bossActionDuration({ dive: 700, shoot: 600 }, 'dive', 999)).toBe(700);
  });

  it('マップに無いキーは fallback を返す(NaN/クラッシュを防ぐ)', () => {
    expect(bossActionDuration({ shoot: 600 }, 'jump', 700)).toBe(700);
  });
});
