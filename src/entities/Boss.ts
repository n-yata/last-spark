import Phaser from 'phaser';
import { TEX } from '../config/assetKeys';
import { BOSS, BOSS_SHIELD, SHOT, STAGE, type BossConfig } from '../config/balance';
import type { RigFamily } from '../config/characterRig';
import type { BossPhase, BossAction } from '../types/boss';
import type { Damageable } from '../types/combat';
import {
  applyDamageToHp,
  isDead,
  bossPhaseForHp,
  resolveBossShieldHit,
  type ShieldHitKind,
} from '../systems/combatRules';
import { pickNextBossAction, bossActionDuration } from '../systems/bossAi';
import { CharacterRig } from './CharacterRig';
import type { MotionState } from '../systems/rigAnimation';
import { Projectile } from './Projectile';

// ボス(大型警備機)。HP に応じた 2 フェーズ + 重み付き行動抽選で動く。
// 設定(BossConfig)・リグ系統・重力有無をコンストラクタで差し替え可能にし、
// 接地型(stage1)と飛行型(stage2, FlyingBoss サブクラス)で共通ロジックを再利用する。
// 既定引数は接地ボスそのものなので、stage1 の挙動はリファクタ前と同一に保たれる。

/** Boss 生成オプション。未指定時は接地ボス(stage1)として振る舞う。 */
export interface BossOptions {
  /** チューニング設定。既定は接地ボスの BOSS。 */
  config?: BossConfig;
  /** 描画リグ系統。既定は 'boss'。 */
  rigFamily?: RigFamily;
  /** 重力の影響を受けるか。既定は true(接地型)。飛行型は false。 */
  gravity?: boolean;
}

/** actionDurationMs に該当キーがないときの継続時間フォールバック(ms)。 */
export const DEFAULT_ACTION_DURATION_MS = 700;

export class Boss extends Phaser.Physics.Arcade.Sprite implements Damageable {
  hp: number;
  maxHp: number;
  shieldHp: number = BOSS_SHIELD.maxHp;
  readonly contactDamage: number;

  /** 系統別チューニング設定。サブクラスからも参照する。 */
  protected readonly cfg: BossConfig;

  protected phase: BossPhase = 'phase1';
  protected currentAction: BossAction = 'idle';
  protected lastAction: BossAction = 'idle';
  protected actionEndsAt = 0;
  protected heldUntil = 0;
  protected staggerAccumulated = 0;
  protected projectiles?: Phaser.Physics.Arcade.Group;
  protected isAlive = true; // Phaser の active と区別する撃破フラグ
  // アリーナ内に閉じ込める中心 X の可動域。未設定時は無制限。
  protected arenaMinX = -Infinity;
  protected arenaMaxX = Infinity;
  // 前後移動の現在向き(move/jump 開始時に決め直す)。
  protected paceDir: -1 | 1 = -1;
  // 射撃の狙い高さ(プレイヤーの Y)。update 毎に更新し、fireVolley が参照する。
  protected targetY: number;
  protected readonly rig: CharacterRig;

  constructor(scene: Phaser.Scene, x: number, y: number, options?: BossOptions) {
    super(scene, x, y, TEX.boss);
    const cfg = options?.config ?? BOSS;
    const rigFamily = options?.rigFamily ?? 'boss';
    const gravity = options?.gravity ?? true;
    this.cfg = cfg;
    this.hp = cfg.maxHp;
    this.maxHp = cfg.maxHp;
    this.contactDamage = cfg.contactDamage;
    this.targetY = y;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(cfg.width, cfg.height);
    // 接地型は重力あり(ジャンプ可能、地面コライダーは GameScene 側で登録)。
    // 飛行型は重力なしで空中に滞空する。
    body.setAllowGravity(gravity);
    body.setImmovable(false);
    this.setDepth(9);
    // 物理は据え置き、見た目は関節リグへ委譲する(自スプライトは非表示)。
    this.setVisible(false);
    this.rig = new CharacterRig(scene, rigFamily, 9);
  }

  protected get onGround(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  setProjectiles(group: Phaser.Physics.Arcade.Group): void {
    this.projectiles = group;
  }

  /** アリーナの左右端(ワールド座標)を与え、ボスがその外へ出ないようにする。 */
  setArenaBounds(left: number, right: number): void {
    const halfW = this.cfg.width / 2;
    this.arenaMinX = left + halfW;
    this.arenaMaxX = right - halfW;
  }

  getPhase(): BossPhase {
    return this.phase;
  }

  /** フェーズ2移行の HP 比率(HUD の目盛り表示に使う)。 */
  get phase2HpRatio(): number {
    return this.cfg.phase2HpRatio;
  }

  getCurrentAction(): BossAction {
    return this.currentAction;
  }

  /** 登場演出などのため、短時間だけ自律行動を止める。 */
  holdFor(durationMs: number): void {
    this.heldUntil = Math.max(this.heldUntil, this.scene.time.now + durationMs);
    this.actionEndsAt = this.heldUntil;
    this.currentAction = 'idle';
    this.setVelocity(0, 0);
  }

  /** フェーズ/アクション遷移を駆動する。 */
  override update(time: number, playerX: number, playerY: number): void {
    if (!this.isAlive || this.isDead()) return;
    this.phase = bossPhaseForHp(this.hp, this.maxHp);
    // 射撃はプレイヤーの高さを狙う(ボス中心はプレイヤーより高く、水平発射だと頭上を越すため)。
    this.targetY = playerY;

    if (time < this.heldUntil) {
      this.currentAction = 'idle';
      this.setVelocity(0, 0);
      this.updateRig(time, playerX);
      return;
    }

    if (time >= this.actionEndsAt) {
      this.beginNextAction(time, playerX);
    }
    this.executeAction(playerX);
    this.clampToArena();
    this.updateRig(time, playerX);
  }

  /** 現在のアクション・物理状態から MotionState を導出し、リグへ同期する。 */
  protected updateRig(time: number, playerX: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const vy = body.velocity.y;
    const faceDir: 1 | -1 = playerX < this.x ? -1 : 1;
    let state: MotionState;
    if (this.currentAction === 'stagger') {
      state = 'stagger';
    } else if (!this.onGround) {
      state = vy < 0 ? 'jump' : 'fall';
    } else if (this.currentAction === 'move') {
      state = 'walk';
    } else {
      state = 'idle';
    }
    this.rig.syncTo(this.x, this.y, true, faceDir);
    this.rig.setMotionState(state);
    // stagger 中は被弾色、それ以外は通常色。
    if (state === 'stagger') {
      this.rig.setTint(0xff6b6b);
    } else {
      this.rig.clearTint();
    }
    this.rig.update(time, vy);
  }

  /** アリーナ範囲外へ出ようとしたら押し戻し、その方向の速度を止める。 */
  protected clampToArena(): void {
    if (this.x < this.arenaMinX) {
      this.x = this.arenaMinX;
      this.setVelocityX(0);
    } else if (this.x > this.arenaMaxX) {
      this.x = this.arenaMaxX;
      this.setVelocityX(0);
    }
  }

  protected beginNextAction(now: number, playerX: number): void {
    const next = pickNextBossAction(this.phase, this.lastAction);
    this.lastAction = next;
    this.currentAction = next;

    const baseDuration = bossActionDuration(
      this.cfg.actionDurationMs,
      next,
      DEFAULT_ACTION_DURATION_MS,
    );
    const factor = this.phase === 'phase2' ? this.cfg.phase2SpeedFactor : 1;
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
  protected chooseMoveDir(): -1 | 1 {
    const margin = 120;
    if (this.x <= this.arenaMinX + margin) return 1;
    if (this.x >= this.arenaMaxX - margin) return -1;
    return Math.random() < 0.5 ? -1 : 1;
  }

  /** 接地中ならジャンプし、着地までの水平ドリフト向きを決める。 */
  protected startJump(): void {
    if (this.onGround && this.cfg.jumpVelocity !== undefined) {
      this.setVelocityY(this.cfg.jumpVelocity);
    }
    this.paceDir = this.chooseMoveDir();
  }

  protected executeAction(_playerX: number): void {
    // 移動は前後ペース(paceDir)で行う。向き・ティントはリグ側(updateRig)で扱う。
    switch (this.currentAction) {
      case 'move':
        this.setVelocityX(this.paceDir * this.cfg.moveSpeed);
        break;
      case 'jump':
        this.setVelocityX(this.paceDir * this.cfg.moveSpeed * 0.6); // 空中の水平ドリフト
        break;
      case 'idle':
      case 'shoot':
      case 'stagger':
      default:
        this.setVelocityX(0);
        break;
    }
  }

  protected fireVolley(playerX: number): void {
    if (!this.projectiles) return;
    const dir = playerX < this.x ? -1 : 1;
    const muzzleX = this.x + dir * (this.cfg.width / 2 + 4);
    // 弾はプレイヤーの高さ(targetY)を中心に発射する。ボス中心はプレイヤーより
    // 高いため、ボス中心から水平発射すると頭上を越えて当たらない不具合になる。
    const baseY = this.targetY;
    // phase2 は弾数を増やして攻勢を強める
    const offsets = this.phase === 'phase2' ? [-24, 0, 24] : [0];
    // 弾は地面の上に収める(最下弾が地面をすり抜けて見えるのを防ぐ)。
    // 下端が地面上端に接する高さを上限とする。
    const maxY = STAGE.groundY - SHOT.normalSize / 2;
    for (const oy of offsets) {
      const y = Math.min(baseY + oy, maxY);
      const projectile = this.projectiles.get(muzzleX, y) as Projectile | null;
      if (!projectile) continue;
      projectile.fire(muzzleX, y, dir * this.cfg.bulletSpeed, 'normal', 'enemy');
    }
    this.rig.triggerAttack(this.scene.time.now);
  }

  takeDamage(amount: number, hitKind?: ShieldHitKind): void {
    let hpDamage = amount;
    if (hitKind) {
      const shield = resolveBossShieldHit({
        shieldHp: this.shieldHp,
        hpDamage: amount,
        hitKind,
      });
      this.shieldHp = shield.nextShieldHp;
      hpDamage = shield.hpDamage;
    }

    this.hp = applyDamageToHp(this.hp, hpDamage);
    this.staggerAccumulated += hpDamage;

    // 一定ダメージ蓄積で短時間のけぞる(反撃チャンス)
    if (this.staggerAccumulated >= this.cfg.staggerDamageThreshold && !this.isDead()) {
      this.staggerAccumulated = 0;
      this.currentAction = 'stagger';
      this.lastAction = 'stagger';
      this.actionEndsAt =
        this.scene.time.now +
        bossActionDuration(this.cfg.actionDurationMs, 'stagger', DEFAULT_ACTION_DURATION_MS);
      this.setVelocityX(0);
    }

    if (this.isDead()) {
      this.isAlive = false;
      this.setVelocity(0, 0);
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
