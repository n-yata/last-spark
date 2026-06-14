import { describe, it, expect } from 'vitest';
import { PURIFIER, ENVOY, CONTAINMENT_WARDEN, HAZARD, SHOT } from '../../../src/config/balance';
import { getStageData } from '../../../src/config/stage1';

// stage4「環境管理機(浄化型)」のチューニング検証。固有アクション bloom(動的汚染床)が phase2 で
// 枚数増・幅拡大・存続延長して「安全地帯をじわじわ奪う」設計になっていること、汚染床ダメージが
// 既存スリップダメージ床(HAZARD)と地続きであること、HP 序列・stage4 配線を守る。

describe('PURIFIER(環境管理機)のチューニング', () => {
  it('bloom は phase2 で枚数が増える(安全地帯を面で奪う)', () => {
    expect(PURIFIER.bloom.countP2).toBeGreaterThan(PURIFIER.bloom.countP1);
    expect(PURIFIER.bloom.countP1).toBeGreaterThanOrEqual(1);
  });

  it('bloom は phase2 で床が広く・長持ちする(常設化で位置取りを強制)', () => {
    expect(PURIFIER.bloom.patchWidthP2).toBeGreaterThan(PURIFIER.bloom.patchWidthP1);
    expect(PURIFIER.bloom.lifespanMsP2).toBeGreaterThan(PURIFIER.bloom.lifespanMsP1);
    // 存続時間は正の有限値(時限破棄が成立する)。
    expect(PURIFIER.bloom.lifespanMsP1).toBeGreaterThan(0);
  });

  it('bloom のダメージは既存スリップダメージ床(HAZARD)と地続き(同じ腐食ダメージ)', () => {
    expect(PURIFIER.bloom.damage).toBe(HAZARD.pollutionDamage);
  });

  it('spray は複数弾の扇状散布で、phase2 強化(2連射)の土台がある', () => {
    expect(PURIFIER.spray.count).toBeGreaterThan(1);
    expect(PURIFIER.spray.spreadRad).toBeGreaterThan(0);
    expect(PURIFIER.spray.speed).toBeGreaterThan(0);
  });

  it('bloom アクションの継続時間が定義されている(設置の溜め)', () => {
    expect(PURIFIER.actionDurationMs.bloom).toBeGreaterThan(0);
  });

  it('stage4 のボスは接地型・浄化型(purifier)として設定されている', () => {
    const stage4 = getStageData('stage4');
    expect(stage4.bossKind).toBe('ground');
    expect(stage4.bossVariant).toBe('purifier');
  });

  it('HP 序列(使者26 < 浄化28 < 番人30)を維持する(難易度カーブ)', () => {
    expect(PURIFIER.maxHp).toBeGreaterThan(ENVOY.maxHp);
    expect(PURIFIER.maxHp).toBeLessThan(CONTAINMENT_WARDEN.maxHp);
    // 有限回(現実的な手数)でチャージ弾撃破できる。
    expect(Math.ceil(PURIFIER.maxHp / SHOT.chargedDamage)).toBeLessThanOrEqual(20);
  });
});
