import Phaser from 'phaser';
import { CONTAINMENT_WARDEN, STAGE, type WardenBossConfig } from '../config/balance';
import { pickNextWardenBossAction, bossActionDuration } from '../systems/bossAi';
import { computeLobVelocity, createProjectileSpec } from '../systems/shot';
import { Boss, DEFAULT_ACTION_DURATION_MS } from './Boss';
import { Projectile } from './Projectile';

// stage3 専用・収容番人(重装ミサイル型)。Boss を継承し、被ダメ/けぞり/フェーズ/撃破/
// 接地移動・ジャンプ・通常射撃をそのまま再利用しつつ、固有アクション「missile」を足す。
// ミサイルはプレイヤー周辺へ放物線で降り注ぐアーティラリーで、水平に飛ぶ stage1 の通常弾とは
// 軌道・脅威が明確に異なり、移動による回避を強制する。

export class WardenBoss extends Boss {
  /** WardenBossConfig として参照するための型付きエイリアス。 */
  private readonly warden: WardenBossConfig;
  /** containment の外部参照(未注入なら no-op)。 */
  private containmentCtx?: ContainmentContext;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, { config: CONTAINMENT_WARDEN, rigFamily: 'bossWarden', gravity: true });
    this.warden = CONTAINMENT_WARDEN;
  }

  setContainmentContext(ctx: ContainmentContext): void {
    this.containmentCtx = ctx;
  }

  protected override beginNextAction(now: number, playerX: number): void {
    const next = pickNextWardenBossAction(this.phase, this.lastAction);
    this.lastAction = next;
    this.currentAction = next;

    const baseDuration = bossActionDuration(
      this.cfg.actionDurationMs,
      next,
      DEFAULT_ACTION_DURATION_MS,
    );
    const factor = this.phase === 'phase2' ? this.cfg.phase2SpeedFactor : 1;
    this.actionEndsAt = now + baseDuration * factor;

    // アクション開始時の単発処理(基底と同じ shoot/move/jump に加え missile を扱う)。
    if (next === 'shoot') {
      this.fireVolley(playerX);
    } else if (next === 'missile') {
      this.fireMissiles(playerX);
    } else if (next === 'containment') {
      this.fireContainment(playerX);
    } else if (next === 'move') {
      this.paceDir = this.chooseMoveDir();
    } else if (next === 'jump') {
      this.startJump();
    }
    // idle/missile は executeAction の default で停止する(missile 中はその場で撃つ)。
  }

  /**
   * ミサイルを放物線で発射する。フェーズ別の本数を、プレイヤー X を中心に missileSpread 間隔で
   * 左右へ散らして着弾させ、移動による回避を強制する。各弾の水平速度は computeLobVelocity で
   * 「上向き初速 + 重力」から逆算する。
   */
  protected fireMissiles(playerX: number): void {
    if (!this.projectiles) return;
    const spec = createProjectileSpec('missile');
    const count = this.phase === 'phase2' ? this.warden.missileCountP2 : this.warden.missileCountP1;
    // 発射点はボス上部(肩口)。着弾点は地面上端に弾の下端が触れる高さ。
    const startX = this.x;
    const startY = this.y - this.cfg.height / 2;
    const landY = STAGE.groundY - spec.size / 2;

    for (let i = 0; i < count; i++) {
      // 本数の中心が playerX に来るよう左右対称に散らす。
      const offset = (i - (count - 1) / 2) * this.warden.missileSpread;
      const targetX = Phaser.Math.Clamp(playerX + offset, this.arenaMinX, this.arenaMaxX);
      const { velocityX, velocityY } = computeLobVelocity(
        startX,
        startY,
        targetX,
        landY,
        spec.speed,
        STAGE.gravityY,
      );
      const missile = this.projectiles.get(startX, startY) as Projectile | null;
      if (!missile) continue;
      missile.fire(startX, startY, velocityX, 'missile', 'enemy', { velocityY, gravity: true });
    }
    this.rig.triggerAttack(this.scene.time.now);
  }

  /**
   * containment: プレイヤー周辺へ左右の拘束フィールドを立て、横移動の自由を狭めたうえで
   * ミサイルを落とす。「収容番人に追い詰められる」体験を stage3 の攻略テーマとして明示する。
   */
  private fireContainment(playerX: number): void {
    const ctx = this.containmentCtx;
    const isPhase2 = this.phase === 'phase2';
    const widthPx = isPhase2 ? this.warden.containmentWidthP2 : this.warden.containmentWidthP1;
    const durationMs = isPhase2
      ? this.warden.containmentDurationMsP2
      : this.warden.containmentDurationMsP1;
    const centerX = Phaser.Math.Clamp(playerX, this.arenaMinX, this.arenaMaxX);
    ctx?.spawnField(centerX, widthPx, durationMs);
    this.fireMissiles(centerX);
  }
}

export interface ContainmentContext {
  spawnField(centerX: number, widthPx: number, durationMs: number): void;
}
