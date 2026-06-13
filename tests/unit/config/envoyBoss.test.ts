import { describe, it, expect } from 'vitest';
import { ENVOY, FLYING_BOSS } from '../../../src/config/balance';

// stage5「ECLIPSEの使者(高速型)」のチューニング検証。
// 使者は飛行ボス(stage2)を流用しつつ、「スリムで流線型・高速移動・連続攻撃のヒット&アウェイ」を
// パラメータの調整だけで表現する(アクション集合・重みは共有)。その差分がデータ上で成立していることを守る。

describe('ENVOY(ECLIPSEの使者)のチューニング', () => {
  it('飛行ボスより高速に移動・急降下する(ヒット&アウェイの速さ)', () => {
    expect(ENVOY.moveSpeed).toBeGreaterThan(FLYING_BOSS.moveSpeed);
    expect(ENVOY.diveSpeed).toBeGreaterThan(FLYING_BOSS.diveSpeed);
    // 急降下後すぐ高度へ戻る(「アウェイ」)ため復帰速度も速い。
    expect(ENVOY.climbSpeed).toBeGreaterThan(FLYING_BOSS.climbSpeed);
  });

  it('飛行ボスより手数が多い(各アクションの継続時間が短い)', () => {
    for (const action of ['hover', 'move', 'shoot', 'dive'] as const) {
      const envoy = ENVOY.actionDurationMs[action];
      const flying = FLYING_BOSS.actionDurationMs[action];
      expect(envoy).toBeDefined();
      expect(flying).toBeDefined();
      expect(envoy!).toBeLessThan(flying!);
    }
    // phase2 でさらに行動間隔を詰める(係数が小さいほど短縮が強い)。
    expect(ENVOY.phase2SpeedFactor).toBeLessThan(FLYING_BOSS.phase2SpeedFactor);
  });

  it('スリムで流線型(飛行ボスより小さい機体)', () => {
    expect(ENVOY.width).toBeLessThan(FLYING_BOSS.width);
    expect(ENVOY.height).toBeLessThan(FLYING_BOSS.height);
  });

  it('速い弾でヒット&アウェイの圧を上げる', () => {
    expect(ENVOY.bulletSpeed).toBeGreaterThan(FLYING_BOSS.bulletSpeed);
  });

  it('終盤手前の難易度として飛行ボスよりやや硬い', () => {
    expect(ENVOY.maxHp).toBeGreaterThan(FLYING_BOSS.maxHp);
  });

  it('飛行固有値が破綻しない正の範囲にある(滞空・急降下が成立する)', () => {
    expect(ENVOY.hoverAltitude).toBeGreaterThan(0);
    expect(ENVOY.hoverAmplitude).toBeGreaterThan(0);
    expect(ENVOY.hoverPeriodMs).toBeGreaterThan(0);
    expect(ENVOY.diveBottomMargin).toBeGreaterThanOrEqual(0);
    // phase2 移行比率は (0, 1) の範囲(0%/100% だと移行が成立しない)。
    expect(ENVOY.phase2HpRatio).toBeGreaterThan(0);
    expect(ENVOY.phase2HpRatio).toBeLessThan(1);
  });
});
