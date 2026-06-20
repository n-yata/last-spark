import Phaser from 'phaser';
import type { Damageable, ProjectileKind } from '../types/combat';
import { SHOT } from '../config/balance';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { Projectile } from '../entities/Projectile';
import { Beam } from '../entities/Beam';
import { isChargeAbsorbableProjectile, resolvePlayerDamage } from './combatRules';

/** 命中元の種別。弾(ProjectileKind)に加え、持続ビーム('beam')を含む(Beam は Projectile ではない)。 */
type HitKind = ProjectileKind | 'beam';

// 衝突登録・ダメージ適用・撃破処理。Scene へはコールバックで通知し、逆依存しない。

export interface CombatCallbacks {
  /** shotKind は命中元の種別(チャージ弾やビームのヒット演出出し分けに使う)。 */
  onHit?: (x: number, y: number, target: 'enemy' | 'boss', shotKind: HitKind) => void;
  onEnemyDefeated?: (enemy: Enemy) => void;
  onBossDefeated?: (boss: Boss) => void;
  onPlayerDamaged?: (player: Player) => void;
  onPlayerDeath?: (player: Player) => void;
  onProjectileAbsorbed?: (x: number, y: number) => void;
}

export interface CombatRefs {
  player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  playerShots: Phaser.Physics.Arcade.Group;
  enemyShots: Phaser.Physics.Arcade.Group;
  /** 強化ビームのグループ(任意)。指定時のみビーム⇔敵/ボスの当たり判定を登録する。 */
  playerBeams?: Phaser.GameObjects.Group;
}

export interface CombatOptions {
  /** プレイヤーが受けるダメージ倍率。normal=1、hard では 1 より大きい値を使う。 */
  playerDamageMultiplier?: number;
}

export class CombatSystem {
  private readonly scene: Phaser.Scene;
  private readonly callbacks: CombatCallbacks;
  private readonly options: Required<CombatOptions>;
  private refs?: CombatRefs;

  constructor(scene: Phaser.Scene, callbacks: CombatCallbacks = {}, options: CombatOptions = {}) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.options = {
      playerDamageMultiplier: options.playerDamageMultiplier ?? 1,
    };
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
      this.hitDamageable(enemy, projectile.damage, projectile.x, projectile.y, 'enemy', projectile.kind);
      projectile.deactivate();
      if (enemy.isDead()) this.callbacks.onEnemyDefeated?.(enemy);
    });

    // 敵弾 ⇔ プレイヤー
    physics.add.overlap(refs.enemyShots, refs.player, (a, b) => {
      const projectile = this.asProjectile(a, b);
      if (!projectile || !projectile.active) return;
      if (
        refs.player.canAbsorbCharge() &&
        isChargeAbsorbableProjectile(projectile.kind, projectile.owner) &&
        refs.player.absorbCharge(SHOT.absorbChargeMs)
      ) {
        this.callbacks.onProjectileAbsorbed?.(projectile.x, projectile.y);
        projectile.deactivate();
        return;
      }
      this.damagePlayer(
        refs.player,
        projectile.damage,
        projectile.playerDamageMultiplierOverride,
      );
      projectile.deactivate();
    });

    // プレイヤー ⇔ 雑魚敵(接触ダメージ)
    physics.add.overlap(refs.player, refs.enemies, (a, b) => {
      const enemy = this.asInstance(a, b, Enemy);
      if (!enemy || !enemy.active) return;
      this.damagePlayer(refs.player, enemy.contactDamage, enemy.playerDamageMultiplierOverride);
    });

    // プレイヤービーム ⇔ 雑魚敵(強化時の持続レーザー。per-target 間引きで多段ヒット、命中しても消えない)
    if (refs.playerBeams) {
      physics.add.overlap(refs.playerBeams, refs.enemies, (a, b) => {
        const beam = this.asBeam(a, b);
        const enemy = this.asInstance(a, b, Enemy);
        if (!beam || !enemy || !beam.active || !enemy.active) return;
        if (!beam.tryHit(enemy, this.scene.time.now)) return;
        this.hitDamageable(enemy, SHOT.beamDamage, enemy.x, enemy.y, 'enemy', 'beam');
        if (enemy.isDead()) this.callbacks.onEnemyDefeated?.(enemy);
      });
    }
  }

  /** ボス出現時に、ボス関連の衝突を追加登録する。 */
  registerBoss(boss: Boss): void {
    if (!this.refs) return;
    const physics = this.scene.physics;

    // プレイヤー弾 ⇔ ボス
    physics.add.overlap(this.refs.playerShots, boss, (a, b) => {
      const projectile = this.asProjectile(a, b);
      if (!projectile || !projectile.active || boss.isDead()) return;
      this.hitDamageable(boss, projectile.damage, projectile.x, projectile.y, 'boss', projectile.kind);
      projectile.deactivate();
      if (boss.isDead()) this.callbacks.onBossDefeated?.(boss);
    });

    // プレイヤー ⇔ ボス(接触ダメージ)
    physics.add.overlap(this.refs.player, boss, () => {
      if (boss.isDead()) return;
      this.damagePlayer(this.refs!.player, boss.contactDamage);
    });

    // プレイヤービーム ⇔ ボス(強化時の持続レーザー。per-target 間引きで多段ヒット、命中しても消えない)
    if (this.refs.playerBeams) {
      physics.add.overlap(this.refs.playerBeams, boss, (a, b) => {
        const beam = this.asBeam(a, b);
        if (!beam || !beam.active || boss.isDead()) return;
        if (!beam.tryHit(boss, this.scene.time.now)) return;
        this.hitDamageable(boss, SHOT.beamDamage, boss.x, boss.y, 'boss', 'beam');
        if (boss.isDead()) this.callbacks.onBossDefeated?.(boss);
      });
    }
  }

  /** 任意の Damageable にダメージを適用する。 */
  applyDamage(target: Damageable, amount: number): void {
    target.takeDamage(amount);
  }

  /**
   * 環境ダメージ(毒床など)をプレイヤーへ適用する。被弾エフェクト(onPlayerDamaged)・死亡処理
   * (onPlayerDeath)を弾/接触ダメージと同じ共通経路で扱う(Player の無敵時間にも従う)。
   */
  applyPlayerDamage(amount: number): void {
    if (!this.refs) return;
    this.damagePlayer(this.refs.player, amount);
  }

  private hitDamageable(
    target: Damageable,
    amount: number,
    x: number,
    y: number,
    kind: 'enemy' | 'boss',
    shotKind: HitKind,
  ): void {
    if (target instanceof Boss) {
      target.takeDamage(amount, shotKind);
    } else {
      this.applyDamage(target, amount);
    }
    this.callbacks.onHit?.(x, y, kind, shotKind);
  }

  private damagePlayer(
    player: Player,
    amount: number,
    sourceMultiplierOverride?: number,
  ): void {
    const hpBefore = player.hp;
    player.takeDamage(
      resolvePlayerDamage(amount, this.options.playerDamageMultiplier, sourceMultiplierOverride),
    );
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

  private asBeam(a: unknown, b: unknown): Beam | null {
    if (a instanceof Beam) return a;
    if (b instanceof Beam) return b;
    return null;
  }

  private asInstance<T>(a: unknown, b: unknown, ctor: new (...args: never[]) => T): T | null {
    if (a instanceof ctor) return a;
    if (b instanceof ctor) return b;
    return null;
  }
}
