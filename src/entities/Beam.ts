import Phaser from 'phaser';
import { PLAYER, SHOT } from '../config/balance';
import { EFFECTS } from '../config/effects';
import { TEX } from '../config/assetKeys';
import type { Damageable } from '../types/combat';
import { shouldHazardTick } from '../systems/hazardRules';
import { getSound } from '../systems/SoundManager';

// RAY 強化(stage6・休眠コア共鳴後)のチャージ攻撃=持続レーザービーム。一定時間(beamLifespanMs)、
// プレイヤーのマズルから向いている方向へ伸びる帯を描画し、その間に触れた敵・ボスへ per-target の
// 間引き(beamTickMs)でダメージを与える。発動中もプレイヤーは移動でき、ビームはマズルへ追従する。
//
// 実装メモ(重要・Hazard と同根の落とし穴回避): 見た目兼当たり判定を Phaser.GameObjects.Rectangle で
// 持つ(scale=1)。1x1 テクスチャの Sprite を setDisplaySize で引き伸ばすと Arcade Body が
// body.width = sourceWidth × scaleX に膨張し、当たり判定が意図せず巨大化する。Rectangle は
// width/height をネイティブに持ち body がそのサイズに一致するためこの落とし穴を避けられる
// (Hazard / GameScene.addArenaWall と同じ実績パターン)。
//
// 座標系メモ: ビームはワールド座標のゲームオブジェクト(Projectile / Hazard と同じ)。長さ・太さは
// 生px で持ち scaled() は通さない(画面のズームはカメラが吸収する。scaled() は HUD/UI の画面固定px専用)。

/** ビームの発光色(RAY 系シアン〜白)。背景の暗色に対し発光アクセントとして映える。 */
const BEAM_COLOR = 0x9ffff0;

/** ビームが追従する発射元(プレイヤー)の最小インターフェース。循環 import を避けるため構造型で受ける。 */
export interface BeamOwner {
  x: number;
  y: number;
  facing: 'left' | 'right';
}

export class Beam extends Phaser.GameObjects.Rectangle {
  /** 対象ごとの直近ヒット時刻(ms)。beamTickMs 経過まで同一対象へ再ヒットしない(per-target 間引き)。 */
  private readonly lastHitAt = new Map<Damageable, number>();
  /** ビーム消滅時刻(ms)。 */
  private expiresAt = 0;
  /** 追従元(マズル位置・向きの参照)。 */
  private owner?: BeamOwner;
  /** フェード/脈動 tween(破棄時に確実に止める)。 */
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  /** 装飾レイヤー(物理を持たない見た目専用)。外周グローと白熱コア。 */
  private glow?: Phaser.GameObjects.Rectangle;
  private core?: Phaser.GameObjects.Rectangle;
  /** ビーム軸に沿って舞う光の粉エミッター(見た目専用)。 */
  private dust?: Phaser.GameObjects.Particles.ParticleEmitter;
  /** 光の粉の発生ゾーン(ビーム中心相対の矩形。emitZone の source 型を満たすため field で保持)。 */
  private dustZone?: Phaser.Geom.Rectangle;
  /** UPDATE 購読のバインド済みハンドラ(解除に同一参照が要る)。 */
  private readonly boundUpdate: () => void;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, SHOT.beamLength, SHOT.beamThickness, BEAM_COLOR, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.configureBody();
    this.setBlendMode(Phaser.BlendModes.ADD); // 発光アクセント(暗い廃墟基調に光を切る)。
    this.setDepth(15); // プレイヤー(10)より手前、ヒットエフェクト(20)より奥。
    this.createLayers();
    this.boundUpdate = () => this.onUpdate();
  }

  /**
   * 見た目を厚くする装飾レイヤーを生成する(当たり判定は本体矩形のまま不変)。
   * グロー=本体より太く淡い外周(奥)、コア=本体より細く白熱した中心(手前)。
   * いずれも物理を持たない add.rectangle で、reposition で本体へ追従させる。
   */
  private createLayers(): void {
    const v = EFFECTS.beam;
    this.glow = this.scene.add
      .rectangle(0, 0, SHOT.beamLength, SHOT.beamThickness * v.glowThicknessMul, v.color, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(14)
      .setAlpha(0);
    this.core = this.scene.add
      .rectangle(0, 0, SHOT.beamLength, SHOT.beamThickness * v.coreThicknessMul, v.coreColor, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(16)
      .setAlpha(0);
    // 光の粉: ビーム軸沿いの矩形ゾーンから継続発生し、ふわっと舞って消える(詳細は emitZone 直後の注記)。
    const zoneHeight = SHOT.beamThickness * v.dustSpreadYMul;
    this.dustZone = new Phaser.Geom.Rectangle(
      -SHOT.beamLength / 2,
      -zoneHeight / 2,
      SHOT.beamLength,
      zoneHeight,
    );
    this.dust = this.scene.add
      .particles(0, 0, TEX.spark, {
        lifespan: v.dustLifespanMs,
        speed: { min: v.dustSpeedMin, max: v.dustSpeedMax },
        angle: { min: 0, max: 360 },
        scale: { start: v.dustScaleStart, end: 0 },
        alpha: { start: v.dustAlphaStart, end: 0 },
        tint: v.color,
        blendMode: Phaser.BlendModes.ADD,
        frequency: v.dustFrequencyMs,
        quantity: v.dustQuantity,
        emitZone: { type: 'random', source: this.dustZone, quantity: v.dustQuantity },
      })
      .setDepth(17);
    // 生成と同フレームで fire() されるため、ambient エミッターと同様「生成即発生」に任せる
    // (emitting:false + start() はこの Phaser 版で継続フローが復帰せず1発しか出ない実績不具合を回避)。
  }

  /**
   * 物理ボディを「重力を受けない静止オブジェクト」に設定する。
   * 注意: Arcade の Group.add() はグループ既定値(重力ON/可動)でボディ設定を上書きするため、
   * グループ追加後に本メソッドを再適用する(Hazard / Enemy と同様)。
   * Rectangle は scale=1 なので body サイズは width/height に一致する(明示の setSize は不要)。
   */
  configureBody(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
  }

  /** プレイヤーのマズルから発射する。owner を保持し、以後マズルへ追従する。 */
  fire(owner: BeamOwner): void {
    const v = EFFECTS.beam;
    this.owner = owner;
    this.expiresAt = this.scene.time.now + SHOT.beamLifespanMs;
    this.lastHitAt.clear();
    this.reposition();
    // フェードイン(fadeMs) → 保持 → フェードアウト(fadeMs)。寿命と尺を一致させる。
    // 各レイヤーは alpha をフェードに専念させ、脈動は scaleY で出す(同一プロパティの tween 競合回避)。
    const hold = Math.max(0, SHOT.beamLifespanMs - v.fadeMs * 2);
    const fade = (
      target: Phaser.GameObjects.GameObject,
      peak: number,
    ): Phaser.Tweens.Tween =>
      this.scene.tweens.add({
        targets: target,
        alpha: { from: 0, to: peak },
        duration: v.fadeMs,
        yoyo: true,
        hold,
        ease: 'Sine.Out',
      });
    this.setAlpha(0);
    this.tweens.push(fade(this, v.bodyAlpha));
    if (this.glow) this.tweens.push(fade(this.glow, v.glowAlpha));
    if (this.core) this.tweens.push(fade(this.core, v.coreAlpha));
    // コア=素早い太さ脈動(エネルギーのちらつき)、グロー=ゆっくりした呼吸。
    if (this.core) {
      this.tweens.push(
        this.scene.tweens.add({
          targets: this.core,
          scaleY: { from: v.corePulseMin, to: v.corePulseMax },
          duration: v.corePulseMs,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        }),
      );
    }
    if (this.glow) {
      this.tweens.push(
        this.scene.tweens.add({
          targets: this.glow,
          scaleY: { from: v.glowPulseScaleMin, to: v.glowPulseScaleMax },
          duration: v.glowPulseMs,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        }),
      );
    }
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.boundUpdate);
    // 射出中ずっと鳴る持続音を開始(destroy で停止)。通常チャージの単発SEとは別系統で「強さ」を表す。
    getSound().startBeam();
  }

  /**
   * 同一対象への多重ヒットを間引く。発火許可時 true を返し、ヒット時刻を更新する。
   * overlap が毎フレーム呼ぶ前提(Hazard.tryHit と同型。per-target で対象ごと独立に間引く)。
   */
  tryHit(target: Damageable, now: number): boolean {
    const last = this.lastHitAt.get(target) ?? -Infinity;
    if (!shouldHazardTick(last, now, SHOT.beamTickMs)) return false;
    this.lastHitAt.set(target, now);
    return true;
  }

  /** 毎フレーム: 寿命到達で自破棄、それ以外はマズルへ追従する。 */
  private onUpdate(): void {
    if (!this.active) return;
    if (this.scene.time.now >= this.expiresAt) {
      this.destroy();
      return;
    }
    this.reposition();
  }

  /** マズル位置・向きへ帯を再配置する(発動中の移動・向き反転に追従)。 */
  private reposition(): void {
    if (!this.owner) return;
    const dir = this.owner.facing === 'left' ? -1 : 1;
    const muzzleX = this.owner.x + dir * (PLAYER.width / 2 + 6);
    // 帯の中心 = マズルから前方へ beamLength/2。Arcade dynamic body は GameObject の transform に
    // 追従するため、setPosition で当たり判定もマズルへ移動する。
    const cx = muzzleX + dir * (SHOT.beamLength / 2);
    this.setPosition(cx, this.owner.y);
    // 装飾レイヤー(物理なし)を本体と同じ中心へ追従させる。
    this.glow?.setPosition(cx, this.owner.y);
    this.core?.setPosition(cx, this.owner.y);
    // 光の粉エミッターも追従(既出の粒子は自走、新規粒子が新位置から湧き軸に沿う)。
    this.dust?.setPosition(cx, this.owner.y);
  }

  /** 破棄時に UPDATE 購読・tween・装飾レイヤー・参照・持続ビーム音を確実に解放する(リーク防止)。 */
  override destroy(fromScene?: boolean): void {
    getSound().stopBeam(); // 射出終了で持続音を停止(早期破棄=シーン終了/被弾リスタートにも追従)。
    this.scene?.events.off(Phaser.Scenes.Events.UPDATE, this.boundUpdate);
    for (const t of this.tweens) t.remove();
    this.tweens.length = 0;
    this.glow?.destroy();
    this.glow = undefined;
    this.core?.destroy();
    this.core = undefined;
    this.dust?.destroy();
    this.dust = undefined;
    this.dustZone = undefined;
    this.owner = undefined;
    this.lastHitAt.clear();
    super.destroy(fromScene);
  }
}
