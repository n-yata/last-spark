import Phaser from 'phaser';
import { FLYING_BOSS, STAGE } from '../config/balance';
import type { MotionState } from '../systems/rigAnimation';
import { pickNextFlyingBossAction, bossActionDuration } from '../systems/bossAi';
import { Boss, DEFAULT_ACTION_DURATION_MS } from './Boss';

// stage2 専用・飛行/浮遊型ボス。Boss を継承し、被ダメ/けぞり/フェーズ/撃破/アリーナ拘束を
// そのまま再利用しつつ、重力なしで空中に滞空し「hover/move/shoot/dive(急降下)」で戦う。
// 接地ボス(stage1)とはアクション集合・上下移動・降下突進で明確に対比する。

export class FlyingBoss extends Boss {
  /** 滞空の基準高度(本体中心 Y)。center = groundY - hoverAltitude。 */
  private readonly hoverCenterY: number;
  /** 上下バブ/復帰の上限(最も高い位置の中心 Y)。 */
  private readonly topY: number;
  /** 急降下の最下点(本体下端が地面近くに来る中心 Y)。 */
  private readonly diveBottomY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, { config: FLYING_BOSS, rigFamily: 'bossFlying', gravity: false });
    this.hoverCenterY = STAGE.groundY - FLYING_BOSS.hoverAltitude;
    this.topY = this.hoverCenterY - FLYING_BOSS.hoverAmplitude;
    this.diveBottomY = STAGE.groundY - FLYING_BOSS.diveBottomMargin - FLYING_BOSS.height / 2;
  }

  /** 現在時刻での目標滞空高度(基準高度 + 正弦バブ)。 */
  private hoverTargetY(now: number): number {
    const t = (now % FLYING_BOSS.hoverPeriodMs) / FLYING_BOSS.hoverPeriodMs;
    return this.hoverCenterY + FLYING_BOSS.hoverAmplitude * Math.sin(t * Math.PI * 2);
  }

  /** 目標高度へ向けて鉛直速度を与える(climbSpeed で頭打ち)。 */
  private followAltitude(now: number): void {
    const dy = this.hoverTargetY(now) - this.y;
    // 距離比例で寄せ、行き過ぎないよう climbSpeed でクランプする。
    const vy = Phaser.Math.Clamp(dy * 6, -FLYING_BOSS.climbSpeed, FLYING_BOSS.climbSpeed);
    this.setVelocityY(vy);
  }

  protected override beginNextAction(now: number, playerX: number): void {
    const next = pickNextFlyingBossAction(this.phase, this.lastAction);
    this.lastAction = next;
    this.currentAction = next;

    const baseDuration = bossActionDuration(
      this.cfg.actionDurationMs,
      next,
      DEFAULT_ACTION_DURATION_MS,
    );
    const factor = this.phase === 'phase2' ? this.cfg.phase2SpeedFactor : 1;
    this.actionEndsAt = now + baseDuration * factor;

    if (next === 'shoot') {
      this.fireVolley(playerX);
    } else if (next === 'move') {
      this.paceDir = this.chooseMoveDir();
    }
    // hover/dive は executeAction 側で毎フレーム処理する(開始時の単発処理は不要)。
  }

  protected override executeAction(playerX: number): void {
    const now = this.scene.time.now;
    switch (this.currentAction) {
      case 'dive': {
        // 急降下: プレイヤーへ水平接近しつつ最下点まで降下する。
        const dir: 1 | -1 = playerX < this.x ? -1 : 1;
        this.setVelocityX(dir * FLYING_BOSS.moveSpeed);
        this.setVelocityY(this.y < this.diveBottomY ? FLYING_BOSS.diveSpeed : 0);
        break;
      }
      case 'move':
        // 高度を保ったまま左右へ展開する。
        this.setVelocityX(this.paceDir * this.cfg.moveSpeed);
        this.followAltitude(now);
        break;
      case 'stagger':
        // けぞり中は空中で停止(反撃チャンス)。
        this.setVelocity(0, 0);
        break;
      case 'hover':
      case 'shoot':
      case 'idle':
      default:
        // その場で滞空し、基準高度へ復帰しながらバブする。
        this.setVelocityX(0);
        this.followAltitude(now);
        break;
    }
  }

  /** 左右(基底) + 上下の可動域でクランプする。 */
  protected override clampToArena(): void {
    super.clampToArena();
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.y < this.topY) {
      this.y = this.topY;
      if (body.velocity.y < 0) this.setVelocityY(0);
    } else if (this.y > this.diveBottomY) {
      this.y = this.diveBottomY;
      if (body.velocity.y > 0) this.setVelocityY(0);
    }
  }

  /** 飛行リグ(脚なし)用のモーション同期。dive=落下姿勢、stagger=被弾色、他=idle。 */
  protected override updateRig(time: number, playerX: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const vy = body.velocity.y;
    const faceDir: 1 | -1 = playerX < this.x ? -1 : 1;
    let state: MotionState;
    if (this.currentAction === 'stagger') {
      state = 'stagger';
    } else if (this.currentAction === 'dive') {
      state = 'fall';
    } else {
      state = 'idle';
    }
    this.rig.syncTo(this.x, this.y, true, faceDir);
    this.rig.setMotionState(state);
    if (state === 'stagger') {
      this.rig.setTint(0xff6b6b);
    } else {
      this.rig.clearTint();
    }
    this.rig.update(time, vy);
  }
}
