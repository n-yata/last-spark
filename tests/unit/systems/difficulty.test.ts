import { describe, it, expect } from 'vitest';
import {
  applyDifficultyToEnemySpawns,
  applyDifficultyToStageTuning,
  difficultyLabel,
  loopScaling,
  playerDamageMultiplier,
  pollutionDamageMultiplier,
  shouldSpawnHardModeSecretBoss,
  shouldShowStory,
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

  it('汚染水ダメージは hard でも normal 相当の倍率に固定する', () => {
    expect(pollutionDamageMultiplier('normal')).toBe(1);
    expect(pollutionDamageMultiplier('hard')).toBe(pollutionDamageMultiplier('normal'));
    expect(pollutionDamageMultiplier('hard')).toBeLessThan(playerDamageMultiplier('hard'));
  });

  it('表示ラベルとトグルが難易度に対応する', () => {
    expect(difficultyLabel('normal')).toBe('NORMAL');
    expect(difficultyLabel('hard')).toBe('HARD');
    expect(toggleDifficulty('normal')).toBe('hard');
    expect(toggleDifficulty('hard')).toBe('normal');
  });

  it('normal はストーリーを表示し、hard はストーリーを表示しない', () => {
    expect(shouldShowStory('normal', 1)).toBe(true);
    expect(shouldShowStory('hard', 1)).toBe(false);
  });

  it('normal でも2周目以降はストーリーを表示しない', () => {
    expect(shouldShowStory('normal', 2)).toBe(false);
    expect(shouldShowStory('normal', 3)).toBe(false);
  });

  it('hard は周回数によらずストーリーを表示しない', () => {
    expect(shouldShowStory('hard', 2)).toBe(false);
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

  // ---- 周回スケーリング(loopCount) ----

  it('loopScaling は1周目で無強化(全て1.0)を返す', () => {
    expect(loopScaling(1)).toEqual({
      hp: 1.0,
      spawn: 1.0,
      playerDmg: 1.0,
      turretInterval: 1.0,
      walkerSpeed: 1.0,
    });
  });

  it('loopScaling は周回数が増えるほど強化幅が大きくなる', () => {
    const loop1 = loopScaling(1);
    const loop2 = loopScaling(2);
    const loop3 = loopScaling(3);
    expect(loop2.hp).toBeGreaterThan(loop1.hp);
    expect(loop3.hp).toBeGreaterThan(loop2.hp);
    expect(loop2.turretInterval).toBeLessThan(loop1.turretInterval);
    expect(loop3.turretInterval).toBeLessThan(loop2.turretInterval);
  });

  it('loopScaling は3周目で上限に達し、4周目以降は同じ値のまま頭打ちになる', () => {
    const loop3 = loopScaling(3);
    expect(loopScaling(4)).toEqual(loop3);
    expect(loopScaling(10)).toEqual(loop3);
  });

  it('difficulty系の3関数は loopCount 省略時(既定値)で従来と同じ数値を返す(非破壊)', () => {
    expect(applyDifficultyToStageTuning(NEUTRAL_STAGE_TUNING, 'normal')).toEqual(
      applyDifficultyToStageTuning(NEUTRAL_STAGE_TUNING, 'normal', 1),
    );
    expect(applyDifficultyToStageTuning(NEUTRAL_STAGE_TUNING, 'hard')).toEqual(
      applyDifficultyToStageTuning(NEUTRAL_STAGE_TUNING, 'hard', 1),
    );
    expect(playerDamageMultiplier('hard')).toBe(playerDamageMultiplier('hard', 1));
  });

  it('周回数が増えるとステージ係数がさらに強化される(hard基準に周回乗数が重なる)', () => {
    const hardLoop1 = applyDifficultyToStageTuning(NEUTRAL_STAGE_TUNING, 'hard', 1);
    const hardLoop2 = applyDifficultyToStageTuning(NEUTRAL_STAGE_TUNING, 'hard', 2);
    expect(hardLoop2.enemyHpFactor).toBeGreaterThan(hardLoop1.enemyHpFactor);
    expect(hardLoop2.walkerSpeedFactor).toBeGreaterThan(hardLoop1.walkerSpeedFactor);
    expect(hardLoop2.turretIntervalFactor).toBeLessThan(hardLoop1.turretIntervalFactor);
  });

  it('周回数が増えると被ダメージ倍率も重なって上がる', () => {
    expect(playerDamageMultiplier('normal', 2)).toBeGreaterThan(playerDamageMultiplier('normal', 1));
    expect(playerDamageMultiplier('hard', 3)).toBeGreaterThan(playerDamageMultiplier('hard', 2));
  });

  it('周回数が増えると道中敵配置もさらに増える', () => {
    // normal(素の敵配置倍率=1)を基準にすることで、hard基準の倍率で追加候補の枠(奇数index)が
    // 早々に埋まってしまい周回差が見えなくなる事態を避ける。
    const spawns: EnemySpawn[] = Array.from({ length: 20 }, (_, i) => ({
      pattern: i % 2 === 0 ? 'walker' : 'turret',
      x: i * 100,
      y: 420,
    }));
    const loop1 = applyDifficultyToEnemySpawns(spawns, 'normal', 1);
    const loop3 = applyDifficultyToEnemySpawns(spawns, 'normal', 3);
    expect(loop3.length).toBeGreaterThan(loop1.length);
  });
});
