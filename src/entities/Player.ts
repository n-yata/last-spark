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
} from '../systems/playerMovement';
import { Projectile } from './Projectile';

// プレイヤー(最後のロボット)。移動/ジャンプ/発射/被弾を担う。

export class Player extends Phaser.Physics.Arcade.Sprite implements Damageable {
  hp: number = PLAYER.maxHp;
  maxHp: number = PLAYER.maxHp;
  facing: 'left' | 'right' = 'right';

  private chargeStartedAt = 0;
  private isCharging = false;
  private lastShotAt = 0;
  private invincibleUntil = 0;
  private projectiles?: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.player);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER.width, PLAYER.height);
    body.setCollideWorldBounds(false);
    this.setDepth(10);
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
    this.setFlipX(this.facing === 'left');

    if (shouldJump(input, this.onGround)) {
      this.setVelocityY(PLAYER.jumpVelocity);
    }

    // チャージ開始(ショット押下の立ち上がり)
    if (input.shootHeld && !this.isCharging) {
      this.startCharge(now);
    }

    // 発射(離した瞬間)
    if (input.shootReleased) {
      this.releaseShot(now);
    }

    this.updateBlink(now);
  }

  startCharge(now: number): void {
    this.isCharging = true;
    this.chargeStartedAt = now;
  }

  /**
   * 押下を離した際にチャージ成立可否で弾種を決めて発射する。
   * クールダウン中は発射しない。
   */
  releaseShot(now: number): void {
    const elapsed = this.chargeElapsed(now);
    this.isCharging = false;
    this.chargeStartedAt = 0;

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
  }

  /** 被弾。無敵中は無効。HP0 で撃破。 */
  takeDamage(amount: number): void {
    const now = this.scene.time.now;
    const next = resolveInvincibleDamage(
      { hp: this.hp, invincibleUntil: this.invincibleUntil },
      amount,
      now,
      PLAYER.invincibleMs,
    );
    this.hp = next.hp;
    this.invincibleUntil = next.invincibleUntil;
    if (this.isDead()) {
      this.setVelocity(0, 0);
    }
  }

  isDead(): boolean {
    return isDead(this.hp);
  }

  /** 被弾後の無敵中は点滅させる(視覚フィードバック)。 */
  private updateBlink(now: number): void {
    if (isInvincible(now, this.invincibleUntil)) {
      const phase = Math.floor(now / PLAYER.blinkIntervalMs) % 2;
      this.setAlpha(phase === 0 ? 0.35 : 1);
    } else {
      this.setAlpha(1);
    }
  }
}
