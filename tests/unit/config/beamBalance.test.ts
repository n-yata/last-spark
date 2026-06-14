import { describe, it, expect } from 'vitest';
import { SHOT } from '../../../src/config/balance';

// RAY 強化時のビーム(チャージ攻撃強化版)の威力設計検証。
// 設計原則: 総威力をチャージ弾(chargedDamage=3)と同等に収める。
// 実現方法: beamLifespanMs=800 / beamTickMs=300 → 最大 3 ヒット × beamDamage=1 = 3。

describe('ビーム威力設計: チャージ弾と同等の総威力', () => {
  it('最大ヒット回数 × beamDamage がチャージ弾と同等に収まる', () => {
    // t=0, 300, 600ms の 3 タイミングがビーム持続(800ms)に収まる。
    // Math.floor(beamLifespanMs / beamTickMs) は「0ms 発動後に何回 tick できるか」の上限。
    const maxHits = Math.floor(SHOT.beamLifespanMs / SHOT.beamTickMs) + 1; // t=0 の初撃 + 以降の tick
    const totalDamage = maxHits * SHOT.beamDamage;
    expect(totalDamage).toBe(SHOT.chargedDamage);
  });

  it('beamLifespanMs と beamTickMs の比から最大 3 ヒットが得られる', () => {
    // t=0(初撃), t=300, t=600 の 3 回。t=900 は lifespan=800ms を超えるため発動しない。
    const ticksAfterFirst = Math.floor(SHOT.beamLifespanMs / SHOT.beamTickMs);
    expect(ticksAfterFirst).toBe(2); // 300ms 間隔で 2 回追加 → 合計 3 ヒット
  });

  it('beamDamage は 1(1 tick あたりの被ダメを適切な低さに保つ)', () => {
    expect(SHOT.beamDamage).toBe(1);
  });

  it('beamLifespanMs は 800ms(チャージ弾の爽快感と近い持続時間)', () => {
    expect(SHOT.beamLifespanMs).toBe(800);
  });

  it('beamTickMs は 300ms(overlap 毎フレームを 3 ヒットに間引ける間隔)', () => {
    expect(SHOT.beamTickMs).toBe(300);
  });
});

describe('ビーム形状設計: 前方を向く緩い斜めで縦方向の射程を広げる', () => {
  it('splitAngleRad が 0 より大きい(前方向きの斜め: 縦方向を持つ)', () => {
    expect(SHOT.splitAngleRad).toBeGreaterThan(0);
  });

  it('splitAngleRad が π/2(90°)未満(真上下でなく前方カバーを残す)', () => {
    expect(SHOT.splitAngleRad).toBeLessThan(Math.PI / 2);
  });

  it('splitAngleRad は Math.PI/10(約18°)の緩い斜め', () => {
    // 真上下(π/2)にすると正面の敵に当たらないため、π/10 ≈ 18° の緩い斜めにする。
    expect(SHOT.splitAngleRad).toBeCloseTo(Math.PI / 10, 10);
  });
});
