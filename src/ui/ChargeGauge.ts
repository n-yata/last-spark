import Phaser from 'phaser';
import type { CircleButton } from '../config/touchLayout';
import { scaled } from '../config/uiScale';

// チャージ蓄積を示す円形ゲージ。ショットボタン付近に表示し、満タンで発光する。

const COLOR_PROGRESS = 0x9b8cff;
const COLOR_FULL = 0xfff27a; // しきい値到達で発光色に切り替え

export class ChargeGauge {
  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.gfx.setScrollFactor(0).setDepth(101);
  }

  /** チャージ比率(0–1)を、現在のショットボタン位置に合わせて反映する。 */
  render(ratio: number, shootButton: CircleButton): void {
    this.gfx.clear();
    if (ratio <= 0) return;
    // shootButton.radius は layout 側で scaled 済み。追加の絶対px(間隔)も scaled() で揃える。
    const radius = shootButton.radius + scaled(10);
    const clamped = Math.max(0, Math.min(1, ratio));
    const isFull = clamped >= 1;
    const color = isFull ? COLOR_FULL : COLOR_PROGRESS;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * clamped;

    this.gfx.lineStyle(scaled(6), color, isFull ? 1 : 0.85);
    this.gfx.beginPath();
    this.gfx.arc(shootButton.x, shootButton.y, radius, startAngle, endAngle, false);
    this.gfx.strokePath();

    if (isFull) {
      // 発光感を出す外側の薄いリング
      this.gfx.lineStyle(scaled(3), COLOR_FULL, 0.35);
      this.gfx.strokeCircle(shootButton.x, shootButton.y, radius + scaled(6));
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
