import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config/gameConfig';
import { JUMP_BUTTON, SHOOT_BUTTON, MOVE_ZONE } from '../config/touchLayout';

// 仮想ボタン/移動ゾーンの半透明ガイドを描画する(操作はしない=表示のみ)。
// 親指で隠れにくい位置・サイズ。実機調整前提。

const ZONE_COLOR = 0x37f7d8;
const JUMP_COLOR = 0x6cf0ff;
const SHOOT_COLOR = 0xfff27a;

export class TouchControls {
  private readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    const gfx = scene.add.graphics();

    // 左: 移動ゾーンの境界と方向ヒント
    gfx.lineStyle(2, ZONE_COLOR, 0.12);
    gfx.strokeRect(MOVE_ZONE.x + 4, MOVE_ZONE.y + 4, MOVE_ZONE.width - 8, MOVE_ZONE.height - 8);
    gfx.fillStyle(ZONE_COLOR, 0.06);
    gfx.fillRect(MOVE_ZONE.x, MOVE_ZONE.y, MOVE_ZONE.width, MOVE_ZONE.height);

    // 右: 仮想ボタン
    this.drawButton(gfx, JUMP_BUTTON.x, JUMP_BUTTON.y, JUMP_BUTTON.radius, JUMP_COLOR);
    this.drawButton(gfx, SHOOT_BUTTON.x, SHOOT_BUTTON.y, SHOOT_BUTTON.radius, SHOOT_COLOR);

    const jumpLabel = scene.add
      .text(JUMP_BUTTON.x, JUMP_BUTTON.y, 'JUMP', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#cdefff',
      })
      .setOrigin(0.5);
    const shootLabel = scene.add
      .text(SHOOT_BUTTON.x, SHOOT_BUTTON.y, 'SHOT', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#fff6c2',
      })
      .setOrigin(0.5);
    const moveHint = scene.add
      .text(MOVE_ZONE.width / 2, GAME_HEIGHT - 26, '◀  MOVE  ▶', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#7fe9dd',
      })
      .setOrigin(0.5)
      .setAlpha(0.5);

    this.container = scene.add.container(0, 0, [gfx, jumpLabel, shootLabel, moveHint]);
    this.container.setScrollFactor(0).setDepth(95).setAlpha(0.85);
  }

  private drawButton(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    color: number,
  ): void {
    gfx.fillStyle(color, 0.12);
    gfx.fillCircle(x, y, radius);
    gfx.lineStyle(2, color, 0.5);
    gfx.strokeCircle(x, y, radius);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy();
  }
}
