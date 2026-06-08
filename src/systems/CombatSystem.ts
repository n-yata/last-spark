import Phaser from 'phaser';
import type { Damageable } from '../types/combat';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { Projectile } from '../entities/Projectile';

// 衝突登録・ダメージ適用・撃破処理。Scene へはコールバックで通知し、逆依存しない。

export interface CombatCallbacks {
  onHit?: (x: number, y: number, target: 'enemy' | 'boss') => void;
  onEnemyDefeated?: (enemy: Enemy) => void;
  onBossDefeated?: (boss: Boss) => void;
  onPlayerDamaged?: (player: Player) => void;
  onPlayerDeath?: (player: Player) => void;
}

export interface CombatRefs {
  player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  playerShots: Phaser.Physics.Arcade.Group;
  enemyShots: Phaser.Physics.Arcade.Group;
}

export class CombatSystem {
  private readonly scene: Phaser.Scene;
  private readonly callbacks: CombatCallbacks;
  private refs?: CombatRefs;

  constructor(scene: Phaser.Scene, callbacks: CombatCallbacks = {}) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  /** プレイヤー・敵・弾の衝突を登録する。 */
  registerColliders(refs: CombatRefs): void {
    this.refs = refs;
    const physics = this.scene.physics;

    // プレイヤー弾 ⇔ 雑魚敵
    physics.add.overlap(refs.playerShots, refs.enemies, (a, b) => {
      const projectile = this.asProjectile(a, b);
      const enemy = this.asInstance(a, b, Enemy);
      if (!projectile || !enemy || !projectile.active || !enemy.active) return;
      this.hitDamageable(enemy, projectile.damage, projectile.x, projectile.y, 'enemy');
      projectile.deactivate();
      if (enemy.isDead()) this.callbacks.onEnemyDefeated?.(enemy);
    });

    // 敵弾 ⇔ プレイヤー
    physics.add.overlap(refs.enemyShots, refs.player, (a, b) => {
      const projectile = this.asProjectile(a, b);
      if (!projectile || !projectile.active) return;
      this.damagePlayer(refs.player, projectile.damage);
      projectile.deactivate();
    });

    // プレイヤー ⇔ 雑魚敵(接触ダメージ)
    physics.add.overlap(refs.player, refs.enemies, (a, b) => {
      const enemy = this.asInstance(a, b, Enemy);
      if (!enemy || !enemy.active) return;
      this.damagePlayer(refs.player, enemy.contactDamage);
    });
  }

  /** ボス出現時に、ボス関連の衝突を追加登録する。 */
  registerBoss(boss: Boss): void {
    if (!this.refs) return;
    const physics = this.scene.physics;

    // プレイヤー弾 ⇔ ボス
    physics.add.overlap(this.refs.playerShots, boss, (a, b) => {
      const projectile = this.asProjectile(a, b);
      if (!projectile || !projectile.active || boss.isDead()) return;
      this.hitDamageable(boss, projectile.damage, projectile.x, projectile.y, 'boss');
      projectile.deactivate();
      if (boss.isDead()) this.callbacks.onBossDefeated?.(boss);
    });

    // プレイヤー ⇔ ボス(接触ダメージ)
    physics.add.overlap(this.refs.player, boss, () => {
      if (boss.isDead()) return;
      this.damagePlayer(this.refs!.player, boss.contactDamage);
    });
  }

  /** 任意の Damageable にダメージを適用する。 */
  applyDamage(target: Damageable, amount: number): void {
    target.takeDamage(amount);
  }

  private hitDamageable(
    target: Damageable,
    amount: number,
    x: number,
    y: number,
    kind: 'enemy' | 'boss',
  ): void {
    this.applyDamage(target, amount);
    this.callbacks.onHit?.(x, y, kind);
  }

  private damagePlayer(player: Player, amount: number): void {
    const hpBefore = player.hp;
    player.takeDamage(amount);
    if (player.hp !== hpBefore) {
      this.callbacks.onPlayerDamaged?.(player);
    }
    if (player.isDead()) {
      this.callbacks.onPlayerDeath?.(player);
    }
  }

  private asProjectile(a: unknown, b: unknown): Projectile | null {
    if (a instanceof Projectile) return a;
    if (b instanceof Projectile) return b;
    return null;
  }

  private asInstance<T>(a: unknown, b: unknown, ctor: new (...args: never[]) => T): T | null {
    if (a instanceof ctor) return a;
    if (b instanceof ctor) return b;
    return null;
  }
}
