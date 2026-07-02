import { describe, it, expect } from 'vitest';
import { resolveRank, isBetterRank, isNewRecord, rankColor } from '../../../src/systems/clearResult';
import { PLAYER, RANK } from '../../../src/config/balance';

describe('resolveRank(被ダメージ基準のランク判定)', () => {
  const maxHp = PLAYER.maxHp; // 16

  it('無被弾(0)は S', () => {
    expect(resolveRank(0, maxHp)).toBe('S');
  });

  it('境界: maxHp × aDamageRatio ちょうどは A', () => {
    expect(resolveRank(maxHp * RANK.aDamageRatio, maxHp)).toBe('A'); // 16 * 0.25 = 4
  });

  it('境界: 閾値を超えたら B', () => {
    expect(resolveRank(maxHp * RANK.aDamageRatio + 1, maxHp)).toBe('B'); // 5
  });

  it('閾値未満の被ダメは A', () => {
    expect(resolveRank(1, maxHp)).toBe('A');
  });

  it('最大被ダメ(maxHp)は B', () => {
    expect(resolveRank(maxHp, maxHp)).toBe('B');
  });

  it('不正値(負・NaN・Infinity)は 0 扱いで S(表示防御)', () => {
    expect(resolveRank(-3, maxHp)).toBe('S');
    expect(resolveRank(Number.NaN, maxHp)).toBe('S');
    expect(resolveRank(Number.POSITIVE_INFINITY, maxHp)).toBe('S');
  });
});

describe('isBetterRank(S > A > B の順序比較)', () => {
  it('未記録(undefined)にはどのランクでも true(初回記録)', () => {
    expect(isBetterRank('S', undefined)).toBe(true);
    expect(isBetterRank('A', undefined)).toBe(true);
    expect(isBetterRank('B', undefined)).toBe(true);
  });

  it('上位ランクのみ true', () => {
    expect(isBetterRank('S', 'A')).toBe(true);
    expect(isBetterRank('S', 'B')).toBe(true);
    expect(isBetterRank('A', 'B')).toBe(true);
  });

  it('同ランク・下位ランクは false(S 保持中に B でクリアしても上書きしない)', () => {
    expect(isBetterRank('S', 'S')).toBe(false);
    expect(isBetterRank('A', 'A')).toBe(false);
    expect(isBetterRank('B', 'B')).toBe(false);
    expect(isBetterRank('A', 'S')).toBe(false);
    expect(isBetterRank('B', 'S')).toBe(false);
    expect(isBetterRank('B', 'A')).toBe(false);
  });
});

describe('isNewRecord(ベスト更新判定)', () => {
  it('既存ベストなし(初回クリア)は false', () => {
    expect(isNewRecord(undefined, 60_000)).toBe(false);
  });

  it('既存ベストより速ければ true', () => {
    expect(isNewRecord(60_000, 59_999)).toBe(true);
  });

  it('既存ベストと同タイム・遅いタイムは false', () => {
    expect(isNewRecord(60_000, 60_000)).toBe(false);
    expect(isNewRecord(60_000, 60_001)).toBe(false);
  });
});

describe('rankColor(表示色の共有マップ)', () => {
  it('各ランクに CSS hex 色を返す', () => {
    expect(rankColor('S')).toBe('#fff27a');
    expect(rankColor('A')).toBe('#37f7d8');
    expect(rankColor('B')).toBe('#cfe9e2');
  });
});
