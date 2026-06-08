import Phaser from 'phaser';
import { TEX } from '../config/assetKeys';
import { ENEMY } from '../config/balance';
import type { EnemyPattern } from '../types/enemy';
import type { Damageable } from '../types/combat';
import { applyDamageToHp, isDead } from '../systems/combatRules';
import { Projectile } from './Projectile';

// 雑魚敵。walker=地上を往復、turret=固定砲台で前方へ射撃。

export class Enemy extends Phaser.Physics.Arcade.Sprite implements Damageable {
  hp: number;
  maxHp: number;
  readonly pattern: EnemyPattern;
  readonly contactDamage: number;

  private nextShotAt = 0;
  private moveDir: -1 | 1 = -1;
  private projectiles?: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, x: number, y: number, pattern: EnemyPattern) {
    super(scene, x, y, pattern === 'turret' ? TEX.enemyTurret : TEX.enemyWalker);
    this.pattern = pattern;
    const conf = pattern === 'turret' ? ENEMY.turret : ENEMY.walker;
    this.hp = conf.hp;
    this.maxHp = conf.hp;
    this.contactDamage = conf.contactDamage;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(conf.width, conf.height);
    this.setDepth(8);

    if (pattern === 'turret') {
      body.setAllowGravity(false);
      body.setImmovable(true);
    } else {
      this.setVelocityX(this.moveDir * ENEMY.walker.moveSpeed);
    }
  }

  setProjectiles(group: Phaser.Physics.Arcade.Group): void {
    this.projectiles = group;
  }

  /** 毎フレームの振る舞い。playerX はターゲット方向の決定に使う。 */
  updateBehavior(now: number, playerX: number): void {
    if (!this.active) return;
    if (this.pattern === 'walker') {
      this.updateWalker();
    } else {
      this.updateTurret(now, playerX);
    }
  }

  private updateWalker(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    // 壁/足場端に当たったら反転する
    if (body.blocked.left) {
      this.moveDir = 1;
    } else if (body.blocked.right) {
      this.moveDir = -1;
    }
    this.setVelocityX(this.moveDir * ENEMY.walker.moveSpeed);
    this.setFlipX(this.moveDir > 0);
  }

  private updateTurret(now: number, playerX: number): void {
    if (now < this.nextShotAt) return;
    this.nextShotAt = now + ENEMY.turret.shootIntervalMs;
    if (!this.projectiles) return;
    const dir: -1 | 1 = playerX < this.x ? -1 : 1;
    this.setFlipX(dir > 0);
    const muzzleX = this.x + dir * (ENEMY.turret.width / 2 + 4);
    const projectile = this.projectiles.get(muzzleX, this.y) as Projectile | null;
    if (!projectile) return;
    projectile.fire(muzzleX, this.y, dir * ENEMY.turret.bulletSpeed, 'normal', 'enemy');
  }

  takeDamage(amount: number): void {
    this.hp = applyDamageToHp(this.hp, amount);
    if (this.isDead()) {
      this.disableBody(true, true);
    }
  }

  isDead(): boolean {
    return isDead(this.hp);
  }
}
