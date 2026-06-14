import { describe, it, expect } from 'vitest';
import { SHOT, PLAYER } from '../../../src/config/balance';

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

describe('通常弾2発設計: 正面へ平行に進む2発(RAY強化時・stage6)', () => {
  it('splitOffsetPx が 0 より大きい(マズルから上下に手数を持つ)', () => {
    // velocityY=0 の平行2発を上下にずらすオフセット。0 では2発が重なり1発と等価になる。
    expect(SHOT.splitOffsetPx).toBeGreaterThan(0);
  });

  it('2発の間隔(splitOffsetPx × 2)がプレイヤー本体高さ未満(機体内に収まる控えめな間隔)', () => {
    // 2発の縦間隔(上オフセット + 下オフセット)がプレイヤー高さ(40px)を超えると
    // マズルが機体外に出て不自然になる。機体内に収まる値であることを検証する。
    expect(SHOT.splitOffsetPx * 2).toBeLessThan(PLAYER.height);
  });

  it('splitOffsetPx は 10(設計値通り)', () => {
    expect(SHOT.splitOffsetPx).toBe(10);
  });
});
