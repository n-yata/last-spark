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
  // アリーナ内に閉じ込める中心 X の可動域。未設定時は無制限。
  private arenaMinX = -Infinity;
  private arenaMaxX = Infinity;
  // 前後移動の現在向き(move/jump 開始時に決め直す)。
  private paceDir: -1 | 1 = -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.boss);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BOSS.width, BOSS.height);
    // 重力ありの接地エンティティ(ジャンプ可能)。地面コライダーは GameScene 側で登録する。
    body.setAllowGravity(true);
    body.setImmovable(false);
    this.setDepth(9);
  }

  private get onGround(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  setProjectiles(group: Phaser.Physics.Arcade.Group): void {
    this.projectiles = group;
  }

  /** アリーナの左右端(ワールド座標)を与え、ボスがその外へ出ないようにする。 */
  setArenaBounds(left: number, right: number): void {
    const halfW = BOSS.width / 2;
    this.arenaMinX = left + halfW;
    this.arenaMaxX = right - halfW;
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
    this.clampToArena();
  }

  /** アリーナ範囲外へ出ようとしたら押し戻し、その方向の速度を止める。 */
  private clampToArena(): void {
    if (this.x < this.arenaMinX) {
      this.x = this.arenaMinX;
      this.setVelocityX(0);
    } else if (this.x > this.arenaMaxX) {
      this.x = this.arenaMaxX;
      this.setVelocityX(0);
    }
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
    } else if (next === 'move') {
      this.paceDir = this.chooseMoveDir();
    } else if (next === 'jump') {
      this.startJump();
    }
  }

  /** 前後移動の向きを決める。アリーナ端付近では内側へ向ける。 */
  private chooseMoveDir(): -1 | 1 {
    const margin = 120;
    if (this.x <= this.arenaMinX + margin) return 1;
    if (this.x >= this.arenaMaxX - margin) return -1;
    return Math.random() < 0.5 ? -1 : 1;
  }

  /** 接地中ならジャンプし、着地までの水平ドリフト向きを決める。 */
  private startJump(): void {
    if (this.onGround) {
      this.setVelocityY(BOSS.jumpVelocity);
    }
    this.paceDir = this.chooseMoveDir();
  }

  private executeAction(playerX: number): void {
    // 弾・向きはプレイヤー方向。移動は前後ペース(paceDir)で行う。
    const faceDir = playerX < this.x ? -1 : 1;
    switch (this.currentAction) {
      case 'move':
        this.setVelocityX(this.paceDir * BOSS.moveSpeed);
        break;
      case 'jump':
        this.setVelocityX(this.paceDir * BOSS.moveSpeed * 0.6); // 空中の水平ドリフト
        break;
      case 'idle':
      case 'shoot':
      case 'stagger':
      default:
        this.setVelocityX(0);
        break;
    }
    this.setFlipX(faceDir > 0);
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
