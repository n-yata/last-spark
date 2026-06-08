import Phaser from 'phaser';
import { TEX } from '../config/assetKeys';
import { BOSS } from '../config/balance';
import type { BossPhase, BossAction } from '../types/boss';
import type { Damageable } from '../types/combat';
import { applyDamageToHp, isDead, bossPhaseForHp } from '../systems/combatRules';
import { pickNextBossAction } from '../systems/bossAi';
import { Projectile } from './Projectile';

// ボス(大型警備機)。HP に応じた 2 フェーズ + 重み付き行動抽選で動く。

export class Boss extends Phaser.Physics.Arcade.Sprite implements Damageable {
  hp: number = BOSS.maxHp;
  maxHp: number = BOSS.maxHp;
  readonly contactDamage: number = BOSS.contactDamage;

  private phase: BossPhase = 'phase1';
  private currentAction: BossAction = 'idle';
  private lastAction: BossAction = 'idle';
  private actionEndsAt = 0;
  private staggerAccumulated = 0;
  private projectiles?: Phaser.Physics.Arcade.Group;
  private isAlive = true; // Phaser の active と区別する撃破フラグ

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.boss);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BOSS.width, BOSS.height);
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.setDepth(9);
  }

  setProjectiles(group: Phaser.Physics.Arcade.Group): void {
    this.projectiles = group;
  }

  getPhase(): BossPhase {
    return this.phase;
  }

  getCurrentAction(): BossAction {
    return this.currentAction;
  }

  /** フェーズ/アクション遷移を駆動する。 */
  override update(time: number, playerX: number): void {
    if (!this.isAlive || this.isDead()) return;
    this.phase = bossPhaseForHp(this.hp, this.maxHp);

    if (time >= this.actionEndsAt) {
      this.beginNextAction(time, playerX);
    }
    this.executeAction(playerX);
  }

  private beginNextAction(now: number, playerX: number): void {
    const next = pickNextBossAction(this.phase, this.lastAction);
    this.lastAction = next;
    this.currentAction = next;

    const baseDuration = BOSS.actionDurationMs[next];
    const factor = this.phase === 'phase2' ? BOSS.phase2SpeedFactor : 1;
    this.actionEndsAt = now + baseDuration * factor;

    // アクション開始時の単発処理
    if (next === 'shoot') {
      this.fireVolley(playerX);
    }
  }

  private executeAction(playerX: number): void {
    const dir = playerX < this.x ? -1 : 1;
    switch (this.currentAction) {
      case 'move':
        this.setVelocityX(dir * BOSS.moveSpeed);
        break;
      case 'charge':
        this.setVelocityX(dir * BOSS.chargeSpeed);
        break;
      case 'idle':
      case 'shoot':
      case 'stagger':
      default:
        this.setVelocityX(0);
        break;
    }
    this.setFlipX(dir > 0);
    this.setTint(this.currentAction === 'stagger' ? 0xff6b6b : 0xffffff);
  }

  private fireVolley(playerX: number): void {
    if (!this.projectiles) return;
    const dir = playerX < this.x ? -1 : 1;
    const muzzleX = this.x + dir * (BOSS.width / 2 + 4);
    // phase2 は弾数を増やして攻勢を強める
    const offsets = this.phase === 'phase2' ? [-24, 0, 24] : [0];
    for (const oy of offsets) {
      const projectile = this.projectiles.get(muzzleX, this.y + oy) as Projectile | null;
      if (!projectile) continue;
      projectile.fire(muzzleX, this.y + oy, dir * BOSS.bulletSpeed, 'normal', 'enemy');
    }
  }

  takeDamage(amount: number): void {
    this.hp = applyDamageToHp(this.hp, amount);
    this.staggerAccumulated += amount;

    // 一定ダメージ蓄積で短時間のけぞる(反撃チャンス)
    if (this.staggerAccumulated >= BOSS.staggerDamageThreshold && !this.isDead()) {
      this.staggerAccumulated = 0;
      this.currentAction = 'stagger';
      this.lastAction = 'stagger';
      this.actionEndsAt = this.scene.time.now + BOSS.actionDurationMs.stagger;
      this.setVelocityX(0);
    }

    if (this.isDead()) {
      this.isAlive = false;
      this.setVelocity(0, 0);
    }
  }

  isDead(): boolean {
    return isDead(this.hp);
  }
}
