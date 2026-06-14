import { describe, it, expect } from 'vitest';
import {
  pickNextEnvoyBossAction,
  pickNextBossAction,
  pickNextFlyingBossAction,
  pickNextWardenBossAction,
  pickNextPurifierBossAction,
  pickNextCoreBossAction,
  allowedEnvoyActions,
} from '../../../src/systems/bossAi';
import type { BossAction } from '../../../src/types/boss';

// 使者(stage5・ENVOY)の行動抽選(Phaser 非依存の純粋ロジック)の検証。
// ENVOY は飛行ボスを継承しつつ固有アクション lance(高速槍弾)/blink(瞬間移動)を持つ。
// lance/blink が ENVOY 専用テーブルに閉じ込められ他系統に混入しないこと、
// phase で blink の圧が増すこと、連続抑制が効くことを守る。

// 一様走査で出現しうるアクション集合を集める。
const collect = (
  pick: (p: 'phase1' | 'phase2', last: BossAction, rng: () => number) => BossAction,
  phase: 'phase1' | 'phase2',
  last: BossAction,
  n = 400,
): Set<BossAction> =>
  new Set(Array.from({ length: n }, (_, i) => pick(phase, last, () => (i + 0.5) / n)));

describe('pickNextEnvoyBossAction', () => {
  it('使者の重みには固有の lance/blink が含まれる', () => {
    for (const phase of ['phase1', 'phase2'] as const) {
      const set = collect(pickNextEnvoyBossAction, phase, 'shoot');
      expect(set.has('lance')).toBe(true);
      expect(set.has('blink')).toBe(true);
    }
  });

  it('使者は接地系のアクション(jump/idle/move/spray/missile/summon)を持たない', () => {
    const all = new Set<BossAction>([
      ...collect(pickNextEnvoyBossAction, 'phase1', 'shoot'),
      ...collect(pickNextEnvoyBossAction, 'phase2', 'shoot'),
    ]);
    for (const forbidden of ['jump', 'idle', 'move', 'spray', 'missile', 'summon'] as const) {
      expect(all.has(forbidden)).toBe(false);
    }
  });

  it('lance/blink は他系統(接地/飛行/番人/浄化/コア)の抽選に混入しない', () => {
    const others: Array<(p: 'phase1' | 'phase2', last: BossAction, rng: () => number) => BossAction> = [
      pickNextBossAction,
      pickNextFlyingBossAction,
      pickNextWardenBossAction,
      pickNextPurifierBossAction,
      pickNextCoreBossAction,
    ];
    for (const pick of others) {
      const all = new Set<BossAction>([
        ...collect(pick, 'phase1', 'shoot'),
        ...collect(pick, 'phase2', 'shoot'),
      ]);
      expect(all.has('lance')).toBe(false);
      expect(all.has('blink')).toBe(false);
    }
  });

  it('blink は phase2 でより出やすい(瞬間移動で挟む圧を強める)', () => {
    const countBlink = (phase: 'phase1' | 'phase2'): number => {
      const n = 3000;
      let c = 0;
      for (let i = 0; i < n; i++) {
        // last は blink 以外にして連続抑制の影響を排除する。
        if (pickNextEnvoyBossAction(phase, 'shoot', () => (i + 0.5) / n) === 'blink') c++;
      }
      return c;
    };
    expect(countBlink('phase2')).toBeGreaterThan(countBlink('phase1'));
  });

  it('返り値は必ずそのフェーズの許可アクションである', () => {
    for (const phase of ['phase1', 'phase2'] as const) {
      const allowed = new Set(allowedEnvoyActions(phase));
      for (let i = 0; i < 200; i++) {
        const picked = pickNextEnvoyBossAction(phase, 'shoot', () => (i + 0.5) / 200);
        expect(allowed.has(picked)).toBe(true);
      }
    }
  });

  it('連続抑制が使者でも効く(直前と同じ lance は出にくい)', () => {
    const n = 3000;
    const countLanceWith = (last: BossAction): number => {
      let c = 0;
      for (let i = 0; i < n; i++) {
        if (pickNextEnvoyBossAction('phase2', last, () => (i + 0.5) / n) === 'lance') c++;
      }
      return c;
    };
    expect(countLanceWith('lance')).toBeLessThan(countLanceWith('shoot'));
  });
});
