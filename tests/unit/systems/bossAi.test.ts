import { describe, it, expect } from 'vitest';
import { pickNextBossAction, weightedRandom, allowedActions } from '../../../src/systems/bossAi';
import type { BossAction } from '../../../src/types/boss';

describe('weightedRandom', () => {
  it('rng=0 は最初の正の重みの候補を返す', () => {
    const result = weightedRandom(
      [
        ['a', 10],
        ['b', 20],
      ],
      () => 0,
    );
    expect(result).toBe('a');
  });

  it('rng がほぼ 1 のとき最後の候補を返す', () => {
    const result = weightedRandom(
      [
        ['a', 10],
        ['b', 20],
      ],
      () => 0.999999,
    );
    expect(result).toBe('b');
  });

  it('重み 0 の候補は選ばれない', () => {
    const result = weightedRandom(
      [
        ['zero', 0],
        ['picked', 5],
      ],
      () => 0,
    );
    expect(result).toBe('picked');
  });

  it('重みに比例して選択が分布する', () => {
    // a:b = 1:3 の重み。多数試行で b が概ね 3 倍多く出る。
    let aCount = 0;
    let bCount = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const r = (i + 0.5) / n; // 一様に走査
      const picked = weightedRandom<'a' | 'b'>(
        [
          ['a', 1],
          ['b', 3],
        ],
        () => r,
      );
      if (picked === 'a') aCount++;
      else bCount++;
    }
    expect(bCount).toBeGreaterThan(aCount * 2.5);
    expect(bCount).toBeLessThan(aCount * 3.5);
  });
});

describe('pickNextBossAction', () => {
  it('charge は廃止され、どのフェーズでも選ばれない', () => {
    const all = new Set<BossAction>([
      ...Array.from({ length: 300 }, (_, i) =>
        pickNextBossAction('phase1', 'idle', () => (i + 0.5) / 300),
      ),
      ...Array.from({ length: 300 }, (_, i) =>
        pickNextBossAction('phase2', 'idle', () => (i + 0.5) / 300),
      ),
    ]);
    expect(all.has('charge' as BossAction)).toBe(false);
  });

  it('jump は両フェーズで選ばれうる', () => {
    const phase1 = new Set<BossAction>(
      Array.from({ length: 300 }, (_, i) =>
        pickNextBossAction('phase1', 'idle', () => (i + 0.5) / 300),
      ),
    );
    const phase2 = new Set<BossAction>(
      Array.from({ length: 300 }, (_, i) =>
        pickNextBossAction('phase2', 'idle', () => (i + 0.5) / 300),
      ),
    );
    expect(phase1.has('jump')).toBe(true);
    expect(phase2.has('jump')).toBe(true);
  });

  it('直前と同じアクションは重み半減で出にくくなる(連続抑制)', () => {
    // last='shoot' のとき、shoot の重みは半減する。
    // last なし(idle)と比較して shoot の出現率が下がることを確認。
    const n = 2000;
    const countShoot = (last: BossAction): number => {
      let c = 0;
      for (let i = 0; i < n; i++) {
        const picked = pickNextBossAction('phase1', last, () => (i + 0.5) / n);
        if (picked === 'shoot') c++;
      }
      return c;
    };
    const withRepeat = countShoot('shoot'); // shoot 半減
    const withoutRepeat = countShoot('idle'); // shoot 通常
    expect(withRepeat).toBeLessThan(withoutRepeat);
  });

  it('返り値は必ずそのフェーズの許可アクションである', () => {
    const allowed = new Set(allowedActions('phase2'));
    for (let i = 0; i < 100; i++) {
      const picked = pickNextBossAction('phase2', 'move', () => (i + 0.5) / 100);
      expect(allowed.has(picked)).toBe(true);
    }
  });
});
