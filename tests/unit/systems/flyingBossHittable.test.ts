import { describe, it, expect } from 'vitest';
import { PLAYER, FLYING_BOSS, STAGE, SHOT } from '../../../src/config/balance';
import { getStageData } from '../../../src/config/stage1';

// 飛行ボスが「地上プレイヤーの水平ショットで当てられる」ことと、高度域が地面より上で
// 妥当であることを保証する。接地ボスの bossHittable.test と同じ撃破可能性の思想を、
// 飛行ボスの「急降下(dive)が主要な被弾窓」という設計に対して検証する。

describe('飛行ボスの当たり判定と高度域(撃破可能性)', () => {
  const groundTop = STAGE.groundY;
  // プレイヤーが地面に立ったときの中心 Y(本体下端=地面)。ショットはこの高さで水平に飛ぶ。
  const playerShotY = groundTop - PLAYER.height / 2;

  // 基準滞空高度(本体中心 Y)と上下バブ範囲。
  const hoverCenterY = groundTop - FLYING_BOSS.hoverAltitude;
  const hoverTop = hoverCenterY - FLYING_BOSS.hoverAmplitude;
  const hoverBottom = hoverCenterY + FLYING_BOSS.hoverAmplitude;

  // 急降下の最下点(本体中心 Y)と、そのときの上下範囲。
  const diveCenterY = groundTop - FLYING_BOSS.diveBottomMargin - FLYING_BOSS.height / 2;
  const diveTop = diveCenterY - FLYING_BOSS.height / 2;
  const diveBottom = diveCenterY + FLYING_BOSS.height / 2;

  it('急降下の最下点でボス上下範囲が地上ショットの高さを含む(dive で当てられる)', () => {
    expect(playerShotY).toBeGreaterThanOrEqual(diveTop);
    expect(playerShotY).toBeLessThanOrEqual(diveBottom);
  });

  it('滞空中は地面より十分上にいる(本体下端が地面に触れない)', () => {
    const hoverBodyBottom = hoverBottom + FLYING_BOSS.height / 2;
    expect(hoverBodyBottom).toBeLessThan(groundTop);
  });

  it('基準高度・バブ範囲はステージ天井より下、地面より上で妥当', () => {
    expect(hoverTop).toBeGreaterThan(0);
    expect(diveBottom).toBeLessThanOrEqual(groundTop);
  });

  it('急降下の最下点は滞空高度より低い(降下が下方向への動きになる)', () => {
    expect(diveCenterY).toBeGreaterThan(hoverCenterY);
  });

  it('stage2 のボス出現位置が基準滞空高度に一致する', () => {
    const spawn = getStageData('stage2').bossSpawn;
    expect(spawn.y).toBeCloseTo(hoverCenterY, 5);
  });

  it('stage2 のボス系統が flying である', () => {
    expect(getStageData('stage2').bossKind).toBe('flying');
  });

  it('チャージ弾で有限回(現実的な手数)で撃破できる', () => {
    const chargedHits = Math.ceil(FLYING_BOSS.maxHp / SHOT.chargedDamage);
    expect(chargedHits).toBeLessThanOrEqual(20);
  });
});
