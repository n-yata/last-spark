import { describe, it, expect } from 'vitest';
import { EFFECTS } from '../../../src/config/effects';

describe('game feel 演出定数: 通常戦闘よりボス戦を強く見せる', () => {
  it('ボス撃破シェイクが通常の敵撃破より強い', () => {
    expect(EFFECTS.shake.bossDefeat.intensity).toBeGreaterThan(EFFECTS.shake.enemyKill.intensity);
    expect(EFFECTS.shake.bossDefeat.durationMs).toBeGreaterThan(EFFECTS.shake.enemyKill.durationMs);
  });

  it('ボスヒットは通常被弾や吸収より控えめだが、通常敵撃破よりは明確に感じる', () => {
    expect(EFFECTS.shake.bossHit.intensity).toBeGreaterThan(EFFECTS.shake.absorb.intensity);
    expect(EFFECTS.shake.bossHit.intensity).toBeLessThan(EFFECTS.shake.playerDamage.intensity);
  });

  it('ボス命中時の impactSpark は通常ヒットより強い設定を持つ', () => {
    expect(EFFECTS.impactSpark.bossCountMul).toBeGreaterThan(1);
    expect(EFFECTS.impactSpark.bossScaleMul).toBeGreaterThan(1);
    expect(EFFECTS.impactSpark.bossSpeedMul).toBeGreaterThan(1);
  });
});

describe('game feel 演出定数: 着地と被弾の手応え', () => {
  it('強い着地は通常着地より大きく揺れる', () => {
    expect(EFFECTS.shake.landingHard.intensity).toBeGreaterThan(EFFECTS.shake.landingSoft.intensity);
    expect(EFFECTS.shake.landingHard.durationMs).toBeGreaterThan(EFFECTS.shake.landingSoft.durationMs);
  });

  it('着地ダストと被弾フラッシュの値が妥当な正値を持つ', () => {
    expect(EFFECTS.landing.dustCount).toBeGreaterThan(0);
    expect(EFFECTS.landing.dustSpeedMax).toBeGreaterThan(EFFECTS.landing.dustSpeedMin);
    expect(EFFECTS.landing.hardScaleMul).toBeGreaterThan(1);
    expect(EFFECTS.playerDamageFlash.alpha).toBeGreaterThan(0);
    expect(EFFECTS.playerDamageFlash.alpha).toBeLessThan(1);
    expect(EFFECTS.playerDamageFlash.durationMs).toBeGreaterThan(0);
  });
});

describe('game feel 演出定数: ボス登場と phase 移行', () => {
  it('ボス登場/phase移行の演出尺とサイズが正の値を持つ', () => {
    expect(EFFECTS.bossPresentation.introMs).toBeGreaterThan(0);
    expect(EFFECTS.bossPresentation.introBandHeight).toBeGreaterThan(0);
    expect(EFFECTS.bossPresentation.phaseShiftDurationMs).toBeGreaterThan(0);
    expect(EFFECTS.bossPresentation.phaseShiftRingRadiusEnd).toBeGreaterThan(
      EFFECTS.bossPresentation.phaseShiftRingRadiusStart,
    );
  });

  it('画面フラッシュのアルファは視認性を壊さない範囲に収まる', () => {
    expect(EFFECTS.bossPresentation.introOverlayAlpha).toBeGreaterThan(0);
    expect(EFFECTS.bossPresentation.introOverlayAlpha).toBeLessThan(0.3);
    expect(EFFECTS.bossPresentation.phaseShiftFlashAlpha).toBeGreaterThan(0);
    expect(EFFECTS.bossPresentation.phaseShiftFlashAlpha).toBeLessThan(0.3);
  });
});
