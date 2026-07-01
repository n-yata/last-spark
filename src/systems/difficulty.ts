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

interface LoopTuning {
  hp: number;
  spawn: number;
  playerDmg: number;
  turretInterval: number;
  walkerSpeed: number;
}

/** 周回スケーリング上限(この周回数で頭打ちになり、以降は増えない)。 */
const LOOP_SCALING_CAP = 3;

/**
 * 周回数に応じた追加の強化乗数。既存の難易度係数(DIFFICULTY_TUNING)へ後段で重ねて乗算する。
 * index=0 は1周目(全て1.0=無強化)。3周目(index=2)で上限に達し、4周目以降も同じ値を使う。
 */
const LOOP_SCALING: readonly LoopTuning[] = [
  { hp: 1.0, spawn: 1.0, playerDmg: 1.0, turretInterval: 1.0, walkerSpeed: 1.0 },
  { hp: 1.25, spawn: 1.2, playerDmg: 1.15, turretInterval: 0.9, walkerSpeed: 1.08 },
  { hp: 1.5, spawn: 1.4, playerDmg: 1.3, turretInterval: 0.82, walkerSpeed: 1.15 },
];

/** loopCount(1始まり)に対応する周回スケーリングを返す。3周目以降は頭打ちで固定する。 */
export function loopScaling(loopCount: number): LoopTuning {
  const index = Math.min(Math.max(Math.floor(loopCount), 1), LOOP_SCALING_CAP) - 1;
  return LOOP_SCALING[index];
}

export function applyDifficultyToStageTuning(
  tuning: StageTuning,
  difficulty: DifficultyMode,
  loopCount = 1,
): StageTuning {
  const modifier = DIFFICULTY_TUNING[difficulty];
  const loop = loopScaling(loopCount);
  return {
    enemyHpFactor: tuning.enemyHpFactor * modifier.enemyHpFactor * loop.hp,
    walkerSpeedFactor: tuning.walkerSpeedFactor * modifier.walkerSpeedFactor * loop.walkerSpeed,
    turretIntervalFactor:
      tuning.turretIntervalFactor * modifier.turretIntervalFactor * loop.turretInterval,
  };
}

export function applyDifficultyToEnemySpawns(
  spawns: readonly EnemySpawn[],
  difficulty: DifficultyMode,
  loopCount = 1,
): EnemySpawn[] {
  const multiplier = DIFFICULTY_TUNING[difficulty].enemySpawnMultiplier * loopScaling(loopCount).spawn;
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

export function playerDamageMultiplier(difficulty: DifficultyMode, loopCount = 1): number {
  return DIFFICULTY_TUNING[difficulty].playerDamageMultiplier * loopScaling(loopCount).playerDmg;
}

export function pollutionDamageMultiplier(_difficulty: DifficultyMode): number {
  return DIFFICULTY_TUNING.normal.playerDamageMultiplier;
}

/**
 * 現在の難易度・周回数でストーリー演出(開始/救出/エンディング)を表示すべきかを返す。
 * hard は従来どおり非表示。normal でも2周目以降(loopCount>=2)はテンポ重視でスキップする。
 */
export function shouldShowStory(difficulty: DifficultyMode, loopCount: number): boolean {
  return difficulty === 'normal' && loopCount < 2;
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
