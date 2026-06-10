import { describe, it, expect } from 'vitest';
import {
  clamp,
  walkPhase,
  legSwing,
  squashStretch,
  armRecoil,
  hitLean,
} from '../../../src/systems/rigAnimation';

describe('clamp', () => {
  it('範囲内はそのまま、範囲外は端に丸める', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('walkPhase', () => {
  it('cycle が 0 以下なら 0 を返す(ゼロ除算回避)', () => {
    expect(walkPhase(100, 0)).toBe(0);
    expect(walkPhase(100, -10)).toBe(0);
  });
  it('周期の先頭は 0、半分で π 付近、1周で 2π へ戻る', () => {
    expect(walkPhase(0, 1000)).toBe(0);
    expect(walkPhase(500, 1000)).toBeCloseTo(Math.PI, 5);
    // 1周ちょうどは折り返して 0
    expect(walkPhase(1000, 1000)).toBeCloseTo(0, 5);
  });
  it('負の時刻も正しく折り返す', () => {
    // -250ms は +750ms と同位相
    expect(walkPhase(-250, 1000)).toBeCloseTo(walkPhase(750, 1000), 5);
  });
});

describe('legSwing', () => {
  it('位相 0 で 0、π/2 で +最大、3π/2 で -最大', () => {
    const amp = 0.6;
    expect(legSwing(0, amp)).toBeCloseTo(0, 6);
    expect(legSwing(Math.PI / 2, amp)).toBeCloseTo(amp, 6);
    expect(legSwing((3 * Math.PI) / 2, amp)).toBeCloseTo(-amp, 6);
  });
  it('π で 0 に戻る', () => {
    expect(legSwing(Math.PI, 0.6)).toBeCloseTo(0, 6);
  });
});

describe('squashStretch', () => {
  it('vy=0 は中立(1,1)', () => {
    const s = squashStretch(0);
    expect(s.scaleX).toBeCloseTo(1, 6);
    expect(s.scaleY).toBeCloseTo(1, 6);
  });
  it('上昇(vy<0)は縦伸び・横細り', () => {
    const s = squashStretch(-560);
    expect(s.scaleY).toBeGreaterThan(1);
    expect(s.scaleX).toBeLessThan(1);
  });
  it('下降(vy>0)は縦縮み・横広がり', () => {
    const s = squashStretch(560);
    expect(s.scaleY).toBeLessThan(1);
    expect(s.scaleX).toBeGreaterThan(1);
  });
  it('maxAbsVy を超える速度はクランプされ過剰変形しない', () => {
    const atMax = squashStretch(560);
    const beyond = squashStretch(5600);
    expect(beyond.scaleY).toBeCloseTo(atMax.scaleY, 6);
    expect(beyond.scaleX).toBeCloseTo(atMax.scaleX, 6);
  });
});

describe('armRecoil', () => {
  it('duration が 0 以下なら常に 0', () => {
    expect(armRecoil(0, 0)).toBe(0);
    expect(armRecoil(10, -5)).toBe(0);
  });
  it('elapsed=0 で最大(1)、duration 経過で 0', () => {
    expect(armRecoil(0, 200)).toBe(1);
    expect(armRecoil(200, 200)).toBe(0);
    expect(armRecoil(300, 200)).toBe(0);
  });
  it('範囲内は単調減少する', () => {
    const a = armRecoil(50, 200);
    const b = armRecoil(100, 200);
    const c = armRecoil(150, 200);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    expect(b).toBeCloseTo(0.5, 6);
  });
});

describe('hitLean', () => {
  it('active 中のみ leanRad、非 active は 0', () => {
    expect(hitLean(true)).toBeCloseTo(0.35, 6);
    expect(hitLean(false)).toBe(0);
    expect(hitLean(true, 0.5)).toBeCloseTo(0.5, 6);
  });
});
