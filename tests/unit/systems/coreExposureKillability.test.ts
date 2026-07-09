import { describe, expect, it } from 'vitest';
import { isCoreDamageOpen, shouldOpenCoreExposure } from '../../../src/systems/coreExposure';
import { bossPhaseForHp } from '../../../src/systems/combatRules';
import { ECLIPSE_CORE } from '../../../src/config/balance';
import type { BossPhase } from '../../../src/types/boss';

// ECLIPSE(CoreBoss)が、露出ゲート(phase1 は露出ウィンドウ中のみ被弾)を通じて
// 実際に HP 0 まで削り切れる=撃破できることを、純粋関数レベルで固定する回帰テスト。
// 撃破できなければ handleClear が呼ばれず、ハードモードの裏ボスも出ない。
//
// 検証の要点: phase の再計算(Boss.update 相当)と takeDamage(露出ゲート)の
// フレーム順序を忠実に再現し、「最後の一撃が露出中に入り HP 0 へ到達する」ことを示す。

/** Boss.update 相当: HP からフェーズを再計算する(毎フレーム先頭で実行される)。 */
function recomputePhase(hp: number): BossPhase {
  return bossPhaseForHp(hp, ECLIPSE_CORE.maxHp);
}

describe('CoreBoss は露出ゲートを通じて撃破可能(裏ボス出現の前提)', () => {
  it('phase2 到達後は常時被弾し、HP 0 まで削り切れる', () => {
    let hp: number = ECLIPSE_CORE.maxHp;
    let phase = recomputePhase(hp);
    let exposedUntil = 0;
    let now = 1000;
    const perHit = 3; // charged 相当

    // フレームループを模す。露出は「summon→掃討」で開くが、ここでは
    // プレイヤーが毎回配下を掃討できた前提でウィンドウを開けて削る。
    let awaitingExposure = false;
    let guard = 0;
    while (hp > 0 && guard < 500) {
      guard += 1;
      now += 16;
      // フレーム先頭: フェーズ再計算(Boss.update 相当)
      phase = recomputePhase(hp);

      // 露出状態更新(CoreBoss.updateExposureState 相当)
      if (phase === 'phase2') {
        exposedUntil = Number.POSITIVE_INFINITY;
      } else {
        // phase1: 配下掃討済みを想定して露出を開ける。
        if (!awaitingExposure && now >= exposedUntil) awaitingExposure = true;
        const activeMinions = 0;
        if (shouldOpenCoreExposure(phase, awaitingExposure, activeMinions)) {
          awaitingExposure = false;
          exposedUntil = now + ECLIPSE_CORE.exposedDurationMs;
        }
      }

      // 被弾(CoreBoss.takeDamage 相当): 露出中のみ HP が減る。
      if (isCoreDamageOpen(phase, exposedUntil, now)) {
        hp = Math.max(0, hp - perHit);
      }
    }

    expect(hp).toBe(0);
    // 最終フェーズは phase2(HP 0 は 50% 以下)。
    expect(recomputePhase(hp)).toBe('phase2');
  });

  it('露出が一度も開かなければ phase1 のまま削れず撃破できない(ゲートの効きを確認)', () => {
    // awaitingExposure が永遠に false(summon が一度も成立しない)場合、
    // phase1 のダメージは通らず HP が減らない = 撃破不能になることを示す。
    let hp: number = ECLIPSE_CORE.maxHp;
    let now = 1000;
    const exposedUntil = 0; // 一度も開かない
    let guard = 0;
    while (hp > 0 && guard < 100) {
      guard += 1;
      now += 16;
      const phase = bossPhaseForHp(hp, ECLIPSE_CORE.maxHp); // 常に phase1(HP 満タン)
      if (isCoreDamageOpen(phase, exposedUntil, now)) {
        hp = Math.max(0, hp - 3);
      }
    }
    // 露出が開かないので HP は満タンのまま = 撃破できない。
    expect(hp).toBe(ECLIPSE_CORE.maxHp);
  });
});
