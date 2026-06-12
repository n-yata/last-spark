import { describe, it, expect } from 'vitest';
import { getStageTuning, NEUTRAL_STAGE_TUNING, STAGE_TUNING } from '../../../src/config/balance';

describe('getStageTuning', () => {
  it('stage1 は中立係数(基準難易度)を返す', () => {
    const tuning = getStageTuning('stage1');
    expect(tuning.walkerSpeedFactor).toBe(1);
    expect(tuning.turretIntervalFactor).toBe(1);
  });

  it('stage2 は stage1 より walker が速い(速度係数 > 1)', () => {
    const stage1 = getStageTuning('stage1');
    const stage2 = getStageTuning('stage2');
    expect(stage2.walkerSpeedFactor).toBeGreaterThan(stage1.walkerSpeedFactor);
  });

  it('stage2 は stage1 より turret の発射が頻繁(間隔係数 < 1)', () => {
    const stage1 = getStageTuning('stage1');
    const stage2 = getStageTuning('stage2');
    expect(stage2.turretIntervalFactor).toBeLessThan(stage1.turretIntervalFactor);
    expect(stage2.turretIntervalFactor).toBeGreaterThan(0);
  });

  it('未知の stageId は中立係数へフォールバックする(進行不能を防ぐ)', () => {
    expect(getStageTuning('stage99')).toEqual(NEUTRAL_STAGE_TUNING);
    expect(getStageTuning('')).toEqual(NEUTRAL_STAGE_TUNING);
  });

  it('定義済みの全ステージの係数は正の値である(停止・逆走しない)', () => {
    for (const tuning of Object.values(STAGE_TUNING)) {
      expect(tuning.walkerSpeedFactor).toBeGreaterThan(0);
      expect(tuning.turretIntervalFactor).toBeGreaterThan(0);
    }
  });
});
