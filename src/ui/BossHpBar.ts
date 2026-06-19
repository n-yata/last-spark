import Phaser from 'phaser';
import { EFFECTS } from '../config/effects';
import { scaled, scaledFontPx } from '../config/uiScale';
import { entranceFillRatio } from '../systems/hudFx';

// ボス HP ゲージ(ボス戦中のみ画面下部に表示)。実画面サイズに追従する。
// 出現時はゲージが 0→満タンへ満ちるフィル演出で「ボス戦開始」を演出する。

const BAR_HEIGHT = 16;
const BOTTOM_MARGIN = 40;
const BORDER = 0xff4d6d;
const FILL = 0xff2d55; // 警告色(ボスの脅威)
const DAMAGE_LAG = 0xffb14a;
const BG = 0x1a0d12;

export class BossHpBar {
  private readonly scene: Phaser.Scene;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private visible = false;
  /** show() を呼んだ時刻(ms)。出現フィル演出の起点。負なら未表示。 */
  private shownAtMs = -1;
  /** 実 HP より少し遅れて減る残像ゲージ。被弾量を読み取りやすくする。 */
  private lagRatio = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics();
    this.gfx.setScrollFactor(0).setDepth(100).setVisible(false);
    // ラベル文言はボスの固有名。show(name) で戦うボスごとに差し替える。
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(14),
        color: '#ff90a8',
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);
  }

  /** ボス戦開始時に表示する。name はそのボスの固有名(HUD.bossName 由来)。 */
  show(name: string): void {
    this.visible = true;
    this.shownAtMs = this.scene.time.now;
    this.lagRatio = 1;
    this.label.setText(name);
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
    // 寸法・余白の絶対px は scaled() で物理px換算する。
    const barHeight = scaled(BAR_HEIGHT);
    const barWidth = Math.min(scaled(520), screenW - scaled(80));
    const barY = screenH - scaled(BOTTOM_MARGIN);
    const x = (screenW - barWidth) / 2;
    const actualRatio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    if (actualRatio < this.lagRatio) {
      this.lagRatio = Math.max(actualRatio, this.lagRatio - 0.012);
    } else {
      this.lagRatio = actualRatio;
    }
    // 出現直後は 0→満タンへ満ちるフィル演出。満ちた後は実際の HP 比率に従う。
    const fillProgress =
      this.shownAtMs >= 0
        ? entranceFillRatio(nowMs - this.shownAtMs, EFFECTS.hud.bossBarFillMs)
        : 1;
    const ratio = Math.min(actualRatio, fillProgress);

    this.label.setPosition(screenW / 2, barY - scaled(6));
    this.gfx.clear();
    this.gfx
      .fillStyle(0x05080c, 0.62)
      .fillRoundedRect(
        x - scaled(10),
        barY - scaled(24),
        barWidth + scaled(20),
        barHeight + scaled(36),
        scaled(4),
      );
    this.gfx.fillStyle(BG, 0.85).fillRect(x, barY, barWidth, barHeight);
    this.gfx.fillStyle(DAMAGE_LAG, 0.42).fillRect(x, barY, barWidth * this.lagRatio, barHeight);
    this.gfx.fillStyle(FILL, 1).fillRect(x, barY, barWidth * ratio, barHeight);
    this.gfx.lineStyle(scaled(2), BORDER, 1).strokeRect(x, barY, barWidth, barHeight);
    this.gfx
      .lineStyle(scaled(1), 0xff90a8, 0.35)
      .lineBetween(x, barY - scaled(4), x + barWidth, barY - scaled(4));
  }

  destroy(): void {
    this.gfx.destroy();
    this.label.destroy();
  }
}
