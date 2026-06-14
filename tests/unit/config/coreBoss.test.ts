import { describe, it, expect } from 'vitest';
import { ECLIPSE_CORE, BOSS, FLYING_BOSS, CONTAINMENT_WARDEN, PURIFIER, ENVOY } from '../../../src/config/balance';
import { getStageData } from '../../../src/config/stages';

// stage6「ECLIPSE本体」のチューニング検証。最終決戦のラスボスとして全ボス中最も硬く、
// 浮遊して静止し(移動なし)、配下召喚のパラメータが破綻しないことを守る。

describe('ECLIPSE_CORE(ECLIPSE本体)のチューニング', () => {
  it('全ボス中で最も硬い(最終決戦のラスボス)', () => {
    const otherMaxHps = [BOSS.maxHp, FLYING_BOSS.maxHp, CONTAINMENT_WARDEN.maxHp, PURIFIER.maxHp, ENVOY.maxHp];
    for (const hp of otherMaxHps) {
      expect(ECLIPSE_CORE.maxHp).toBeGreaterThan(hp);
    }
  });

  it('浮遊して静止する(移動速度0・ジャンプなし)', () => {
    expect(ECLIPSE_CORE.moveSpeed).toBe(0);
    expect('jumpVelocity' in ECLIPSE_CORE).toBe(false);
  });

  it('配下召喚のパラメータが正で、1回の召喚数は場の上限を超えない', () => {
    expect(ECLIPSE_CORE.summonCount).toBeGreaterThan(0);
    expect(ECLIPSE_CORE.summonMaxActive).toBeGreaterThan(0);
    expect(ECLIPSE_CORE.summonCount).toBeLessThanOrEqual(ECLIPSE_CORE.summonMaxActive);
  });

  it('巨大コア(他ボスより大きい本体)', () => {
    const otherWidths = [BOSS.width, FLYING_BOSS.width, ENVOY.width];
    for (const w of otherWidths) {
      expect(ECLIPSE_CORE.width).toBeGreaterThan(w);
    }
  });

  it('summon アクションの継続時間が定義されている(NaN/クラッシュを防ぐ)', () => {
    expect(ECLIPSE_CORE.actionDurationMs.summon).toBeGreaterThan(0);
  });

  it('phase2 移行比率は (0,1) の範囲(フェーズ移行が成立する)', () => {
    expect(ECLIPSE_CORE.phase2HpRatio).toBeGreaterThan(0);
    expect(ECLIPSE_CORE.phase2HpRatio).toBeLessThan(1);
  });
});

describe('stage6(ECLIPSE支配中枢)のステージ条件', () => {
  it('コア型ボス・最終ステージ(nextStageId なし)・エンディング演出キーを持つ', () => {
    const s = getStageData('stage6');
    expect(s.bossKind).toBe('core');
    expect(s.nextStageId).toBeUndefined();
    expect(s.endingCutsceneKey).toBe('stage6-ending');
  });

  it('stage5 は stage6 へ連結している(最終ステージへの接続)', () => {
    expect(getStageData('stage5').nextStageId).toBe('stage6');
  });
});
