import { describe, it, expect } from 'vitest';
import { shouldHazardTick } from '../../../src/systems/hazardRules';

// ダメージ床(汚染床)のクールダウン判定。overlap が毎フレーム呼ばれても多重ヒットしないことを守る。

describe('shouldHazardTick', () => {
  const TICK = 600;

  it('初回(lastHitAt=-Infinity)は必ず発火する', () => {
    expect(shouldHazardTick(-Infinity, 0, TICK)).toBe(true);
    expect(shouldHazardTick(-Infinity, 12345, TICK)).toBe(true);
  });

  it('クールダウン未満の連続呼び出しは発火しない(多重ヒット防止)', () => {
    const last = 1000;
    expect(shouldHazardTick(last, 1000, TICK)).toBe(false); // 同フレーム
    expect(shouldHazardTick(last, 1100, TICK)).toBe(false); // 100ms 後
    expect(shouldHazardTick(last, 1599, TICK)).toBe(false); // 599ms 後(境界手前)
  });

  it('クールダウン経過後(>= tickMs)は再び発火する', () => {
    const last = 1000;
    expect(shouldHazardTick(last, 1600, TICK)).toBe(true); // ちょうど 600ms
    expect(shouldHazardTick(last, 2000, TICK)).toBe(true); // 1000ms 後
  });

  it('発火間隔は tickMs にスケールする', () => {
    expect(shouldHazardTick(0, 299, 300)).toBe(false);
    expect(shouldHazardTick(0, 300, 300)).toBe(true);
  });
});

// ビームの per-target tick 独立性検証。
// Beam.ts は敵ごとに Map<Damageable, number> で lastHitAt を管理し、
// shouldHazardTick(lastHitAt, now, SHOT.beamTickMs) で多重ヒットを間引く。
// 対象 A と対象 B はそれぞれ独立した lastHitAt を持つことが核心的な設計。

describe('shouldHazardTick: ビーム per-target 独立性', () => {
  const BEAM_TICK = 300; // SHOT.beamTickMs と同値

  it('対象 A がヒットした直後でも、対象 B(別の lastHitAt)は間引かれない', () => {
    const now = 5000;
    const lastHitAtA = 5000; // 対象 A: ちょうど今ヒット済み
    const lastHitAtB = -Infinity; // 対象 B: 初回(まだヒットしていない)

    // 対象 A は beamTickMs 未満のため抑制される。
    expect(shouldHazardTick(lastHitAtA, now, BEAM_TICK)).toBe(false);
    // 対象 B は独立した lastHitAt を持つため、A の影響を受けず発火する。
    expect(shouldHazardTick(lastHitAtB, now, BEAM_TICK)).toBe(true);
  });

  it('同一対象は beamTickMs 未満で false、ちょうど beamTickMs 到達で true', () => {
    const lastHitAt = 1000;
    const BEAM_TICK_MS = 300;

    // 境界手前: 299ms 後はまだ間引き中。
    expect(shouldHazardTick(lastHitAt, 1000 + BEAM_TICK_MS - 1, BEAM_TICK_MS)).toBe(false);
    // 境界: ちょうど beamTickMs 経過で再発火。
    expect(shouldHazardTick(lastHitAt, 1000 + BEAM_TICK_MS, BEAM_TICK_MS)).toBe(true);
  });

  it('複数対象が混在しても各 lastHitAt は互いに影響しない(独立した Map エントリのシミュレーション)', () => {
    const now = 10000;
    // 対象ごとに独立した lastHitAt をシミュレートする(Map<Damageable, number> の各エントリに相当)。
    const lastHitAtMap: Record<string, number> = {
      enemyA: 9800, // 200ms 前にヒット済み → beamTickMs=300 未満で抑制
      enemyB: 9600, // 400ms 前にヒット済み → beamTickMs=300 以上で再発火
      enemyC: -Infinity, // 初回 → 必ず発火
    };

    expect(shouldHazardTick(lastHitAtMap['enemyA'], now, BEAM_TICK)).toBe(false);
    expect(shouldHazardTick(lastHitAtMap['enemyB'], now, BEAM_TICK)).toBe(true);
    expect(shouldHazardTick(lastHitAtMap['enemyC'], now, BEAM_TICK)).toBe(true);
  });
});
