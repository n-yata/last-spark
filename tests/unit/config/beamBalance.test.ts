import { describe, it, expect } from 'vitest';
import { SHOT, PLAYER, ENEMY } from '../../../src/config/balance';

// RAY 強化時のビーム(チャージ攻撃強化版)の威力設計検証。
// 設計原則: 終盤の決戦兵器として明確に強い。1 tick で雑魚を触れただけで撃破でき、
// ボスへは最大 3 ヒット(t=0/300/600ms)で総威力がチャージ弾(3)を上回る。
// 実現方法: beamLifespanMs=800 / beamTickMs=300 → 最大 3 ヒット × beamDamage=3。

describe('ビーム威力設計: 雑魚を1撃・ボスへ高火力の決戦兵器', () => {
  it('1 tick の beamDamage が雑魚の最大HP以上(触れただけで撃破できる)', () => {
    // walker(hp2)/turret(hp3) のうち最も硬い個体でも 1 ヒットで倒せること。
    const maxZakoHp = Math.max(ENEMY.walker.hp, ENEMY.turret.hp);
    expect(SHOT.beamDamage).toBeGreaterThanOrEqual(maxZakoHp);
  });

  it('総威力(最大ヒット回数 × beamDamage)がチャージ弾を上回る', () => {
    // t=0, 300, 600ms の 3 タイミングがビーム持続(800ms)に収まる。
    // Math.floor(beamLifespanMs / beamTickMs) は「0ms 発動後に何回 tick できるか」の上限。
    const maxHits = Math.floor(SHOT.beamLifespanMs / SHOT.beamTickMs) + 1; // t=0 の初撃 + 以降の tick
    const totalDamage = maxHits * SHOT.beamDamage;
    expect(totalDamage).toBeGreaterThan(SHOT.chargedDamage);
  });

  it('beamLifespanMs と beamTickMs の比から最大 3 ヒットが得られる', () => {
    // t=0(初撃), t=300, t=600 の 3 回。t=900 は lifespan=800ms を超えるため発動しない。
    const ticksAfterFirst = Math.floor(SHOT.beamLifespanMs / SHOT.beamTickMs);
    expect(ticksAfterFirst).toBe(2); // 300ms 間隔で 2 回追加 → 合計 3 ヒット
  });

  it('beamDamage は 3(雑魚の最大HP=turret3 を 1 撃で削る決戦火力)', () => {
    expect(SHOT.beamDamage).toBe(3);
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
