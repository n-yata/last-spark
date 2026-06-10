import Phaser from 'phaser';
import type { TouchLayout } from '../config/touchLayout';

// 仮想ボタン/移動ゾーンの半透明ガイドを描画する(操作はしない=表示のみ)。
// 実画面サイズに追従するため、毎フレーム render(layout) で再描画する。

const ZONE_COLOR = 0x37f7d8;
const SHOOT_COLOR = 0xfff27a;
const JUMP_COLOR = 0x6cf0ff;

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

  /** 現在のレイアウト(実画面サイズ基準)に合わせてガイドを再描画する。 */
  render(layout: TouchLayout, height: number): void {
    const { moveZone, shootButton, jumpButton } = layout;
    this.gfx.clear();
    // 左: 移動ゾーンの境界
    this.gfx.lineStyle(2, ZONE_COLOR, 0.12);
    this.gfx.strokeRect(moveZone.x + 4, moveZone.y + 4, moveZone.width - 8, moveZone.height - 8);
    this.gfx.fillStyle(ZONE_COLOR, 0.06);
    this.gfx.fillRect(moveZone.x, moveZone.y, moveZone.width, moveZone.height);
    // 右: ジャンプ(左上) + ショット(右下)の仮想ボタン
    this.drawButton(jumpButton.x, jumpButton.y, jumpButton.radius, JUMP_COLOR);
    this.drawButton(shootButton.x, shootButton.y, shootButton.radius, SHOOT_COLOR);

    this.shootLabel.setPosition(shootButton.x, shootButton.y);
    this.jumpLabel.setPosition(jumpButton.x, jumpButton.y);
    this.moveHint.setPosition(moveZone.x + moveZone.width / 2, height - 26);
  }

  private drawButton(x: number, y: number, radius: number, color: number): void {
    this.gfx.fillStyle(color, 0.12);
    this.gfx.fillCircle(x, y, radius);
    this.gfx.lineStyle(2, color, 0.5);
    this.gfx.strokeCircle(x, y, radius);
  }

  destroy(): void {
    this.gfx.destroy();
    this.shootLabel.destroy();
    this.jumpLabel.destroy();
    this.moveHint.destroy();
  }
}
