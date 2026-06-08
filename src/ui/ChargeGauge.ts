import Phaser from 'phaser';
import { SHOOT_BUTTON } from '../config/touchLayout';

// チャージ蓄積を示す円形ゲージ。ショットボタン付近に表示し、満タンで発光する。

const RADIUS = SHOOT_BUTTON.radius + 10;
const COLOR_PROGRESS = 0x9b8cff;
const COLOR_FULL = 0xfff27a; // しきい値到達で発光色に切り替え

export class ChargeGauge {
  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.gfx.setScrollFactor(0).setDepth(101);
  }

  /** チャージ比率(0–1)を反映。1 で発光色のフルリング。 */
  render(ratio: number): void {
    this.gfx.clear();
    if (ratio <= 0) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    const isFull = clamped >= 1;
    const color = isFull ? COLOR_FULL : COLOR_PROGRESS;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * clamped;

    this.gfx.lineStyle(6, color, isFull ? 1 : 0.85);
    this.gfx.beginPath();
    this.gfx.arc(SHOOT_BUTTON.x, SHOOT_BUTTON.y, RADIUS, startAngle, endAngle, false);
    this.gfx.strokePath();

    if (isFull) {
      // 発光感を出す外側の薄いリング
      this.gfx.lineStyle(3, COLOR_FULL, 0.35);
      this.gfx.strokeCircle(SHOOT_BUTTON.x, SHOOT_BUTTON.y, RADIUS + 6);
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
