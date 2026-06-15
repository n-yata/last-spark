import { describe, it, expect } from 'vitest';
import { computeSummonXs } from '../../../src/systems/coreSummon';

// ECLIPSE本体(stage6)の配下召喚配置(純粋ロジック)の検証。
// 最重要の不変条件「プレイヤー(RAY)中心 safeRadius 以内には湧かせない」(召喚即接触の理不尽を防ぐ)を守る。

describe('computeSummonXs', () => {
  const SAFE = 140;
  const SPACING = 120;

  it('要求した体数ぶんの座標を返す', () => {
    const xs = computeSummonXs(600, 3, 0, 1200, SAFE, SPACING);
    expect(xs).toHaveLength(3);
  });

  it('十分広いアリーナでは全座標がプレイヤーから safeRadius 以上離れる(重なり=避けられない被弾を防ぐ)', () => {
    const playerX = 600;
    const xs = computeSummonXs(playerX, 3, 0, 1200, SAFE, SPACING);
    for (const x of xs) {
      expect(Math.abs(x - playerX)).toBeGreaterThanOrEqual(SAFE);
    }
  });

  it('プレイヤーの左右両側へ振り分ける(片側に固まらない)', () => {
    const playerX = 600;
    const xs = computeSummonXs(playerX, 3, 0, 1200, SAFE, SPACING);
    expect(xs.some((x) => x > playerX)).toBe(true);
    expect(xs.some((x) => x < playerX)).toBe(true);
  });

  it('同じ側の2体目は spacing ぶん外側へ離れる', () => {
    const playerX = 600;
    // i=0(右,rank0)=740, i=2(右,rank1)=860 で、間隔は spacing(120)。
    const xs = computeSummonXs(playerX, 3, 0, 1200, SAFE, SPACING);
    expect(xs[0]).toBe(playerX + SAFE); // 740
    expect(xs[2]).toBe(playerX + SAFE + SPACING); // 860
    expect(xs[2] - xs[0]).toBe(SPACING);
  });

  it('全座標がアリーナ範囲 [arenaMinX, arenaMaxX] に収まる', () => {
    const xs = computeSummonXs(600, 4, 100, 1100, SAFE, SPACING);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(100);
      expect(x).toBeLessThanOrEqual(1100);
    }
  });

  it('プレイヤーが右端に張り付いていても、安全距離を割る配置は反対側へ折り返す', () => {
    const arenaMinX = 0;
    const arenaMaxX = 1200;
    const playerX = 1150; // 右端付近(右側に safeRadius を確保できない)
    const xs = computeSummonXs(playerX, 3, arenaMinX, arenaMaxX, SAFE, SPACING);
    for (const x of xs) {
      // 右へ置けない分は左へ折り返り、プレイヤーへ safeRadius 未満まで寄らない。
      expect(Math.abs(x - playerX)).toBeGreaterThanOrEqual(SAFE);
      expect(x).toBeGreaterThanOrEqual(arenaMinX);
      expect(x).toBeLessThanOrEqual(arenaMaxX);
    }
  });

  it('左端に張り付いていても安全距離を確保する(対称性)', () => {
    const playerX = 50;
    const xs = computeSummonXs(playerX, 3, 0, 1200, SAFE, SPACING);
    for (const x of xs) {
      expect(Math.abs(x - playerX)).toBeGreaterThanOrEqual(SAFE);
    }
  });

  it('count=0 なら空配列(召喚枠なしの安全動作)', () => {
    expect(computeSummonXs(600, 0, 0, 1200, SAFE, SPACING)).toEqual([]);
  });
});
