import { describe, it, expect } from 'vitest';
import { applyDifficultyToStageTuning, difficultyLabel, playerDamageMultiplier, toggleDifficulty } from '../../../src/systems/difficulty';
import { NEUTRAL_STAGE_TUNING } from '../../../src/config/balance';

describe('difficulty tuning', () => {
  it('normal はステージ係数を変えない', () => {
    expect(applyDifficultyToStageTuning(NEUTRAL_STAGE_TUNING, 'normal')).toEqual(NEUTRAL_STAGE_TUNING);
    expect(playerDamageMultiplier('normal')).toBe(1);
  });

  it('hard は敵を硬く速くし、被ダメージ倍率を上げる', () => {
    const hard = applyDifficultyToStageTuning(NEUTRAL_STAGE_TUNING, 'hard');
    expect(hard.enemyHpFactor).toBeGreaterThan(NEUTRAL_STAGE_TUNING.enemyHpFactor);
    expect(hard.walkerSpeedFactor).toBeGreaterThan(NEUTRAL_STAGE_TUNING.walkerSpeedFactor);
    expect(hard.turretIntervalFactor).toBeLessThan(NEUTRAL_STAGE_TUNING.turretIntervalFactor);
    expect(playerDamageMultiplier('hard')).toBeGreaterThan(1);
  });

  it('表示ラベルとトグルが難易度に対応する', () => {
    expect(difficultyLabel('normal')).toBe('NORMAL');
    expect(difficultyLabel('hard')).toBe('HARD');
    expect(toggleDifficulty('normal')).toBe('hard');
    expect(toggleDifficulty('hard')).toBe('normal');
  });
});
