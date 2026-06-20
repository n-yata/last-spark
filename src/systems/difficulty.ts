import type { StageTuning } from '../config/balance';
import type { EnemySpawn } from '../config/stages';
import type { DifficultyMode } from '../types/save';

interface DifficultyTuning {
  enemyHpFactor: number;
  enemySpawnMultiplier: number;
  playerDamageMultiplier: number;
  turretIntervalFactor: number;
  walkerSpeedFactor: number;
}

const HARD_EXTRA_SPAWN_OFFSET_PX = 96;

const DIFFICULTY_TUNING: Record<DifficultyMode, DifficultyTuning> = {
  normal: {
    enemyHpFactor: 1,
    enemySpawnMultiplier: 1,
    playerDamageMultiplier: 1,
    turretIntervalFactor: 1,
    walkerSpeedFactor: 1,
  },
  hard: {
    enemyHpFactor: 1.5,
    enemySpawnMultiplier: 1.5,
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

export function applyDifficultyToEnemySpawns(
  spawns: readonly EnemySpawn[],
  difficulty: DifficultyMode,
): EnemySpawn[] {
  const multiplier = DIFFICULTY_TUNING[difficulty].enemySpawnMultiplier;
  if (multiplier <= 1 || spawns.length === 0) return [...spawns];

  const extraCount = Math.floor(spawns.length * (multiplier - 1));
  const extras = spawns
    .filter((_, index) => index % 2 === 1)
    .slice(0, extraCount)
    .map((spawn) => ({
      ...spawn,
      x: spawn.x + HARD_EXTRA_SPAWN_OFFSET_PX,
    }));

  return [...spawns, ...extras];
}

export function playerDamageMultiplier(difficulty: DifficultyMode): number {
  return DIFFICULTY_TUNING[difficulty].playerDamageMultiplier;
}

export function shouldShowStoryForDifficulty(difficulty: DifficultyMode): boolean {
  return difficulty === 'normal';
}

export function shouldSpawnHardModeSecretBoss(difficulty: DifficultyMode, stageId: string): boolean {
  return difficulty === 'hard' && stageId === 'stage6';
}

export function difficultyLabel(difficulty: DifficultyMode): string {
  return difficulty === 'hard' ? 'HARD' : 'NORMAL';
}

export function toggleDifficulty(difficulty: DifficultyMode): DifficultyMode {
  return difficulty === 'hard' ? 'normal' : 'hard';
}
