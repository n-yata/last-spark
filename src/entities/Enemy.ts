import Phaser from 'phaser';
import { TEX } from '../config/assetKeys';
import { ENEMY } from '../config/balance';
import type { EnemyPattern } from '../types/enemy';
import type { Damageable } from '../types/combat';
import { applyDamageToHp, isDead } from '../systems/combatRules';
import { CharacterRig } from './CharacterRig';
import { Projectile } from './Projectile';

// 雑魚敵。walker=地上を往復、turret=固定砲台で前方へ射撃。

export class Enemy extends Phaser.Physics.Arcade.Sprite implements Damageable {
  hp: number;
  maxHp: number;
  readonly pattern: EnemyPattern;
  readonly contactDamage: number;

  private nextShotAt = 0;
  private moveDir: -1 | 1 = -1;
  private turretDir: -1 | 1 = 1;
  private projectiles?: Phaser.Physics.Arcade.Group;
  private readonly rig: CharacterRig;

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
    // 物理は据え置き、見た目は関節リグへ委譲する(自スプライトは非表示)。
    this.setVisible(false);
    this.rig = new CharacterRig(scene, pattern === 'turret' ? 'turret' : 'walker', 8);

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
    this.updateRig(now);
  }

  /** 系統別に MotionState・向きを決めてリグへ同期する。 */
  private updateRig(now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.pattern === 'walker') {
      // walker は向き=進行方向、常時 walk。
      this.rig.syncTo(this.x, this.y, true, this.moveDir);
      this.rig.setMotionState('walk');
    } else {
      // turret は脚なし固定。発射方向を向き、待機姿勢。
      this.rig.syncTo(this.x, this.y, true, this.turretDir);
      this.rig.setMotionState('idle');
    }
    this.rig.update(now, body.velocity.y);
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
  }

  private updateTurret(now: number, playerX: number): void {
    // 砲身は常にプレイヤー方向を向く(発射していなくても照準する)。
    this.turretDir = playerX < this.x ? -1 : 1;
    if (now < this.nextShotAt) return;
    this.nextShotAt = now + ENEMY.turret.shootIntervalMs;
    if (!this.projectiles) return;
    const dir = this.turretDir;
    const muzzleX = this.x + dir * (ENEMY.turret.width / 2 + 4);
    const projectile = this.projectiles.get(muzzleX, this.y) as Projectile | null;
    if (!projectile) return;
    projectile.fire(muzzleX, this.y, dir * ENEMY.turret.bulletSpeed, 'normal', 'enemy');
    this.rig.triggerAttack(now);
  }

  takeDamage(amount: number): void {
    this.hp = applyDamageToHp(this.hp, amount);
    if (this.isDead()) {
      this.disableBody(true, true);
      this.rig.setVisible(false); // 撃破でリグも消す
    } else {
      this.rig.triggerHit(this.scene.time.now);
    }
  }

  isDead(): boolean {
    return isDead(this.hp);
  }

  /** エンティティ破棄時にリグも破棄する(リーク防止)。 */
  override destroy(fromScene?: boolean): void {
    this.rig.destroy();
    super.destroy(fromScene);
  }
}
