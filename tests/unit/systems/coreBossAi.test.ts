import { describe, it, expect } from 'vitest';
import {
  pickNextCoreBossAction,
  allowedCoreActions,
  pickNextBossAction,
} from '../../../src/systems/bossAi';
import type { BossAction } from '../../../src/types/boss';

// ECLIPSE本体(stage6 ラスボス)の行動抽選(Phaser 非依存の純粋ロジック)の検証。
// 「phase1=支援型(召喚)/phase2=直接攻撃型(召喚なし)」のフェーズ切替がデータ起点で成立することを守る。

describe('pickNextCoreBossAction', () => {
  // 一様走査で出現しうるアクション集合を集める。
  const collect = (phase: 'phase1' | 'phase2', last: BossAction, n = 400): Set<BossAction> =>
    new Set(
      Array.from({ length: n }, (_, i) => pickNextCoreBossAction(phase, last, () => (i + 0.5) / n)),
    );

  it('phase1 は summon を含む(支援型=配下召喚)', () => {
    expect(collect('phase1', 'shoot').has('summon')).toBe(true);
  });

  it('phase2 は summon を一切含まない(直接攻撃型へ切替)', () => {
    const all = new Set<BossAction>([...collect('phase2', 'shoot'), ...collect('phase2', 'idle')]);
    expect(all.has('summon')).toBe(false);
  });

  it('phase2 は shoot を主軸にする(コアの直接攻撃)', () => {
    expect(collect('phase2', 'idle').has('shoot')).toBe(true);
  });

  it('コアは move/jump を持たない(浮遊して静止する)', () => {
    const all = new Set<BossAction>([
      ...collect('phase1', 'shoot'),
      ...collect('phase2', 'shoot'),
    ]);
    expect(all.has('move')).toBe(false);
    expect(all.has('jump')).toBe(false);
  });

  it('接地ボス(pickNextBossAction)に summon は混入しない(コア専用テーブルに閉じる)', () => {
    const all = new Set<BossAction>([
      ...Array.from({ length: 400 }, (_, i) =>
        pickNextBossAction('phase1', 'shoot', () => (i + 0.5) / 400),
      ),
      ...Array.from({ length: 400 }, (_, i) =>
        pickNextBossAction('phase2', 'shoot', () => (i + 0.5) / 400),
      ),
    ]);
    expect(all.has('summon')).toBe(false);
  });

  it('返り値は必ずそのフェーズの許可アクションである', () => {
    for (const phase of ['phase1', 'phase2'] as const) {
      const allowed = new Set(allowedCoreActions(phase));
      for (let i = 0; i < 200; i++) {
        const picked = pickNextCoreBossAction(phase, 'idle', () => (i + 0.5) / 200);
        expect(allowed.has(picked)).toBe(true);
      }
    }
  });

  it('連続抑制がコアでも効く(直前と同じ summon は出にくい)', () => {
    const n = 3000;
    const countSummonWith = (last: BossAction): number => {
      let c = 0;
      for (let i = 0; i < n; i++) {
        if (pickNextCoreBossAction('phase1', last, () => (i + 0.5) / n) === 'summon') c++;
      }
      return c;
    };
    expect(countSummonWith('summon')).toBeLessThan(countSummonWith('shoot'));
  });
});

describe('allowedCoreActions', () => {
  it('phase1 は summon を許可し、phase2 は許可しない', () => {
    expect(allowedCoreActions('phase1')).toContain('summon');
    expect(allowedCoreActions('phase2')).not.toContain('summon');
  });
});
