import Phaser from 'phaser';
import {
  MOVE_PAD_BASE_RADIUS,
  MOVE_PAD_STICK_RADIUS,
  clampStick,
} from '../config/touchLayout';

// 追従式タッチパッドの描画。触れた箇所(原点)にリングを、指の位置にスティックを表示する。

const BASE_COLOR = 0x37f7d8;
const STICK_COLOR = 0x9fffe8;

export class MovePad {
  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.gfx.setScrollFactor(0).setDepth(96).setVisible(false);
  }

  /** パッドの表示を更新する。active=false で非表示。 */
  render(active: boolean, baseX: number, baseY: number, curX: number, curY: number): void {
    this.gfx.clear();
    if (!active) {
      this.gfx.setVisible(false);
      return;
    }
    this.gfx.setVisible(true);

    // 原点リング(ベース)
    this.gfx.fillStyle(BASE_COLOR, 0.12);
    this.gfx.fillCircle(baseX, baseY, MOVE_PAD_BASE_RADIUS);
    this.gfx.lineStyle(2, BASE_COLOR, 0.5);
    this.gfx.strokeCircle(baseX, baseY, MOVE_PAD_BASE_RADIUS);

    // スティック(指の位置、原点から最大半径でクランプ)
    const stick = clampStick(baseX, baseY, curX, curY);
    this.gfx.fillStyle(STICK_COLOR, 0.45);
    this.gfx.fillCircle(stick.x, stick.y, MOVE_PAD_STICK_RADIUS);
    this.gfx.lineStyle(2, STICK_COLOR, 0.8);
    this.gfx.strokeCircle(stick.x, stick.y, MOVE_PAD_STICK_RADIUS);
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
