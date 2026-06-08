import Phaser from 'phaser';
import { TEX } from '../config/assetKeys';
import { SHOT } from '../config/balance';
import type { ProjectileKind, ProjectileOwner } from '../types/combat';
import { createProjectileSpec } from '../systems/shot';

// 弾(通常/チャージ/敵弾の共通)。オブジェクトプールで再利用する。

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  kind: ProjectileKind = 'normal';
  owner: ProjectileOwner = 'player';
  damage: number = SHOT.normalDamage;
  private expiresAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.projectileNormal);
  }

  /**
   * 弾を発射(プールから再活性化)する。
   * @param velocityX 進行方向 × 速度(符号付き)
   */
  fire(
    x: number,
    y: number,
    velocityX: number,
    kind: ProjectileKind,
    owner: ProjectileOwner,
  ): void {
    const spec = createProjectileSpec(kind);
    this.kind = kind;
    this.owner = owner;
    this.damage = spec.damage;

    const texture =
      owner === 'enemy'
        ? TEX.projectileEnemy
        : kind === 'charged'
          ? TEX.projectileCharged
          : TEX.projectileNormal;
    this.setTexture(texture);

    this.enableBody(true, x, y, true, true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.setVelocityX(velocityX);
    this.setVelocityY(0);
    this.expiresAt = this.scene.time.now + SHOT.lifespanMs;
  }

  /** 命中・画面外などで弾を回収する。 */
  deactivate(): void {
    this.disableBody(true, true);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (time >= this.expiresAt) {
      this.deactivate();
    }
  }
}
