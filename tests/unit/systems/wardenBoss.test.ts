import { describe, it, expect } from 'vitest';
import { PLAYER, CONTAINMENT_WARDEN, STAGE, SHOT } from '../../../src/config/balance';
import { getStageData } from '../../../src/config/stage1';
import { computeLobVelocity, createProjectileSpec } from '../../../src/systems/shot';

// stage3 収容番人(重装ミサイル型)の設定・系統・ミサイル弾道の妥当性を保証する。
// stage1/2 と明確に差別化する固有ギミック(ミサイル)が、実際にプレイヤー周辺へ
// 降り注ぎ、かつ既存の接地ボスとしての撃破可能性も保つことを確認する。

describe('stage3 収容番人(WardenBoss)', () => {
  const groundTop = STAGE.groundY;

  it('stage3 のボス系統が warden である', () => {
    expect(getStageData('stage3').bossKind).toBe('warden');
  });

  it('ボスは地面に接地している(本体下端=地面)', () => {
    const boss = getStageData('stage3').bossSpawn;
    const bossBottom = boss.y + CONTAINMENT_WARDEN.height / 2;
    expect(bossBottom).toBeCloseTo(groundTop, 5);
  });

  it('地上プレイヤーの水平ショットがボスの上下範囲に重なる(撃破可能性)', () => {
    const playerShotY = groundTop - PLAYER.height / 2;
    const boss = getStageData('stage3').bossSpawn;
    const bossTop = boss.y - CONTAINMENT_WARDEN.height / 2;
    const bossBottom = boss.y + CONTAINMENT_WARDEN.height / 2;
    expect(playerShotY).toBeGreaterThanOrEqual(bossTop);
    expect(playerShotY).toBeLessThanOrEqual(bossBottom);
  });

  it('phase2 はミサイル本数が phase1 より多い(攻勢が強まる)', () => {
    expect(CONTAINMENT_WARDEN.missileCountP2).toBeGreaterThan(CONTAINMENT_WARDEN.missileCountP1);
  });

  it('missile アクションの継続時間が定義されている', () => {
    expect(CONTAINMENT_WARDEN.actionDurationMs.missile).toBeGreaterThan(0);
  });

  it('ミサイルは発射点(ボス上部)から着弾点(地面付近)へ放物線で届く', () => {
    const boss = getStageData('stage3').bossSpawn;
    const startX = boss.x;
    const startY = boss.y - CONTAINMENT_WARDEN.height / 2;
    const spec = createProjectileSpec('missile');
    const landY = groundTop - spec.size / 2;
    const targetX = startX + 200;
    const { velocityX, velocityY } = computeLobVelocity(
      startX,
      startY,
      targetX,
      landY,
      spec.speed,
      STAGE.gravityY,
    );
    // 上向き初速で撃ち出され、放物線の落下到達時刻で着弾点 X に届く。
    expect(velocityY).toBeLessThan(0);
    const t = (-velocityY + Math.sqrt(velocityY * velocityY - 2 * STAGE.gravityY * (startY - landY))) /
      STAGE.gravityY;
    expect(startX + velocityX * t).toBeCloseTo(targetX, 3);
  });

  it('チャージ弾で有限回(現実的な手数)で撃破できる', () => {
    const chargedHits = Math.ceil(CONTAINMENT_WARDEN.maxHp / SHOT.chargedDamage);
    expect(chargedHits).toBeLessThanOrEqual(20);
  });
});
