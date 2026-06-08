import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig';

// ボス HP ゲージ(ボス戦中のみ画面下部に表示)。

const BAR_WIDTH = 520;
const BAR_HEIGHT = 16;
const BAR_Y = 500;
const BORDER = 0xff4d6d;
const FILL = 0xff2d55; // 警告色(ボスの脅威)
const BG = 0x1a0d12;

export class BossHpBar {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.gfx.setScrollFactor(0).setDepth(100).setVisible(false);
    this.label = scene.add
      .text(GAME_WIDTH / 2, BAR_Y - 16, '守護機械', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ff90a8',
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);
  }

  show(): void {
    this.visible = true;
    this.gfx.setVisible(true);
    this.label.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.gfx.setVisible(false);
    this.label.setVisible(false);
  }

  render(hp: number, maxHp: number): void {
    if (!this.visible) return;
    const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    const x = (GAME_WIDTH - BAR_WIDTH) / 2;
    this.gfx.clear();
    this.gfx.fillStyle(BG, 0.85).fillRect(x, BAR_Y, BAR_WIDTH, BAR_HEIGHT);
    this.gfx.fillStyle(FILL, 1).fillRect(x, BAR_Y, BAR_WIDTH * ratio, BAR_HEIGHT);
    this.gfx.lineStyle(2, BORDER, 1).strokeRect(x, BAR_Y, BAR_WIDTH, BAR_HEIGHT);
  }

  destroy(): void {
    this.gfx.destroy();
    this.label.destroy();
  }
}
