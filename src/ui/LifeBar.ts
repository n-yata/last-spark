import Phaser from 'phaser';

// プレイヤーライフのセグメント式エナジーバー(HUD 左上)。

const SEG_WIDTH = 10;
const SEG_HEIGHT = 18;
const SEG_GAP = 3;
const ORIGIN_X = 20;
const ORIGIN_Y = 20;
const COLOR_FULL = 0x37f7d8; // ネオン発光色
const COLOR_EMPTY = 0x223038;

export class LifeBar {
  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.gfx.setScrollFactor(0).setDepth(100);
  }

  /** 現在/最大 HP を反映して描画する。 */
  render(hp: number, maxHp: number): void {
    this.gfx.clear();
    const clamped = Math.max(0, Math.min(maxHp, hp));
    for (let i = 0; i < maxHp; i++) {
      const filled = i < clamped;
      this.gfx.fillStyle(filled ? COLOR_FULL : COLOR_EMPTY, filled ? 1 : 0.5);
      const x = ORIGIN_X + i * (SEG_WIDTH + SEG_GAP);
      this.gfx.fillRect(x, ORIGIN_Y, SEG_WIDTH, SEG_HEIGHT);
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
