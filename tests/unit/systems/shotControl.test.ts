import { describe, it, expect } from 'vitest';
import {
  initialShotState,
  stepShot,
  chargingElapsed,
  type ShotState,
  type ShotAction,
} from '../../../src/systems/shotControl';
import { SHOT } from '../../../src/config/balance';

// フレーム適用ヘルパ: 状態を進め、最後のアクションを返す。
function press(state: ShotState, now: number): { state: ShotState; action: ShotAction } {
  return stepShot(state, { pressed: true, released: false, held: true, now });
}
function hold(state: ShotState, now: number): { state: ShotState; action: ShotAction } {
  return stepShot(state, { pressed: false, released: false, held: true, now });
}
function release(state: ShotState, now: number): { state: ShotState; action: ShotAction } {
  return stepShot(state, { pressed: false, released: true, held: false, now });
}

describe('shotControl: タップでチャージ', () => {
  it('1回目の押下→短時間で離すとチャージ開始(charging)になる', () => {
    let s = initialShotState();
    expect(s.mode).toBe('idle');
    let r = press(s, 1000);
    s = r.state;
    expect(s.mode).toBe('pending');
    expect(r.action).toBe('none');

    r = release(s, 1000 + (SHOT.holdToAutoFireMs - 50)); // 長押し未満
    s = r.state;
    expect(s.mode).toBe('charging');
    expect(r.action).toBe('none');
  });

  it('charging 中はゲージ経過時間が増え、それ以外は 0', () => {
    let s = initialShotState();
    expect(chargingElapsed(s, 5000)).toBe(0); // idle
    s = press(s, 1000).state; // pending
    expect(chargingElapsed(s, 1100)).toBe(0); // pending は 0
    s = release(s, 1050).state; // charging(chargeStartAt=1050)
    expect(chargingElapsed(s, 1050)).toBe(0);
    expect(chargingElapsed(s, 1650)).toBe(600);
  });
});

describe('shotControl: 2回目タップで発射', () => {
  it('チャージ成立後の再タップはチャージ弾を発射する', () => {
    let s = initialShotState();
    s = press(s, 1000).state;
    s = release(s, 1100).state; // charging from 1100
    // しきい値到達後に再タップ
    const r = press(s, 1100 + SHOT.chargeThresholdMs);
    expect(r.action).toBe('fireCharged');
    expect(r.state.mode).toBe('postFire');
  });

  it('チャージ不足での再タップは通常弾になる', () => {
    let s = initialShotState();
    s = press(s, 1000).state;
    s = release(s, 1100).state; // charging from 1100
    const r = press(s, 1100 + (SHOT.chargeThresholdMs - 100)); // 未成立
    expect(r.action).toBe('fireNormal');
    expect(r.state.mode).toBe('postFire');
  });

  it('発射後に離すと待機(idle)へ戻る', () => {
    let s = initialShotState();
    s = press(s, 1000).state;
    s = release(s, 1100).state;
    s = press(s, 1800).state; // fireCharged → postFire
    const r = release(s, 1850); // すぐ離す(タップ)
    expect(r.state.mode).toBe('idle');
    expect(r.action).toBe('none');
  });
});

describe('shotControl: 長押しで連射', () => {
  it('長押ししきい値を超えたら通常弾の連射を開始する', () => {
    let s = initialShotState();
    s = press(s, 0).state; // pending
    // しきい値未満の保持: まだ発火しない
    let r = hold(s, SHOT.holdToAutoFireMs - 10);
    s = r.state;
    expect(s.mode).toBe('pending');
    expect(r.action).toBe('none');
    // しきい値到達: 連射開始(1発目)
    r = hold(s, SHOT.holdToAutoFireMs);
    s = r.state;
    expect(s.mode).toBe('holding');
    expect(r.action).toBe('fireNormal');
  });

  it('連射中はクールダウンごとに発火し、未満では発火しない', () => {
    let s = initialShotState();
    s = press(s, 0).state;
    s = hold(s, SHOT.holdToAutoFireMs).state; // 1発目, lastFireAt=holdToAutoFireMs
    const base = SHOT.holdToAutoFireMs;
    // クールダウン未満: 発火しない
    let r = hold(s, base + SHOT.cooldownMs - 10);
    s = r.state;
    expect(r.action).toBe('none');
    // クールダウン到達: 2発目
    r = hold(s, base + SHOT.cooldownMs);
    s = r.state;
    expect(r.action).toBe('fireNormal');
  });

  it('長押しではチャージしない(charging にならない)', () => {
    let s = initialShotState();
    s = press(s, 0).state;
    s = hold(s, SHOT.holdToAutoFireMs).state; // holding
    expect(chargingElapsed(s, 9999)).toBe(0);
  });

  it('連射中に離すと停止(idle)する', () => {
    let s = initialShotState();
    s = press(s, 0).state;
    s = hold(s, SHOT.holdToAutoFireMs).state; // holding
    const r = release(s, SHOT.holdToAutoFireMs + 50);
    expect(r.state.mode).toBe('idle');
    expect(r.action).toBe('none');
  });
});
