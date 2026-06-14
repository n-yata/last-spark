import { describe, it, expect } from 'vitest';
import { ENVOY, FLYING_BOSS } from '../../../src/config/balance';

// stage5「ECLIPSEの使者(高速型)」のチューニング検証。
// 使者は飛行ボス(stage2)を継承しつつ、固有アクション lance(高速槍弾)/blink(瞬間移動)で
// 「論理を突きつける高速の刺客」を固有化する。飛行値より速く・小さく・手数が多いこと、
// 固有アクション(lance/blink)の値が破綻しないことを守る。

describe('ENVOY(ECLIPSEの使者)のチューニング', () => {
  it('飛行ボスより高速に移動・急降下する(ヒット&アウェイの速さ)', () => {
    expect(ENVOY.moveSpeed).toBeGreaterThan(FLYING_BOSS.moveSpeed);
    expect(ENVOY.diveSpeed).toBeGreaterThan(FLYING_BOSS.diveSpeed);
    // 急降下後すぐ高度へ戻る(「アウェイ」)ため復帰速度も速い。
    expect(ENVOY.climbSpeed).toBeGreaterThan(FLYING_BOSS.climbSpeed);
  });

  it('飛行ボスより手数が多い(共有アクションの継続時間が短い)', () => {
    // 使者は移動を blink(瞬間移動)に置き換えたため move は持たない。飛行と共有する
    // hover/shoot/dive で「手数の多さ(継続時間の短さ)」を比較する。
    for (const action of ['hover', 'shoot', 'dive'] as const) {
      const envoy = ENVOY.actionDurationMs[action];
      const flying = FLYING_BOSS.actionDurationMs[action];
      expect(envoy).toBeDefined();
      expect(flying).toBeDefined();
      expect(envoy!).toBeLessThan(flying!);
    }
    // phase2 でさらに行動間隔を詰める(係数が小さいほど短縮が強い)。
    expect(ENVOY.phase2SpeedFactor).toBeLessThan(FLYING_BOSS.phase2SpeedFactor);
  });

  it('固有アクション lance/blink の継続時間を持ち、blink が最も鋭い(短い)', () => {
    expect(ENVOY.actionDurationMs.lance).toBeDefined();
    expect(ENVOY.actionDurationMs.blink).toBeDefined();
    // 瞬間移動 blink は lance より短く、鋭いテンポを出す。
    expect(ENVOY.actionDurationMs.blink!).toBeLessThan(ENVOY.actionDurationMs.lance!);
  });

  it('lance は phase2 で本数が増え、速く・時間差で撃つ(非貫通の高速槍弾)', () => {
    expect(ENVOY.lance.countP2).toBeGreaterThan(ENVOY.lance.countP1);
    expect(ENVOY.lance.countP1).toBeGreaterThanOrEqual(1);
    expect(ENVOY.lance.speed).toBeGreaterThan(ENVOY.bulletSpeed); // 通常弾より速い
    expect(ENVOY.lance.intervalMs).toBeGreaterThan(0); // 時間差発射
  });

  it('blink の値が破綻しない正の範囲にある(瞬間移動と残像)', () => {
    expect(ENVOY.blink.dashSpeed).toBeGreaterThan(ENVOY.moveSpeed); // 通常移動より鋭い
    expect(ENVOY.blink.afterimageMs).toBeGreaterThan(0);
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
