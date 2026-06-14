import Phaser from 'phaser';
import { PLAYER, SHOT } from '../config/balance';
import type { Damageable } from '../types/combat';
import { shouldHazardTick } from '../systems/hazardRules';

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
  /** フェード tween(破棄時に確実に止める)。 */
  private fadeTween?: Phaser.Tweens.Tween;
  /** UPDATE 購読のバインド済みハンドラ(解除に同一参照が要る)。 */
  private readonly boundUpdate: () => void;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, SHOT.beamLength, SHOT.beamThickness, BEAM_COLOR, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.configureBody();
    this.setBlendMode(Phaser.BlendModes.ADD); // 発光アクセント(暗い廃墟基調に光を切る)。
    this.setDepth(15); // プレイヤー(10)より手前、ヒットエフェクト(20)より奥。
    this.boundUpdate = () => this.onUpdate();
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
    this.owner = owner;
    this.expiresAt = this.scene.time.now + SHOT.beamLifespanMs;
    this.lastHitAt.clear();
    this.reposition();
    // フェードイン(90ms) → 保持 → フェードアウト(90ms)。寿命と尺を一致させる。
    this.setAlpha(0);
    this.fadeTween = this.scene.tweens.add({
      targets: this,
      alpha: { from: 0, to: 0.9 },
      duration: 90,
      yoyo: true,
      hold: Math.max(0, SHOT.beamLifespanMs - 180),
      ease: 'Sine.Out',
    });
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.boundUpdate);
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
    this.setPosition(muzzleX + dir * (SHOT.beamLength / 2), this.owner.y);
  }

  /** 破棄時に UPDATE 購読・tween・参照を確実に解放する(リーク防止)。 */
  override destroy(fromScene?: boolean): void {
    this.scene?.events.off(Phaser.Scenes.Events.UPDATE, this.boundUpdate);
    this.fadeTween?.remove();
    this.fadeTween = undefined;
    this.owner = undefined;
    this.lastHitAt.clear();
    super.destroy(fromScene);
  }
}
