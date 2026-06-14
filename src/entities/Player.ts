import Phaser from 'phaser';
import { TEX } from '../config/assetKeys';
import { PLAYER, LADDER, SHOT } from '../config/balance';
import type { InputState } from '../types/input';
import type { Damageable } from '../types/combat';
import type { LadderRect } from '../config/stages';
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
  overlapsAnyLadder,
  resolveLadderState,
  climbVelocity,
  type Box,
} from '../systems/playerMovement';
import { getSound } from '../systems/SoundManager';
import { CharacterRig } from './CharacterRig';
import type { MotionState } from '../systems/rigAnimation';
import { Projectile } from './Projectile';
import { Beam } from './Beam';

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
  private onLadder = false;
  private ladderBoxes: Box[] = [];
  private projectiles?: Phaser.Physics.Arcade.Group;
  /** RAY 強化状態(stage6 のみ)。true で通常弾が上下2発・チャージ攻撃が持続ビームになる。 */
  private empowered = false;
  /** 強化ビームの発射先グループ(GameScene が設定)。empowered かつ設定済みのときだけビームを出す。 */
  private beams?: Phaser.GameObjects.Group;
  /** ビーム発動中の再発火を抑止する終了時刻(ms)。発動中(now < beamActiveUntil)は新規ショットを受けない。 */
  private beamActiveUntil = 0;
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

  /** 強化ビーム(持続レーザー)の生成先グループを設定する。強化時のチャージ攻撃で使用する。 */
  setBeams(group: Phaser.GameObjects.Group): void {
    this.beams = group;
  }

  /**
   * 攻撃強化の有効/無効を設定する(stage5 クリア演出で獲得、stage6 で適用)。
   * 強化時は通常弾が上下2発、チャージ攻撃が持続ビームになる。
   */
  setEmpowered(value: boolean): void {
    this.empowered = value;
  }

  /** このステージの梯子領域を設定する(重なり判定用の矩形へ変換して保持)。 */
  setLadders(ladders: LadderRect[]): void {
    this.ladderBoxes = ladders.map((l) => ({
      left: l.x,
      right: l.x + l.width,
      top: l.y,
      bottom: l.y + l.height,
    }));
  }

  get onGround(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  /** 梯子につかまっているか(ワンウェイ床コライダの抑制に使う)。 */
  get isOnLadder(): boolean {
    return this.onLadder;
  }

  /** チャージ蓄積の経過時間(ms)。チャージ中以外は 0(UI ゲージ表示用)。 */
  chargeElapsed(now: number): number {
    return chargingElapsed(this.shotState, now);
  }

  /** 入力に基づいて移動・ジャンプ・発射を行う。 */
  applyInput(input: InputState, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // 梯子状態の更新(重なり + 上下入力で把持、ジャンプ/離脱で解除)。
    const playerBox: Box = {
      left: body.x,
      right: body.x + body.width,
      top: body.y,
      bottom: body.y + body.height,
    };
    const overlapping = overlapsAnyLadder(playerBox, this.ladderBoxes);
    // 足元の真下に梯子があるか(降り乗り込み・最下部離脱の幾何判定)。
    const footProbe: Box = {
      left: playerBox.left,
      right: playerBox.right,
      top: playerBox.bottom,
      bottom: playerBox.bottom + LADDER.boardDownReach,
    };
    const ladderBelowFeet = overlapsAnyLadder(footProbe, this.ladderBoxes);
    const wasOnLadder = this.onLadder;
    // 足場の上に立ち、真下に梯子があるとき下入力で「降り乗り込み」する
    // (足場上端=梯子上端だと通常の重なりが生じないため、これで降り始められる)。
    const boardingDown =
      !wasOnLadder &&
      input.climbDir > 0 &&
      this.onGround &&
      !overlapping &&
      ladderBelowFeet;
    let nextOnLadder = resolveLadderState(
      wasOnLadder,
      overlapping || boardingDown,
      input.climbDir,
      input.jumpPressed,
    );
    // 梯子の最下部で地面に着いたら降りる(足元の下にもう梯子が無い)。
    // 降り乗り込みの瞬間は足元下に梯子があるため誤離脱しない。
    if (nextOnLadder && this.onGround && input.climbDir >= 0 && !ladderBelowFeet && !boardingDown) {
      nextOnLadder = false;
    }
    this.onLadder = nextOnLadder;

    if (this.onLadder) {
      // 梯子モード: 重力を切り、上下入力で鉛直移動。横移動・ジャンプは無効。
      if (!wasOnLadder) {
        body.setAllowGravity(false);
        if (boardingDown) {
          // 足場上端から梯子内へ進入させ、即座に降下を開始できるようにする。
          this.setPosition(this.x, this.y + LADDER.boardDownReach);
        }
      }
      this.setVelocityX(0);
      this.setVelocityY(climbVelocity(input.climbDir, LADDER.climbSpeed));
      this.facing = resolveFacing(this.facing, input.moveDir);
      this.isJumping = false;
      this.updateShot(input, now);
      this.updateBlink(now);
      this.updateRig(input, now);
      return;
    }

    // 梯子から離れた直後は重力を必ず戻す(戻し忘れ=浮遊バグ防止)。
    if (wasOnLadder) {
      body.setAllowGravity(true);
      // ジャンプで離脱した場合は飛び降り感を出すためジャンプ初速を与える。
      if (input.jumpPressed) {
        this.setVelocityY(PLAYER.jumpVelocity);
        this.isJumping = true;
        getSound().playSe('jump');
      }
    }

    this.setVelocityX(resolveHorizontalVelocity(input.moveDir));
    this.facing = resolveFacing(this.facing, input.moveDir);

    // ジャンプ開始(接地中の立ち上がり入力)
    if (shouldJump(input, this.onGround)) {
      this.setVelocityY(PLAYER.jumpVelocity);
      this.isJumping = true;
      getSound().playSe('jump');
    }

    // 可変ジャンプ: 上昇中に離したら上向き速度をカットして低いジャンプにする
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
      cancel: input.shootCancel,
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
    if (this.onLadder) {
      state = 'climb';
    } else if (!this.onGround) {
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
    // 強化ビーム発動中は新規ショットを受け付けない(持続中の多重発動を防ぐ)。
    if (now < this.beamActiveUntil) {
      return;
    }

    // 強化時のチャージ攻撃は持続ビーム。それ以外(非強化、または通常弾)は従来の弾発射へ。
    if (this.empowered && action === 'fireCharged' && this.beams) {
      this.fireBeam(now);
      return;
    }

    this.lastShotAt = now;
    const kind = action === 'fireCharged' ? 'charged' : 'normal';
    const dir = facingSign(this.facing);
    const muzzleX = this.x + dir * (PLAYER.width / 2 + 6);
    const speed = createProjectileSpec(kind).speed;

    // 強化時の通常弾は上下2発(緩い斜め)。それ以外は前方単発。1 発あたりの威力は据え置き、
    // 2 発化(手数)で強化を体感させる。velocityY は sin 分配(0 のとき従来の直進弾と同一)。
    const angles =
      this.empowered && kind === 'normal' ? [-SHOT.splitAngleRad, SHOT.splitAngleRad] : [0];
    for (const angle of angles) {
      const projectile = this.projectiles.get(muzzleX, this.y) as Projectile | null;
      if (!projectile) continue;
      const vx = dir * speed * Math.cos(angle);
      const vy = speed * Math.sin(angle);
      projectile.fire(muzzleX, this.y, vx, kind, 'player', { velocityY: vy });
    }
    this.rig.triggerAttack(now);
    getSound().playSe(kind === 'charged' ? 'shootCharged' : 'shootNormal');
  }

  /**
   * 強化チャージ攻撃: 持続ビームを発動する。発動中は beamActiveUntil まで再発火を抑止する
   * (発動中もプレイヤーは移動可能で、ビームはマズルへ追従する)。
   */
  private fireBeam(now: number): void {
    if (!this.beams) return;
    this.lastShotAt = now;
    this.beamActiveUntil = now + SHOT.beamLifespanMs;
    const beam = new Beam(this.scene);
    this.beams.add(beam);
    // Group.add() がボディ設定をグループ既定値(重力ON)で上書きするため、静止設定を再適用する。
    beam.configureBody();
    beam.fire(this); // Player(x/y/facing)を owner に渡し、以後マズルへ追従させる。
    this.rig.triggerAttack(now);
    getSound().playSe('shootCharged');
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
