import Phaser from 'phaser';
import { RIGS, type RigFamily, type RigPartSpec } from '../config/characterRig';
import {
  walkPhase,
  legSwing,
  squashStretch,
  armRecoil,
  hitLean,
  type MotionState,
} from '../systems/rigAnimation';

// 見た目リグ: 物理エンティティ(Arcade.Sprite)とは分離した Container ベースの表示層。
// パーツ Image を characterRig 定義から組み立て、毎フレーム所有エンティティへ追従し、
// 状態(idle/walk/jump/fall/hit/stagger/dead)に応じて手続き的にパーツを動かす。
// 物理・ロジックには一切干渉しない(座標の追従と表示のみ)。

interface RigPart {
  spec: RigPartSpec;
  image: Phaser.GameObjects.Image;
  /** 中立状態の基準位置(ボディ中心相対)。アニメはこの値からの相対変位で与える。 */
  baseX: number;
  baseY: number;
}

/** 発射リコイルの継続時間(ms)。 */
const ATTACK_DURATION_MS = 220;
/** 被弾のけぞりの継続時間(ms)。 */
const HIT_DURATION_MS = 200;

export class CharacterRig {
  private readonly container: Phaser.GameObjects.Container;
  private readonly parts: RigPart[];
  private readonly swingRad: number;
  private readonly walkCycleMs: number;

  private motion: MotionState = 'idle';
  private facingSign: 1 | -1 = 1;
  /** attack(発射)トリガ時刻。負なら未発火。 */
  private attackStartMs = -1;
  /** hit(被弾)トリガ時刻。負なら未発火。 */
  private hitStartMs = -1;
  /** 歩行位相を進める内部時計(walk 中のみ進行)。 */
  private walkClockMs = 0;
  private lastUpdateMs = -1;

  constructor(scene: Phaser.Scene, family: RigFamily, depth: number) {
    const rig = RIGS[family];
    this.swingRad = rig.swingRad;
    this.walkCycleMs = rig.walkCycleMs;

    this.parts = rig.parts.map((spec) => {
      const image = scene.add.image(spec.x, spec.y, spec.key);
      image.setOrigin(spec.originX, spec.originY);
      return { spec, image, baseX: spec.x, baseY: spec.y };
    });

    this.container = scene.add.container(
      0,
      0,
      this.parts.map((p) => p.image),
    );
    this.container.setDepth(depth);
  }

  /** 位置・深度・可視・左右向きを所有エンティティへ同期する。 */
  syncTo(x: number, y: number, visible: boolean, facing: 1 | -1): void {
    this.container.setPosition(x, y);
    this.container.setVisible(visible);
    this.facingSign = facing;
  }

  /**
   * モーション状態を設定する。attack/hit は一過性イベントなので、
   * 立ち上がりでタイマを開始する(同じ状態の連続呼び出しでは再始動しない)。
   */
  setMotionState(state: MotionState): void {
    this.motion = state;
  }

  /** 発射の予備動作/反動を開始する(現在時刻基準)。 */
  triggerAttack(nowMs: number): void {
    this.attackStartMs = nowMs;
  }

  /** 被弾のけぞりを開始する(現在時刻基準)。 */
  triggerHit(nowMs: number): void {
    this.hitStartMs = nowMs;
  }

  /**
   * パーツの変位を更新する。time=現在時刻(ms), vy=鉛直速度(姿勢用)。
   * walk 中のみ歩行時計を進め、脚/腕をスイングさせる。
   */
  update(timeMs: number, vy: number): void {
    const dt = this.lastUpdateMs < 0 ? 0 : timeMs - this.lastUpdateMs;
    this.lastUpdateMs = timeMs;

    const isWalking = this.motion === 'walk' && this.walkCycleMs > 0;
    if (isWalking) {
      this.walkClockMs += dt;
    }

    const phase = walkPhase(this.walkClockMs, this.walkCycleMs);
    const swing = isWalking ? this.swingRad : 0;

    // 姿勢: ジャンプ/落下中はスクワッシュ&ストレッチ、それ以外は中立へ。
    const inAir = this.motion === 'jump' || this.motion === 'fall';
    const ss = inAir ? squashStretch(vy) : { scaleX: 1, scaleY: 1 };

    // 被弾/けぞり: hit は時限、stagger は状態継続中ずっと有効。
    const hitActive =
      this.hitStartMs >= 0 && timeMs - this.hitStartMs < HIT_DURATION_MS;
    const staggerActive = this.motion === 'stagger';
    const lean = hitLean(hitActive || staggerActive) * this.facingSign;

    // 発射リコイル(0..1)。
    const recoil =
      this.attackStartMs >= 0
        ? armRecoil(timeMs - this.attackStartMs, ATTACK_DURATION_MS)
        : 0;

    // Container 全体の向き・姿勢。facing は scaleX 符号で反転。
    this.container.setScale(this.facingSign * ss.scaleX, ss.scaleY);
    this.container.setRotation(lean);

    for (const part of this.parts) {
      this.applyPart(part, swing, phase, recoil);
    }
  }

  private applyPart(
    part: RigPart,
    swing: number,
    phase: number,
    recoil: number,
  ): void {
    const { role } = part.spec;
    let rotation = 0;
    let offsetX = 0;
    let offsetY = 0;

    switch (role) {
      case 'legBack':
      case 'armBack':
        // 後ろ側は前側と逆位相で振る。
        rotation = legSwing(phase + Math.PI, swing);
        break;
      case 'legFront':
      case 'armFront':
        rotation = legSwing(phase, swing);
        break;
      default:
        rotation = 0;
        break;
    }

    if (role === 'armFront' || role === 'barrel') {
      // 発射反動: 銃口側(armFront/barrel)を後方へ引く。
      offsetX = -recoil * (role === 'barrel' ? 4 : 6);
      rotation += recoil * 0.25; // やや上向きに跳ねる
    }

    if (role === 'head') {
      // 頭はわずかに上下動(歩行リズム)。
      offsetY = swing !== 0 ? Math.sin(phase * 2) * 0.6 : 0;
    }

    part.image.setPosition(part.baseX + offsetX, part.baseY + offsetY);
    part.image.setRotation(rotation);
  }

  /** ティント(ボス stagger 等)を全パーツへ適用。 */
  setTint(color: number): void {
    for (const part of this.parts) {
      part.image.setTint(color);
    }
  }

  /** ティント解除。 */
  clearTint(): void {
    for (const part of this.parts) {
      part.image.clearTint();
    }
  }

  /** 透明度(無敵点滅等)を全パーツへ適用。 */
  setAlpha(alpha: number): void {
    this.container.setAlpha(alpha);
  }

  /** 可視切替(撃破/無効化時)。 */
  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /** リグ破棄(エンティティ破棄と連動。リーク防止)。 */
  destroy(): void {
    this.container.destroy(true);
  }
}
