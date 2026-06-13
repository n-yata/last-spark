import { describe, it, expect } from 'vitest';
import {
  pickNextBossAction,
  pickNextPurifierBossAction,
  pickNextFlyingBossAction,
  allowedPurifierActions,
} from '../../../src/systems/bossAi';
import type { BossAction } from '../../../src/types/boss';

// 浄化型ボス(stage4・環境管理機)の行動抽選(Phaser 非依存の純粋ロジック)の検証。
// spray を持つこと、jump を持たないこと、spray が phase2 で増えること、
// spray が接地/飛行の抽選に混入しないこと、連続抑制が効くことを確認する。

describe('pickNextPurifierBossAction', () => {
  // 一様走査で出現しうるアクション集合を集める。
  const collect = (phase: 'phase1' | 'phase2', last: BossAction, n = 400): Set<BossAction> =>
    new Set(
      Array.from({ length: n }, (_, i) => pickNextPurifierBossAction(phase, last, () => (i + 0.5) / n)),
    );

  it('浄化型の重みには spray が含まれる', () => {
    expect(collect('phase1', 'shoot').has('spray')).toBe(true);
    expect(collect('phase2', 'shoot').has('spray')).toBe(true);
  });

  it('浄化型は jump/dive/hover を持たない', () => {
    const all = new Set<BossAction>([...collect('phase1', 'shoot'), ...collect('phase2', 'shoot')]);
    expect(all.has('jump')).toBe(false);
    expect(all.has('dive')).toBe(false);
    expect(all.has('hover')).toBe(false);
  });

  it('接地(pickNextBossAction)/飛行(pickNextFlyingBossAction)に spray は混入しない', () => {
    const ground = new Set<BossAction>([
      ...Array.from({ length: 400 }, (_, i) =>
        pickNextBossAction('phase1', 'shoot', () => (i + 0.5) / 400),
      ),
      ...Array.from({ length: 400 }, (_, i) =>
        pickNextBossAction('phase2', 'shoot', () => (i + 0.5) / 400),
      ),
    ]);
    const flying = new Set<BossAction>([
      ...Array.from({ length: 400 }, (_, i) =>
        pickNextFlyingBossAction('phase1', 'shoot', () => (i + 0.5) / 400),
      ),
      ...Array.from({ length: 400 }, (_, i) =>
        pickNextFlyingBossAction('phase2', 'shoot', () => (i + 0.5) / 400),
      ),
    ]);
    expect(ground.has('spray')).toBe(false);
    expect(flying.has('spray')).toBe(false);
  });

  it('spray は phase2 でより出やすい', () => {
    const countSpray = (phase: 'phase1' | 'phase2'): number => {
      const n = 3000;
      let c = 0;
      for (let i = 0; i < n; i++) {
        // last は spray 以外にして連続抑制の影響を排除する。
        if (pickNextPurifierBossAction(phase, 'shoot', () => (i + 0.5) / n) === 'spray') c++;
      }
      return c;
    };
    expect(countSpray('phase2')).toBeGreaterThan(countSpray('phase1'));
  });

  it('返り値は必ずそのフェーズの許可アクションである', () => {
    const allowed = new Set(allowedPurifierActions('phase2'));
    for (let i = 0; i < 200; i++) {
      const picked = pickNextPurifierBossAction('phase2', 'move', () => (i + 0.5) / 200);
      expect(allowed.has(picked)).toBe(true);
    }
  });

  it('連続抑制が浄化型でも効く(直前と同じ spray は出にくい)', () => {
    const n = 3000;
    const countSprayWith = (last: BossAction): number => {
      let c = 0;
      for (let i = 0; i < n; i++) {
        if (pickNextPurifierBossAction('phase2', last, () => (i + 0.5) / n) === 'spray') c++;
      }
      return c;
    };
    expect(countSprayWith('spray')).toBeLessThan(countSprayWith('shoot'));
  });
});
