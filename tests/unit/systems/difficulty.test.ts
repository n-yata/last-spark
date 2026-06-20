import { describe, it, expect } from 'vitest';
import {
  applyDifficultyToEnemySpawns,
  applyDifficultyToStageTuning,
  difficultyLabel,
  playerDamageMultiplier,
  shouldSpawnHardModeSecretBoss,
  shouldShowStoryForDifficulty,
  toggleDifficulty,
} from '../../../src/systems/difficulty';
import { NEUTRAL_STAGE_TUNING } from '../../../src/config/balance';
import type { EnemySpawn } from '../../../src/config/stages';

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

  it('normal はストーリーを表示し、hard はストーリーを表示しない', () => {
    expect(shouldShowStoryForDifficulty('normal')).toBe(true);
    expect(shouldShowStoryForDifficulty('hard')).toBe(false);
  });

  it('裏ボスは hard の stage6 だけで出現する', () => {
    expect(shouldSpawnHardModeSecretBoss('hard', 'stage6')).toBe(true);
    expect(shouldSpawnHardModeSecretBoss('normal', 'stage6')).toBe(false);
    expect(shouldSpawnHardModeSecretBoss('hard', 'stage5')).toBe(false);
  });

  it('normal は道中敵配置数を変えない', () => {
    const spawns: EnemySpawn[] = [
      { pattern: 'walker', x: 100, y: 420 },
      { pattern: 'turret', x: 300, y: 464 },
      { pattern: 'walker', x: 500, y: 420 },
    ];

    const normal = applyDifficultyToEnemySpawns(spawns, 'normal');

    expect(normal).toEqual(spawns);
  });

  it('hard は道中敵配置を増やし、追加敵を元配置からずらす', () => {
    const spawns: EnemySpawn[] = [
      { pattern: 'walker', x: 100, y: 420 },
      { pattern: 'turret', x: 300, y: 464 },
      { pattern: 'walker', x: 500, y: 420 },
      { pattern: 'turret', x: 700, y: 464 },
    ];

    const hard = applyDifficultyToEnemySpawns(spawns, 'hard');

    expect(hard.length).toBeGreaterThan(spawns.length);
    expect(hard.length).toBe(6);
    expect(hard.slice(0, spawns.length)).toEqual(spawns);
    const added = hard.slice(spawns.length);
    expect(added).toHaveLength(2);
    expect(added[0]).toMatchObject({ pattern: spawns[1].pattern, y: spawns[1].y });
    expect(added[0].x).toBeGreaterThan(spawns[1].x);
    expect(added[1]).toMatchObject({ pattern: spawns[3].pattern, y: spawns[3].y });
    expect(added[1].x).toBeGreaterThan(spawns[3].x);
  });
});
