import Phaser from 'phaser';
import {
  JUMP_SWIPE_PX,
  MOVE_PAD_BASE_RADIUS,
  MOVE_PAD_STICK_RADIUS,
  clampStick,
  isJumpSwipeHeld,
} from '../config/touchLayout';

// 追従式タッチパッドの描画。触れた箇所(原点)にリングを、指の位置にスティックを表示する。
// 上方向は「上スワイプ=ジャンプ」のため、しきい値位置にシェブロンガイドを示す。

const BASE_COLOR = 0x37f7d8;
const STICK_COLOR = 0x9fffe8;
// ジャンプ発動中(上スワイプしきい値到達)のスティック強調色
const JUMP_COLOR = 0x6cf0ff;

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

    // 上スワイプ=ジャンプの保持判定(原点からの上方向変位がしきい値以上か)
    const jumping = isJumpSwipeHeld(baseY - curY);

    // 原点リング(ベース)
    this.gfx.fillStyle(BASE_COLOR, 0.12);
    this.gfx.fillCircle(baseX, baseY, MOVE_PAD_BASE_RADIUS);
    this.gfx.lineStyle(2, BASE_COLOR, 0.5);
    this.gfx.strokeCircle(baseX, baseY, MOVE_PAD_BASE_RADIUS);

    // 上=ジャンプのガイド(しきい値位置の控えめなシェブロン ▲)。発動中は強調する。
    this.drawJumpChevron(baseX, baseY - JUMP_SWIPE_PX, jumping);

    // スティック(指の位置、原点から最大半径でクランプ)。ジャンプ発動中は強調色。
    const stick = clampStick(baseX, baseY, curX, curY);
    const stickColor = jumping ? JUMP_COLOR : STICK_COLOR;
    this.gfx.fillStyle(stickColor, jumping ? 0.6 : 0.45);
    this.gfx.fillCircle(stick.x, stick.y, MOVE_PAD_STICK_RADIUS);
    this.gfx.lineStyle(2, stickColor, jumping ? 1 : 0.8);
    this.gfx.strokeCircle(stick.x, stick.y, MOVE_PAD_STICK_RADIUS);
  }

  /** 原点の上方向(tipX, tipY)にジャンプを示すシェブロン(▲)を描く。 */
  private drawJumpChevron(tipX: number, tipY: number, active: boolean): void {
    const half = 12;
    const h = 12;
    this.gfx.lineStyle(3, JUMP_COLOR, active ? 0.9 : 0.4);
    this.gfx.beginPath();
    this.gfx.moveTo(tipX - half, tipY + h);
    this.gfx.lineTo(tipX, tipY);
    this.gfx.lineTo(tipX + half, tipY + h);
    this.gfx.strokePath();
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
