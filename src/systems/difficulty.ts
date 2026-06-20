import type { StageTuning } from '../config/balance';
import type { DifficultyMode } from '../types/save';

interface DifficultyTuning {
  enemyHpFactor: number;
  playerDamageMultiplier: number;
  turretIntervalFactor: number;
  walkerSpeedFactor: number;
}

const DIFFICULTY_TUNING: Record<DifficultyMode, DifficultyTuning> = {
  normal: {
    enemyHpFactor: 1,
    playerDamageMultiplier: 1,
    turretIntervalFactor: 1,
    walkerSpeedFactor: 1,
  },
  hard: {
    enemyHpFactor: 1.5,
    playerDamageMultiplier: 1.5,
    turretIntervalFactor: 0.8,
    walkerSpeedFactor: 1.15,
  },
} as const;

export function applyDifficultyToStageTuning(
  tuning: StageTuning,
  difficulty: DifficultyMode,
): StageTuning {
  const modifier = DIFFICULTY_TUNING[difficulty];
  return {
    enemyHpFactor: tuning.enemyHpFactor * modifier.enemyHpFactor,
    walkerSpeedFactor: tuning.walkerSpeedFactor * modifier.walkerSpeedFactor,
    turretIntervalFactor: tuning.turretIntervalFactor * modifier.turretIntervalFactor,
  };
}

export function playerDamageMultiplier(difficulty: DifficultyMode): number {
  return DIFFICULTY_TUNING[difficulty].playerDamageMultiplier;
}

export function difficultyLabel(difficulty: DifficultyMode): string {
  return difficulty === 'hard' ? 'HARD' : 'NORMAL';
}

export function toggleDifficulty(difficulty: DifficultyMode): DifficultyMode {
  return difficulty === 'hard' ? 'normal' : 'hard';
}
