import Phaser from 'phaser';
import { TEX } from '../config/assetKeys';
import type { LogSlot } from '../types/story';

// ログトリガー(科学者の遺品・旧式端末)。プレイヤーが重なると一度だけログ表示を発火する。
// 物理はオーバーラップ判定のみ(衝突なし)。見た目は暖色の発光プレースホルダ。

const GLOW_TINT = 0xffcf8f; // 科学者=暖色
const WIDTH = 26;
const HEIGHT = 34;

export class LogTrigger extends Phaser.Physics.Arcade.Sprite {
  readonly slot: LogSlot;
  /** 解錠済みか。一度発火したら二度と発火しない。 */
  private consumed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, slot: LogSlot) {
    super(scene, x, y, TEX.spark);
    this.slot = slot;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(WIDTH, HEIGHT);
    this.configureBody();

    this.setDisplaySize(WIDTH, HEIGHT).setTint(GLOW_TINT).setDepth(6);

    // 「拾えるもの」と分かるよう、ゆっくり明滅させる。
    scene.tweens.add({
      targets: this,
      alpha: { from: 0.55, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /**
   * 物理ボディを「重力を受けない静止オブジェクト」に設定する。
   * 注意: Arcade の `Group.add()` はグループ既定値(重力ON/可動)でボディ設定を
   * 上書きするため、GameScene はグループ追加後に本メソッドを再適用する(Enemy と同様)。
   */
  configureBody(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
  }

  /** 未解錠なら true を返し、自身を解錠済みにする(以降は false)。 */
  tryConsume(): boolean {
    if (this.consumed) return false;
    this.consumed = true;
    // 解錠したら消える(拾った表現)。
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: this.scale * 1.4,
      duration: 220,
      onComplete: () => this.destroy(),
    });
    return true;
  }

  isConsumed(): boolean {
    return this.consumed;
  }
}
