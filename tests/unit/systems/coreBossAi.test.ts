import { describe, it, expect } from 'vitest';
import {
  pickNextCoreBossAction,
  allowedCoreActions,
  pickNextBossAction,
} from '../../../src/systems/bossAi';
import type { BossAction } from '../../../src/types/boss';

// ECLIPSE本体(stage6 ラスボス)の行動抽選(Phaser 非依存の純粋ロジック)の検証。
// 「phase1=支援型(召喚主軸)/phase2=直接攻撃型(shoot 主軸)」のフェーズ切替がデータ起点で成立することを守る。
// 強化仕様: phase2 でも summon を継続し、HP が減っても雑魚召喚が止まらないことを守る。

describe('pickNextCoreBossAction', () => {
  // 一様走査で出現しうるアクション集合を集める。
  const collect = (phase: 'phase1' | 'phase2', last: BossAction, n = 400): Set<BossAction> =>
    new Set(
      Array.from({ length: n }, (_, i) => pickNextCoreBossAction(phase, last, () => (i + 0.5) / n)),
    );

  it('phase1 は summon を含む(支援型=配下召喚)', () => {
    expect(collect('phase1', 'shoot').has('summon')).toBe(true);
  });

  it('phase2 も summon を含む(HP が減っても雑魚召喚を継続する強化仕様)', () => {
    const all = new Set<BossAction>([...collect('phase2', 'shoot'), ...collect('phase2', 'idle')]);
    expect(all.has('summon')).toBe(true);
  });

  it('phase2 は shoot を主軸にする(召喚を織り交ぜつつ直接攻撃型の性格を維持=shoot が最多)', () => {
    expect(collect('phase2', 'idle').has('shoot')).toBe(true);
    // shoot が phase2 の最多重みであること(直接攻撃型の性格維持)を、十分な試行での出現回数で担保する。
    const n = 4000;
    const count = (target: BossAction): number => {
      let c = 0;
      // last は idle 固定(shoot/summon どちらにも連続抑制をかけない中立条件で重みの大小を比較する)。
      for (let i = 0; i < n; i++) {
        if (pickNextCoreBossAction('phase2', 'idle', () => (i + 0.5) / n) === target) c++;
      }
      return c;
    };
    const shootCount = count('shoot');
    expect(shootCount).toBeGreaterThan(count('summon'));
    expect(shootCount).toBeGreaterThan(count('idle'));
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
  it('phase1・phase2 ともに summon を許可する(HP が減っても雑魚召喚を継続する)', () => {
    expect(allowedCoreActions('phase1')).toContain('summon');
    expect(allowedCoreActions('phase2')).toContain('summon');
  });
});
