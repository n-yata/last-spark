import Phaser from 'phaser';
import { EFFECTS } from '../config/effects';
import { entranceFillRatio } from '../systems/hudFx';

// ボス HP ゲージ(ボス戦中のみ画面下部に表示)。実画面サイズに追従する。
// 出現時はゲージが 0→満タンへ満ちるフィル演出で「ボス戦開始」を演出する。

const BAR_HEIGHT = 16;
const BOTTOM_MARGIN = 40;
const BORDER = 0xff4d6d;
const FILL = 0xff2d55; // 警告色(ボスの脅威)
const BG = 0x1a0d12;

export class BossHpBar {
  private readonly scene: Phaser.Scene;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private visible = false;
  /** show() を呼んだ時刻(ms)。出現フィル演出の起点。負なら未表示。 */
  private shownAtMs = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics();
    this.gfx.setScrollFactor(0).setDepth(100).setVisible(false);
    this.label = scene.add
      .text(0, 0, '守護機械', {
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
    this.shownAtMs = this.scene.time.now;
    this.gfx.setVisible(true);
    this.label.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.gfx.setVisible(false);
    this.label.setVisible(false);
  }

  render(hp: number, maxHp: number, nowMs: number): void {
    if (!this.visible) return;
    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;
    const barWidth = Math.min(520, screenW - 80);
    const barY = screenH - BOTTOM_MARGIN;
    const x = (screenW - barWidth) / 2;
    const actualRatio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    // 出現直後は 0→満タンへ満ちるフィル演出。満ちた後は実際の HP 比率に従う。
    const fillProgress =
      this.shownAtMs >= 0
        ? entranceFillRatio(nowMs - this.shownAtMs, EFFECTS.hud.bossBarFillMs)
        : 1;
    const ratio = Math.min(actualRatio, fillProgress);

    this.label.setPosition(screenW / 2, barY - 6);
    this.gfx.clear();
    this.gfx.fillStyle(BG, 0.85).fillRect(x, barY, barWidth, BAR_HEIGHT);
    this.gfx.fillStyle(FILL, 1).fillRect(x, barY, barWidth * ratio, BAR_HEIGHT);
    this.gfx.lineStyle(2, BORDER, 1).strokeRect(x, barY, barWidth, BAR_HEIGHT);
  }

  destroy(): void {
    this.gfx.destroy();
    this.label.destroy();
  }
}
