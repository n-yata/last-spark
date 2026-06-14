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
