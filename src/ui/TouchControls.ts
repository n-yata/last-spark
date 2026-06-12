import Phaser from 'phaser';
import type { TouchLayout } from '../config/touchLayout';
import { EFFECTS } from '../config/effects';

// 仮想ボタン/移動ゾーンの半透明ガイドを描画する(操作はしない=表示のみ)。
// 実画面サイズに追従するため、毎フレーム render(layout) で再描画する。

const ZONE_COLOR = 0x37f7d8;
const SHOOT_COLOR = 0xfff27a;
const JUMP_COLOR = 0x6cf0ff;
const BAND_COLOR = 0x05080c;

export class TouchControls {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly shootLabel: Phaser.GameObjects.Text;
  private readonly jumpLabel: Phaser.GameObjects.Text;
  private readonly moveHint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(95).setAlpha(0.85);
    const labelStyle = { fontFamily: 'monospace', fontSize: '14px' };
    this.shootLabel = scene.add
      .text(0, 0, 'SHOT', { ...labelStyle, color: '#fff6c2' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(95);
    this.jumpLabel = scene.add
      .text(0, 0, 'JUMP', { ...labelStyle, color: '#c7f6ff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(95);
    this.moveHint = scene.add
      .text(0, 0, '◀  MOVE  ▶', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#7fe9dd',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(95)
      .setAlpha(0.5);
  }

  /**
   * 現在のレイアウト(実画面サイズ基準)に合わせてガイドを再描画する。
   * bandHeight>0(タッチ時の下部コントロール帯)の場合、画面下部に帯背景を描画し、
   * 仮想ボタンが帯の上に乗るようにする(プレイ領域=帯の上、ボタン=帯の中)。
   * shootHeld/jumpHeld が true のボタンは強調表示し、指で隠れても押下中と分かるようにする。
   */
  render(
    layout: TouchLayout,
    width: number,
    height: number,
    bandHeight = 0,
    shootHeld = false,
    jumpHeld = false,
  ): void {
    const { moveZone, shootButton, jumpButton } = layout;
    this.gfx.clear();
    // 下部コントロール帯の背景(タッチ時のみ)。プレイ領域との境界に上端線を引く。
    if (bandHeight > 0) {
      const bandTop = height - bandHeight;
      this.gfx.fillStyle(BAND_COLOR, 0.92);
      this.gfx.fillRect(0, bandTop, width, bandHeight);
      this.gfx.lineStyle(2, ZONE_COLOR, 0.25);
      this.gfx.lineBetween(0, bandTop, width, bandTop);
    }
    // 左: 移動ゾーンの境界
    this.gfx.lineStyle(2, ZONE_COLOR, 0.12);
    this.gfx.strokeRect(moveZone.x + 4, moveZone.y + 4, moveZone.width - 8, moveZone.height - 8);
    this.gfx.fillStyle(ZONE_COLOR, 0.06);
    this.gfx.fillRect(moveZone.x, moveZone.y, moveZone.width, moveZone.height);
    // 右: ジャンプ(左上) + ショット(右下)の仮想ボタン
    this.drawButton(jumpButton.x, jumpButton.y, jumpButton.radius, JUMP_COLOR, jumpHeld);
    this.drawButton(shootButton.x, shootButton.y, shootButton.radius, SHOOT_COLOR, shootHeld);

    this.shootLabel.setPosition(shootButton.x, shootButton.y);
    this.jumpLabel.setPosition(jumpButton.x, jumpButton.y);
    // 帯ありはプレイ領域の下端付近(帯の上)に、帯なしは従来どおり画面下端付近に置く。
    const hintY = bandHeight > 0 ? height - bandHeight - 16 : height - 26;
    this.moveHint.setPosition(moveZone.x + moveZone.width / 2, hintY);
  }

  private drawButton(x: number, y: number, radius: number, color: number, held = false): void {
    // 押下中は塗りを濃く・輪郭を太く・半径を広げる(指の外周からも押下中と分かる)。
    const r = held ? radius * EFFECTS.touch.pressedRadiusScale : radius;
    this.gfx.fillStyle(color, held ? EFFECTS.touch.pressedFillAlpha : 0.12);
    this.gfx.fillCircle(x, y, r);
    this.gfx.lineStyle(held ? 3 : 2, color, held ? 0.9 : 0.5);
    this.gfx.strokeCircle(x, y, r);
  }

  destroy(): void {
    this.gfx.destroy();
    this.shootLabel.destroy();
    this.jumpLabel.destroy();
    this.moveHint.destroy();
  }
}
