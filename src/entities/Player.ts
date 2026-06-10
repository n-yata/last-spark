import Phaser from 'phaser';
import { TEX } from '../config/assetKeys';
import { PLAYER } from '../config/balance';
import type { InputState } from '../types/input';
import type { Damageable } from '../types/combat';
import { isChargedShot, canFire, createProjectileSpec } from '../systems/shot';
import {
  initialShotState,
  stepShot,
  chargingElapsed,
  type ShotState,
  type ShotAction,
} from '../systems/shotControl';
import { isDead, isInvincible, resolveInvincibleDamage } from '../systems/combatRules';
import {
  resolveHorizontalVelocity,
  shouldJump,
  resolveFacing,
  facingSign,
  shouldCutJump,
  cutJumpVelocity,
} from '../systems/playerMovement';
import { getSound } from '../systems/SoundManager';
import { CharacterRig } from './CharacterRig';
import type { MotionState } from '../systems/rigAnimation';
import { Projectile } from './Projectile';

// プレイヤー(最後のロボット)。移動/ジャンプ/発射/被弾を担う。

export class Player extends Phaser.Physics.Arcade.Sprite implements Damageable {
  hp: number = PLAYER.maxHp;
  maxHp: number = PLAYER.maxHp;
  facing: 'left' | 'right' = 'right';

  private shotState: ShotState = initialShotState();
  private chargeReadyNotified = false;
  private lastShotAt = 0;
  private invincibleUntil = 0;
  private isJumping = false;
  private projectiles?: Phaser.Physics.Arcade.Group;
  private readonly rig: CharacterRig;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.player);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER.width, PLAYER.height);
    body.setCollideWorldBounds(false);
    this.setDepth(10);
    // 物理は据え置き、見た目は関節リグへ委譲する(自スプライトは非表示)。
    this.setVisible(false);
    this.rig = new CharacterRig(scene, 'player', 10);
  }

  /** 発射に使う弾プールを設定する。 */
  setProjectiles(group: Phaser.Physics.Arcade.Group): void {
    this.projectiles = group;
  }

  get onGround(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  /** チャージ蓄積の経過時間(ms)。チャージ中以外は 0(UI ゲージ表示用)。 */
  chargeElapsed(now: number): number {
    return chargingElapsed(this.shotState, now);
  }

  /** 入力に基づいて移動・ジャンプ・発射を行う。 */
  applyInput(input: InputState, now: number): void {
    this.setVelocityX(resolveHorizontalVelocity(input.moveDir));
    this.facing = resolveFacing(this.facing, input.moveDir);

    // ジャンプ開始(接地中の立ち上がり入力)
    if (shouldJump(input, this.onGround)) {
      this.setVelocityY(PLAYER.jumpVelocity);
      this.isJumping = true;
      getSound().playSe('jump');
    }

    // 可変ジャンプ: 上昇中に離したら上向き速度をカットして低いジャンプにする
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (shouldCutJump(input.jumpHeld, this.isJumping, body.velocity.y)) {
      this.setVelocityY(cutJumpVelocity(body.velocity.y, PLAYER.jumpCutMultiplier));
      this.isJumping = false;
    }
    // 着地(または下降開始)で上昇フェーズを終える
    if (this.onGround && body.velocity.y >= 0) {
      this.isJumping = false;
    }

    this.updateShot(input, now);

    this.updateBlink(now);
    this.updateRig(input, now);
  }

  /**
   * ショット操作(タップ=チャージ、再タップ=発射、長押し=連射)を 1 フレーム評価する。
   * 状態機械(shotControl)が発火アクションを返し、ここで実際の発射・音・チャージ通知を行う。
   */
  private updateShot(input: InputState, now: number): void {
    const prevMode = this.shotState.mode;
    const { state, action } = stepShot(this.shotState, {
      pressed: input.shootPressed,
      released: input.shootReleased,
      held: input.shootHeld,
      now,
    });
    this.shotState = state;

    // チャージ開始の効果音(idle/その他 → charging への遷移時)
    if (prevMode !== 'charging' && state.mode === 'charging') {
      this.chargeReadyNotified = false;
      getSound().playSe('chargeStart');
    }
    // チャージ成立(しきい値到達)の瞬間に一度だけ通知音
    if (
      state.mode === 'charging' &&
      !this.chargeReadyNotified &&
      isChargedShot(this.chargeElapsed(now))
    ) {
      this.chargeReadyNotified = true;
      getSound().playSe('chargeReady');
    }
    if (state.mode !== 'charging') {
      this.chargeReadyNotified = false;
    }

    if (action !== 'none') {
      this.fire(action, now);
    }
  }

  /** 入力・物理状態から MotionState を導出し、リグへ同期する。 */
  private updateRig(input: InputState, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const vy = body.velocity.y;
    let state: MotionState;
    if (!this.onGround) {
      state = vy < 0 ? 'jump' : 'fall';
    } else if (input.moveDir !== 0) {
      state = 'walk';
    } else {
      state = 'idle';
    }
    this.rig.syncTo(this.x, this.y, true, facingSign(this.facing) as 1 | -1);
    this.rig.setMotionState(state);
    this.rig.update(now, vy);
  }

  /**
   * 指定種別の弾を前方へ発射する。クールダウン中は発射しない。
   * アクションは shotControl が決定(fireNormal=通常弾、fireCharged=チャージ弾)。
   */
  private fire(action: ShotAction, now: number): void {
    if (!this.projectiles || !canFire(now, this.lastShotAt)) {
      return;
    }
    this.lastShotAt = now;

    const kind = action === 'fireCharged' ? 'charged' : 'normal';
    const dir = facingSign(this.facing);
    const muzzleX = this.x + dir * (PLAYER.width / 2 + 6);
    const projectile = this.projectiles.get(muzzleX, this.y) as Projectile | null;
    if (!projectile) return;
    const velocity = dir * createProjectileSpec(kind).speed;
    projectile.fire(muzzleX, this.y, velocity, kind, 'player');
    this.rig.triggerAttack(now);
    getSound().playSe(kind === 'charged' ? 'shootCharged' : 'shootNormal');
  }

  /** 被弾。無敵中は無効。HP0 で撃破。 */
  takeDamage(amount: number): void {
    const now = this.scene.time.now;
    const wasInvincible = isInvincible(now, this.invincibleUntil);
    const next = resolveInvincibleDamage(
      { hp: this.hp, invincibleUntil: this.invincibleUntil },
      amount,
      now,
      PLAYER.invincibleMs,
    );
    this.hp = next.hp;
    this.invincibleUntil = next.invincibleUntil;
    // 実際に被弾が通った時のみリグをのけぞらせる(無敵中は無反応)。
    if (!wasInvincible) {
      this.rig.triggerHit(now);
    }
    if (this.isDead()) {
      this.setVelocity(0, 0);
    }
  }

  isDead(): boolean {
    return isDead(this.hp);
  }

  /** 被弾後の無敵中は点滅させる(視覚フィードバック)。リグへ適用する。 */
  private updateBlink(now: number): void {
    if (isInvincible(now, this.invincibleUntil)) {
      const phase = Math.floor(now / PLAYER.blinkIntervalMs) % 2;
      this.rig.setAlpha(phase === 0 ? 0.35 : 1);
    } else {
      this.rig.setAlpha(1);
    }
  }

  /** エンティティ破棄時にリグも破棄する(リーク防止)。 */
  override destroy(fromScene?: boolean): void {
    this.rig.destroy();
    super.destroy(fromScene);
  }
}
