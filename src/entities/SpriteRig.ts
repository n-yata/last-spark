import Phaser from 'phaser';
import { RAY_SPRITE } from '../config/assetKeys';
import { RAY_GEOM, RAY_RIG } from '../config/raySprite';
import { PLAYER } from '../config/balance';
import { EFFECTS } from '../config/effects';
import {
  walkPhase,
  legSwing,
  squashStretch,
  armRecoil,
  hitLean,
  type MotionState,
} from '../systems/rigAnimation';

// プレイヤー RAY 専用の見た目リグ。手続きの CharacterRig と同一の公開I/Fを持つドロップイン置換で、
// 外部生成キービジュアル(横向き)を切り分けた4パーツ(上半身/前腕キャノン/前脚/後脚)を立ち絵どおりに
// 組み立て、股関節で脚・肩で腕を振って「関節歩行」させる。当たり判定・物理には干渉しない(表示のみ)。
//
// 座標系: 原画(ray-side.png)ピクセルを、figure 中心x・足元yを原点(anchor)とした container 内へ配置し、
// container を表示倍率 SCALE で縮小 + facing で左右反転する。脚は各 hip、腕は肩を origin にして回転する。

const { bbox, body, armFront, legFront, legBack } = RAY_GEOM;
const FIG_H = bbox.maxY - bbox.minY;
const SCALE = RAY_RIG.targetHeight / FIG_H;
const ANCHOR_X = (bbox.minX + bbox.maxX) / 2 - bbox.minX; // figure 中心x(bbox相対)
const ANCHOR_Y = FIG_H; // 足元(bbox相対)

const localX = (absX: number) => absX - bbox.minX - ANCHOR_X;
const localY = (absY: number) => absY - bbox.minY - ANCHOR_Y;

export class SpriteRig {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bodyImg: Phaser.GameObjects.Image;
  private readonly armImg: Phaser.GameObjects.Image;
  private readonly legFrontImg: Phaser.GameObjects.Image;
  private readonly legBackImg: Phaser.GameObjects.Image;
  private readonly images: Phaser.GameObjects.Image[];

  private motion: MotionState = 'idle';
  private facingSign: 1 | -1 = 1;
  private attackStartMs = -1;
  private hitStartMs = -1;
  private flashApplied = false;
  private walkClockMs = 0;
  private lastUpdateMs = -1;
  private curX = 0;
  private curY = 0;
  private visible = true;

  constructor(scene: Phaser.Scene, depth: number) {
    // z 順: 後脚(背面) → 上半身 → 前腕 → 前脚(前面)。
    this.legBackImg = jointImage(scene, RAY_SPRITE.legBack, legBack);
    this.bodyImg = scene.add.image(localX(body.left), localY(body.top), RAY_SPRITE.body).setOrigin(0, 0);
    this.armImg = jointImage(scene, RAY_SPRITE.armFront, armFront);
    this.legFrontImg = jointImage(scene, RAY_SPRITE.legFront, legFront);

    this.images = [this.legBackImg, this.bodyImg, this.armImg, this.legFrontImg];
    this.container = scene.add.container(0, 0, this.images);
    this.container.setDepth(depth);

    // 暗い背景で RAY の位置が分かるよう、各パーツにシアンの発光リム(輪郭)を付ける。
    // postFX は WebGL 専用。Canvas フォールバック時は付かない(輪郭なしでも成立)。
    if (scene.sys.renderer.type === Phaser.WEBGL) {
      for (const img of this.images) {
        img.postFX.addGlow(RAY_RIG.rimColor, RAY_RIG.rimStrength, 0, false, 0.1, RAY_RIG.rimDistance);
      }
    }
  }

  syncTo(x: number, y: number, visible: boolean, facing: 1 | -1): void {
    this.curX = x;
    this.curY = y;
    this.visible = visible;
    this.facingSign = facing;
  }

  setMotionState(state: MotionState): void {
    this.motion = state;
  }

  triggerAttack(nowMs: number): void {
    this.attackStartMs = nowMs;
  }

  triggerHit(nowMs: number): void {
    this.hitStartMs = nowMs;
  }

  update(timeMs: number, vy: number): void {
    const dt = this.lastUpdateMs < 0 ? 0 : timeMs - this.lastUpdateMs;
    this.lastUpdateMs = timeMs;

    const stepping = (this.motion === 'walk' || this.motion === 'climb') && RAY_RIG.walkCycleMs > 0;
    if (stepping) this.walkClockMs += dt;
    const phase = walkPhase(this.walkClockMs, RAY_RIG.walkCycleMs);
    const swing = stepping ? RAY_RIG.swingRad : 0;
    const armSwing = stepping ? RAY_RIG.armSwingRad : 0;

    // 脚は逆位相、腕は前脚と逆位相(自然な腕振り)。
    this.legFrontImg.setRotation(legSwing(phase, swing));
    this.legBackImg.setRotation(legSwing(phase + Math.PI, swing));

    // 発射: 腕(キャノン)を跳ね上げる。
    const recoil =
      this.attackStartMs >= 0 ? armRecoil(timeMs - this.attackStartMs, EFFECTS.rig.attackRecoilMs) : 0;
    this.armImg.setRotation(legSwing(phase + Math.PI, armSwing) - recoil * RAY_RIG.armRecoilRad);

    // 姿勢: 空中はスクワッシュ&ストレッチ。
    const inAir = this.motion === 'jump' || this.motion === 'fall';
    const ss = inAir ? squashStretch(vy) : { scaleX: 1, scaleY: 1 };

    // 被弾/けぞり。
    const hitActive = this.hitStartMs >= 0 && timeMs - this.hitStartMs < EFFECTS.rig.hitLeanMs;
    const lean = hitLean(hitActive || this.motion === 'stagger') * this.facingSign;

    // 歩行バウンス(控えめ)。
    const bob = stepping ? Math.sin(phase * 2) * RAY_RIG.bobPx : 0;

    this.container.setScale(this.facingSign * SCALE * ss.scaleX, SCALE * ss.scaleY);
    this.container.setRotation(lean);
    this.container.setVisible(this.visible);
    this.container.setPosition(this.curX, this.curY + PLAYER.height / 2 + bob);

    this.updateHitFlash(timeMs);
  }

  private updateHitFlash(timeMs: number): void {
    const flashActive =
      this.hitStartMs >= 0 && timeMs - this.hitStartMs < EFFECTS.hitFlash.durationMs;
    if (flashActive) {
      for (const img of this.images) img.setTintFill(EFFECTS.hitFlash.color);
      this.flashApplied = true;
    } else if (this.flashApplied) {
      this.flashApplied = false;
      for (const img of this.images) img.clearTint();
    }
  }

  setTint(color: number): void {
    for (const img of this.images) img.setTint(color);
  }

  clearTint(): void {
    for (const img of this.images) img.clearTint();
  }

  setAlpha(alpha: number): void {
    this.container.setAlpha(alpha);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}

/** 関節パーツ(脚/腕)を pivot を原点にして配置する Image を作る。 */
function jointImage(
  scene: Phaser.Scene,
  key: string,
  rect: { left: number; top: number; width: number; height: number; pivotX: number; pivotY: number },
): Phaser.GameObjects.Image {
  return scene.add
    .image(localX(rect.pivotX), localY(rect.pivotY), key)
    .setOrigin((rect.pivotX - rect.left) / rect.width, (rect.pivotY - rect.top) / rect.height);
}
