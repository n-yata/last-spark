import Phaser from 'phaser';
import { TEX } from '../config/assetKeys';
import { SHOT, STAGE } from '../config/balance';
import type { ProjectileKind, ProjectileOwner } from '../types/combat';
import { createProjectileSpec } from '../systems/shot';

/** 放物線弾(ミサイル)用の発射オプション。未指定なら直進弾(従来挙動)。 */
export interface ProjectileFireOptions {
  /** 鉛直初速(px/s, 上向き負)。 */
  velocityY?: number;
  /** 重力の影響を受けるか(放物線にする)。既定は false。 */
  gravity?: boolean;
}

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
   * @param options 放物線弾(ミサイル)用の鉛直初速・重力。未指定なら直進弾。
   */
  fire(
    x: number,
    y: number,
    velocityX: number,
    kind: ProjectileKind,
    owner: ProjectileOwner,
    options?: ProjectileFireOptions,
  ): void {
    const spec = createProjectileSpec(kind);
    this.kind = kind;
    this.owner = owner;
    this.damage = spec.damage;

    const texture =
      kind === 'missile'
        ? TEX.projectileMissile
        : kind === 'lance'
          ? TEX.projectileLance
          : owner === 'enemy'
            ? TEX.projectileEnemy
            : kind === 'charged'
              ? TEX.projectileCharged
              : TEX.projectileNormal;
    this.setTexture(texture);
    // プールから再利用するため回転を毎回リセットする。lance は EnvoyBoss が進行方向へ
    // 回転させるため、他用途(直進弾)で再利用される際に前回の角度が残らないようにする。
    this.setRotation(0);

    this.enableBody(true, x, y, true, true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    // プールから再利用するため、重力フラグは毎回明示的に設定する(放物線弾→直進弾の戻りに対応)。
    body.setAllowGravity(options?.gravity ?? false);
    this.setVelocityX(velocityX);
    this.setVelocityY(options?.velocityY ?? 0);
    this.expiresAt = this.scene.time.now + SHOT.lifespanMs;
  }

  /** 命中・画面外などで弾を回収する。 */
  deactivate(): void {
    this.disableBody(true, true);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    // ミサイル/槍弾は敵弾グループ(地面コライダーなし)を進むため、地面をすり抜けて飛び続ける。
    // 下端が地面上端に達したら着弾とみなして回収する(地中に潜って見えるのを防ぐ)。
    if (this.kind === 'missile' || this.kind === 'lance') {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body.bottom >= STAGE.groundY) {
        this.deactivate();
        return;
      }
    }
    if (time >= this.expiresAt) {
      this.deactivate();
    }
  }
}
