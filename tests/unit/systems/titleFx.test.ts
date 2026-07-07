import { describe, it, expect } from 'vitest';
import { logoFlickerAlpha, createMotes, motePosition } from '../../../src/systems/titleFx';

describe('logoFlickerAlpha(ロゴのスパーク明滅)', () => {
  it('値域が [minAlpha, 1] に収まる(広い時刻範囲でサンプリング)', () => {
    for (let ms = 0; ms <= 60_000; ms += 37) {
      const a = logoFlickerAlpha(ms, 0.55);
      expect(a).toBeGreaterThanOrEqual(0.55);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  it('決定論: 同じ時刻には同じ値を返す', () => {
    expect(logoFlickerAlpha(12_345, 0.55)).toBe(logoFlickerAlpha(12_345, 0.55));
  });

  it('単調な明滅ではない(サンプル値が十分に分散する)', () => {
    const samples: number[] = [];
    for (let ms = 0; ms <= 10_000; ms += 111) {
      samples.push(logoFlickerAlpha(ms, 0.55));
    }
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    // 下限付近まで沈む瞬間と、ほぼ全灯の瞬間の両方がある
    expect(min).toBeLessThan(0.7);
    expect(max).toBeGreaterThan(0.95);
  });

  it('minAlpha の不正値(負)は 0 にクランプされる', () => {
    for (let ms = 0; ms <= 5_000; ms += 97) {
      expect(logoFlickerAlpha(ms, -1)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('createMotes(粒パラメータのシード生成)', () => {
  it('同じ (seed, count) は常に同じ結果(決定論)', () => {
    expect(createMotes(0x7a57, 14)).toEqual(createMotes(0x7a57, 14));
  });

  it('異なるシードは異なる結果', () => {
    expect(createMotes(1, 14)).not.toEqual(createMotes(2, 14));
  });

  it('count 個生成され、各値が期待レンジに収まる', () => {
    const motes = createMotes(0x7a57, 14);
    expect(motes).toHaveLength(14);
    for (const m of motes) {
      expect(m.baseX).toBeGreaterThanOrEqual(0);
      expect(m.baseX).toBeLessThanOrEqual(1);
      expect(m.riseSpeed).toBeGreaterThanOrEqual(0.02);
      expect(m.riseSpeed).toBeLessThanOrEqual(0.06);
      expect(m.swayAmp).toBeGreaterThan(0);
      expect(m.size).toBeGreaterThan(0);
      expect(m.baseAlpha).toBeGreaterThan(0);
      expect(m.baseAlpha).toBeLessThanOrEqual(1);
    }
  });
});

describe('motePosition(粒の軌道)', () => {
  const mote = createMotes(0x7a57, 1)[0];
  const W = 960;
  const H = 540;

  it('決定論: 同じ時刻には同じ位置を返す', () => {
    expect(motePosition(mote, 5_000, W, H)).toEqual(motePosition(mote, 5_000, W, H));
  });

  it('時間経過で上昇し(y が減る)、循環して下端へ戻る', () => {
    // riseSpeed(比率/秒)から 1 周期を算出し、周期内の 2 時点で上昇を確認する
    const periodMs = 1000 / mote.riseSpeed;
    // phase による開始位置を避け、progress が小さい時刻を起点にする
    const t0 = (1 - mote.phase) * periodMs + periodMs * 0.1;
    const p0 = motePosition(mote, t0, W, H);
    const p1 = motePosition(mote, t0 + periodMs * 0.2, W, H);
    expect(p1.y).toBeLessThan(p0.y); // 上昇(y 減少)
    // 1 周期後はほぼ同じ y(循環)
    const pLoop = motePosition(mote, t0 + periodMs, W, H);
    expect(pLoop.y).toBeCloseTo(p0.y, 4);
  });

  it('y は常に画面範囲 [0, height] 内', () => {
    for (let ms = 0; ms <= 120_000; ms += 517) {
      const p = motePosition(mote, ms, W, H);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(H);
    }
  });

  it('x が横に揺れる(複数時刻で異なる x を取る)', () => {
    const xs = new Set<number>();
    for (let ms = 0; ms <= 8_000; ms += 400) {
      xs.add(Math.round(motePosition(mote, ms, W, H).x * 100));
    }
    expect(xs.size).toBeGreaterThan(3);
  });

  it('上下端付近ではフェードする(alpha が中央帯より小さい)', () => {
    const periodMs = 1000 / mote.riseSpeed;
    // progress ≈ 0.02(下端付近)と ≈ 0.5(中央)の時刻を作る
    const tEdge = (1 - mote.phase + 0.02) * periodMs;
    const tMid = (1 - mote.phase + 0.5) * periodMs;
    const edge = motePosition(mote, tEdge, W, H);
    const mid = motePosition(mote, tMid, W, H);
    expect(edge.alpha).toBeLessThan(mid.alpha);
    expect(mid.alpha).toBeCloseTo(mote.baseAlpha, 5);
  });
});
