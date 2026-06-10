import Phaser from 'phaser';
import { TEX } from '../config/assetKeys';
import { PLAYER } from '../config/balance';
import type { InputState } from '../types/input';
import type { Damageable } from '../types/combat';
import { isChargedShot, canFire, createProjectileSpec } from '../systems/shot';
import { isDead, isInvincible, resolveInvincibleDamage } from '../systems/combatRules';
import {
  resolveHorizontalVelocity,
  shouldJump,
  resolveFacing,
  facingSign,
  shouldCutJump,
  cutJumpVelocity,
} from '../systems/playerMovement';
import { getSound } from '../systems/SoundManager';
import { CharacterRig } from './CharacterRig';
import type { MotionState } from '../systems/rigAnimation';
import { Projectile } from './Projectile';

// プレイヤー(最後のロボット)。移動/ジャンプ/発射/被弾を担う。

export class Player extends Phaser.Physics.Arcade.Sprite implements Damageable {
  hp: number = PLAYER.maxHp;
  maxHp: number = PLAYER.maxHp;
  facing: 'left' | 'right' = 'right';

  private chargeStartedAt = 0;
  private isCharging = false;
  private chargeReadyNotified = false;
  private lastShotAt = 0;
  private invincibleUntil = 0;
  private isJumping = false;
  private projectiles?: Phaser.Physics.Arcade.Group;
  private readonly rig: CharacterRig;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.player);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER.width, PLAYER.height);
    body.setCollideWorldBounds(false);
    this.setDepth(10);
    // 物理は据え置き、見た目は関節リグへ委譲する(自スプライトは非表示)。
    this.setVisible(false);
    this.rig = new CharacterRig(scene, 'player', 10);
  }

  /** 発射に使う弾プールを設定する。 */
  setProjectiles(group: Phaser.Physics.Arcade.Group): void {
    this.projectiles = group;
  }

  get onGround(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  /** チャージ蓄積の経過時間(ms)。未チャージは 0。 */
  chargeElapsed(now: number): number {
    return this.isCharging ? now - this.chargeStartedAt : 0;
  }

  /** 入力に基づいて移動・ジャンプ・発射を行う。 */
  applyInput(input: InputState, now: number): void {
    this.setVelocityX(resolveHorizontalVelocity(input.moveDir));
    this.facing = resolveFacing(this.facing, input.moveDir);

    // ジャンプ開始(接地中の立ち上がり入力)
    if (shouldJump(input, this.onGround)) {
      this.setVelocityY(PLAYER.jumpVelocity);
      this.isJumping = true;
      getSound().playSe('jump');
    }

    // 可変ジャンプ: 上昇中に離したら上向き速度をカットして低いジャンプにする
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (shouldCutJump(input.jumpHeld, this.isJumping, body.velocity.y)) {
      this.setVelocityY(cutJumpVelocity(body.velocity.y, PLAYER.jumpCutMultiplier));
      this.isJumping = false;
    }
    // 着地(または下降開始)で上昇フェーズを終える
    if (this.onGround && body.velocity.y >= 0) {
      this.isJumping = false;
    }

    // チャージ開始(ショット押下の立ち上がり)
    if (input.shootHeld && !this.isCharging) {
      this.startCharge(now);
    }

    // チャージ成立(しきい値到達)の瞬間に一度だけ通知音
    if (
      this.isCharging &&
      !this.chargeReadyNotified &&
      isChargedShot(this.chargeElapsed(now))
    ) {
      this.chargeReadyNotified = true;
      getSound().playSe('chargeReady');
    }

    // 発射(離した瞬間)
    if (input.shootReleased) {
      this.releaseShot(now);
    }

    this.updateBlink(now);
    this.updateRig(input, now);
  }

  /** 入力・物理状態から MotionState を導出し、リグへ同期する。 */
  private updateRig(input: InputState, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const vy = body.velocity.y;
    let state: MotionState;
    if (!this.onGround) {
      state = vy < 0 ? 'jump' : 'fall';
    } else if (input.moveDir !== 0) {
      state = 'walk';
    } else {
      state = 'idle';
    }
    this.rig.syncTo(this.x, this.y, true, facingSign(this.facing) as 1 | -1);
    this.rig.setMotionState(state);
    this.rig.update(now, vy);
  }

  startCharge(now: number): void {
    this.isCharging = true;
    this.chargeStartedAt = now;
    this.chargeReadyNotified = false;
    getSound().playSe('chargeStart');
  }

  /**
   * 押下を離した際にチャージ成立可否で弾種を決めて発射する。
   * クールダウン中は発射しない。
   */
  releaseShot(now: number): void {
    const elapsed = this.chargeElapsed(now);
    this.isCharging = false;
    this.chargeStartedAt = 0;
    this.chargeReadyNotified = false;

    if (!this.projectiles || !canFire(now, this.lastShotAt)) {
      return;
    }
    this.lastShotAt = now;

    const kind = isChargedShot(elapsed) ? 'charged' : 'normal';
    const dir = facingSign(this.facing);
    const muzzleX = this.x + dir * (PLAYER.width / 2 + 6);
    const projectile = this.projectiles.get(muzzleX, this.y) as Projectile | null;
    if (!projectile) return;
    const velocity = dir * createProjectileSpec(kind).speed;
    projectile.fire(muzzleX, this.y, velocity, kind, 'player');
    this.rig.triggerAttack(now);
    getSound().playSe(kind === 'charged' ? 'shootCharged' : 'shootNormal');
  }

  /** 被弾。無敵中は無効。HP0 で撃破。 */
  takeDamage(amount: number): void {
    const now = this.scene.time.now;
    const wasInvincible = isInvincible(now, this.invincibleUntil);
    const next = resolveInvincibleDamage(
      { hp: this.hp, invincibleUntil: this.invincibleUntil },
      amount,
      now,
      PLAYER.invincibleMs,
    );
    this.hp = next.hp;
    this.invincibleUntil = next.invincibleUntil;
    // 実際に被弾が通った時のみリグをのけぞらせる(無敵中は無反応)。
    if (!wasInvincible) {
      this.rig.triggerHit(now);
    }
    if (this.isDead()) {
      this.setVelocity(0, 0);
    }
  }

  isDead(): boolean {
    return isDead(this.hp);
  }

  /** 被弾後の無敵中は点滅させる(視覚フィードバック)。リグへ適用する。 */
  private updateBlink(now: number): void {
    if (isInvincible(now, this.invincibleUntil)) {
      const phase = Math.floor(now / PLAYER.blinkIntervalMs) % 2;
      this.rig.setAlpha(phase === 0 ? 0.35 : 1);
    } else {
      this.rig.setAlpha(1);
    }
  }

  /** エンティティ破棄時にリグも破棄する(リーク防止)。 */
  override destroy(fromScene?: boolean): void {
    this.rig.destroy();
    super.destroy(fromScene);
  }
}
