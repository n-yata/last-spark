import { describe, it, expect } from 'vitest';
import { EFFECTS } from '../../../src/config/effects';

// 強化ビーム(RAY 強化 stage6 のチャージ攻撃)発射演出のチューニング不変条件。
// 設計原則: 最上位アクションなので、通常チャージ弾のマズルフラッシュより強い手応えにする
// (より大きな閃光・より多いスパーク噴出)。一方でカメラシェイクは被弾より控えめに留め、
// 自機の攻撃で画面が暴れすぎないようにする(吸収 < ビーム発射 <= 被弾)。

describe('強化ビーム発射演出: 最上位アクションに相応しい手応え', () => {
  const b = EFFECTS.beamFire;
  const m = EFFECTS.muzzle;

  it('マズル閃光が通常チャージ弾の実効スケールより大きい', () => {
    // 通常チャージ弾の実効スケール = muzzle.flashScale × chargedScaleMul。
    // 強化ビームはそれを上回る「最も強い閃光」であること。
    const chargedEffectiveScale = m.flashScale * m.chargedScaleMul;
    expect(b.flashScale).toBeGreaterThan(chargedEffectiveScale);
  });

  it('前方バーストのスパーク数が通常マズルフラッシュより多い(噴出感)', () => {
    expect(b.sparkCount).toBeGreaterThan(m.sparkCount);
  });

  it('スパーク速度・寿命・閃光尺・リング尺がすべて正の値', () => {
    expect(b.sparkSpeedMin).toBeGreaterThan(0);
    expect(b.sparkSpeedMax).toBeGreaterThan(0);
    expect(b.sparkLifespanMs).toBeGreaterThan(0);
    expect(b.flashMs).toBeGreaterThan(0);
    expect(b.ringMs).toBeGreaterThan(0);
    expect(b.ringScaleStart).toBeGreaterThan(0);
  });

  it('スパーク速度の最大が最小以上(範囲が破綻していない)', () => {
    expect(b.sparkSpeedMax).toBeGreaterThanOrEqual(b.sparkSpeedMin);
  });

  it('前方バーストの広がりが 0〜90 度の妥当な範囲', () => {
    // 0 では一直線、90 以上では後方へも飛び不自然。前方コーンとして妥当な範囲に収める。
    expect(b.sparkSpreadDeg).toBeGreaterThan(0);
    expect(b.sparkSpreadDeg).toBeLessThan(90);
  });

  it('発射演出はカメラシェイクを持たない(持続ビームで画面が暴れ続けるのを防ぐ)', () => {
    // 持続ビームは押下中ずっと発射状態のため、揺らすと画面が暴れ続ける。手応えは光演出で表現する。
    expect('shake' in b).toBe(false);
  });

  it('ビーム色基調が Beam 本体のシアン〜白(0x9ffff0)と一致', () => {
    // 発射演出とビーム帯本体の色を揃え、視覚的に同一アクションと認識させる。
    expect(b.color).toBe(0x9ffff0);
  });
});

describe('強化ビーム帯の多層描画: グロー+コア+脈動', () => {
  const v = EFFECTS.beam;

  it('グローは本体より太く、コアは本体より細い(外周の滲み+白熱の中心)', () => {
    expect(v.glowThicknessMul).toBeGreaterThan(1);
    expect(v.coreThicknessMul).toBeLessThan(1);
    expect(v.coreThicknessMul).toBeGreaterThan(0);
  });

  it('各レイヤーのピークアルファが 0〜1 で、コアが最も明るくグローが最も淡い', () => {
    for (const a of [v.bodyAlpha, v.glowAlpha, v.coreAlpha]) {
      expect(a).toBeGreaterThan(0);
      expect(a).toBeLessThanOrEqual(1);
    }
    expect(v.coreAlpha).toBeGreaterThanOrEqual(v.bodyAlpha);
    expect(v.bodyAlpha).toBeGreaterThan(v.glowAlpha);
  });

  it('コアの脈動はグローの呼吸より速い(コア=ちらつき, グロー=ゆっくり)', () => {
    expect(v.corePulseMs).toBeGreaterThan(0);
    expect(v.glowPulseMs).toBeGreaterThan(v.corePulseMs);
  });

  it('脈動の scaleY 範囲が破綻していない(min <= max, 正の値)', () => {
    expect(v.corePulseMin).toBeGreaterThan(0);
    expect(v.corePulseMax).toBeGreaterThanOrEqual(v.corePulseMin);
    expect(v.glowPulseScaleMin).toBeGreaterThan(0);
    expect(v.glowPulseScaleMax).toBeGreaterThanOrEqual(v.glowPulseScaleMin);
  });

  it('フェード尺が正(発光の立ち上がり/収束がある)', () => {
    expect(v.fadeMs).toBeGreaterThan(0);
  });

  it('コア色が白熱(白系)で本体より明るい', () => {
    expect(v.coreColor).toBe(0xffffff);
  });
});
