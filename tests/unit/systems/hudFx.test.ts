import { describe, it, expect } from 'vitest';
import {
  entranceFillRatio,
  damageFlashActive,
  flashBlinkOn,
  chargePulseAlpha,
} from '../../../src/systems/hudFx';

describe('entranceFillRatio', () => {
  it('経過 0ms ではフィル率 0 になる', () => {
    expect(entranceFillRatio(0, 900)).toBe(0);
  });

  it('負の経過時間でも 0 にクランプされる', () => {
    expect(entranceFillRatio(-100, 900)).toBe(0);
  });

  it('フィル時間ちょうどで 1 になる', () => {
    expect(entranceFillRatio(900, 900)).toBe(1);
  });

  it('フィル時間を超えても 1 を超えない', () => {
    expect(entranceFillRatio(5000, 900)).toBe(1);
  });

  it('中間では単調増加する(easeOut)', () => {
    const quarter = entranceFillRatio(225, 900);
    const half = entranceFillRatio(450, 900);
    const threeQuarter = entranceFillRatio(675, 900);
    expect(quarter).toBeGreaterThan(0);
    expect(half).toBeGreaterThan(quarter);
    expect(threeQuarter).toBeGreaterThan(half);
    expect(threeQuarter).toBeLessThan(1);
  });

  it('easeOut なので中間点のフィル率は線形(0.5)より進んでいる', () => {
    expect(entranceFillRatio(450, 900)).toBeGreaterThan(0.5);
  });

  it('fillMs が 0 以下なら常に 1(ゼロ除算しない)', () => {
    expect(entranceFillRatio(0, 0)).toBe(1);
    expect(entranceFillRatio(100, -1)).toBe(1);
  });
});

describe('damageFlashActive', () => {
  it('未発生(damagedAt が負)なら false', () => {
    expect(damageFlashActive(1000, -1, 450)).toBe(false);
  });

  it('被ダメ直後(elapsed=0)は true', () => {
    expect(damageFlashActive(1000, 1000, 450)).toBe(true);
  });

  it('窓内(elapsed=flashMs-1)は true', () => {
    expect(damageFlashActive(1449, 1000, 450)).toBe(true);
  });

  it('窓の終端(elapsed=flashMs)で false になる', () => {
    expect(damageFlashActive(1450, 1000, 450)).toBe(false);
  });

  it('現在時刻が被ダメ時刻より前(まだ起きていない)なら false', () => {
    expect(damageFlashActive(900, 1000, 450)).toBe(false);
  });
});

describe('flashBlinkOn', () => {
  it('被ダメの瞬間は明(true)から始まる', () => {
    expect(flashBlinkOn(1000, 1000, 90)).toBe(true);
  });

  it('1 区間進む(elapsed=interval)と暗(false)になる', () => {
    expect(flashBlinkOn(1090, 1000, 90)).toBe(false);
  });

  it('2 区間進むと再び明(true)になる', () => {
    expect(flashBlinkOn(1180, 1000, 90)).toBe(true);
  });

  it('区間の途中では区間開始時の状態を維持する', () => {
    expect(flashBlinkOn(1089, 1000, 90)).toBe(true);
    expect(flashBlinkOn(1179, 1000, 90)).toBe(false);
  });

  it('intervalMs が 0 以下なら常に明(ゼロ除算しない)', () => {
    expect(flashBlinkOn(1234, 1000, 0)).toBe(true);
    expect(flashBlinkOn(1234, 1000, -5)).toBe(true);
  });
});

describe('chargePulseAlpha', () => {
  it('周期が 0 以下なら最大アルファを返す', () => {
    expect(chargePulseAlpha(100, 0, 0.3, 0.8)).toBe(0.8);
    expect(chargePulseAlpha(100, -1, 0.3, 0.8)).toBe(0.8);
  });

  it('最小値と最大値の範囲内で明滅する', () => {
    const samples = [0, 180, 360, 540, 720].map((t) => chargePulseAlpha(t, 720, 0.35, 0.85));
    for (const alpha of samples) {
      expect(alpha).toBeGreaterThanOrEqual(0.35);
      expect(alpha).toBeLessThanOrEqual(0.85);
    }
  });

  it('maxAlpha が minAlpha 未満なら minAlpha にそろえる', () => {
    expect(chargePulseAlpha(180, 720, 0.7, 0.2)).toBe(0.7);
  });
});
