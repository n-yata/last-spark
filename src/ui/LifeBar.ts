import Phaser from 'phaser';
import { EFFECTS } from '../config/effects';
import { scaled } from '../config/uiScale';
import { damageFlashActive, flashBlinkOn } from '../systems/hudFx';

// プレイヤーライフのセグメント式エナジーバー(HUD 左上)。
// 被ダメ時は失ったセグメントを短時間点滅させ、どれだけ削られたかを視覚で伝える。

const SEG_WIDTH = 10;
const SEG_HEIGHT = 18;
const SEG_GAP = 3;
const ORIGIN_X = 20;
const ORIGIN_Y = 20;
const COLOR_FULL = 0x37f7d8; // ネオン発光色
const COLOR_EMPTY = 0x223038;
const COLOR_LOST_FLASH = 0xff2d55; // 失ったセグメントの点滅色(警告色)
const COLOR_CRITICAL = 0xfff27a;
const COLOR_PANEL = 0x05080c;
const COLOR_BORDER = 0x37f7d8;

export class LifeBar {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  /** 前フレームの HP。減少検知に使う(-1 は未観測)。 */
  private prevHp = -1;
  /** 被ダメ発生時刻(ms)。負なら未発生。 */
  private damagedAtMs = -1;
  /** 点滅対象のセグメント範囲 [flashFrom, flashTo)。 */
  private flashFrom = 0;
  private flashTo = 0;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.gfx.setScrollFactor(0).setDepth(100);
    this.label = scene.add
      .text(scaled(ORIGIN_X), scaled(ORIGIN_Y - 4), 'RAY', {
        fontFamily: 'monospace',
        fontSize: `${scaled(10)}px`,
        color: '#9fffe8',
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(100);
  }

  /** 現在/最大 HP を反映して描画する。nowMs は点滅の位相計算に使う。 */
  render(hp: number, maxHp: number, nowMs: number): void {
    const clamped = Math.max(0, Math.min(maxHp, hp));

    // HP 減少の立ち上がりでフラッシュ開始(連続被弾は範囲を広げて取り直す)
    if (this.prevHp >= 0 && clamped < this.prevHp) {
      this.damagedAtMs = nowMs;
      this.flashFrom = clamped;
      this.flashTo = Math.max(this.flashTo, this.prevHp);
    }
    this.prevHp = clamped;

    const flashing = damageFlashActive(nowMs, this.damagedAtMs, EFFECTS.hud.lifeBarFlashMs);
    const blinkOn =
      flashing && flashBlinkOn(nowMs, this.damagedAtMs, EFFECTS.hud.lifeBarBlinkIntervalMs);
    if (!flashing) {
      this.flashTo = 0; // フラッシュ終了で点滅範囲をリセット
    }

    this.gfx.clear();
    const totalW = maxHp * SEG_WIDTH + Math.max(0, maxHp - 1) * SEG_GAP;
    const panelX = scaled(ORIGIN_X - 8);
    const panelY = scaled(ORIGIN_Y - 10);
    const panelW = scaled(totalW + 16);
    const panelH = scaled(SEG_HEIGHT + 18);
    this.gfx.fillStyle(COLOR_PANEL, 0.72);
    this.gfx.fillRoundedRect(panelX, panelY, panelW, panelH, scaled(4));
    this.gfx.lineStyle(scaled(1), COLOR_BORDER, 0.28);
    this.gfx.strokeRoundedRect(panelX, panelY, panelW, panelH, scaled(4));

    const critical = maxHp > 0 && clamped / maxHp <= 0.25;
    for (let i = 0; i < maxHp; i++) {
      const filled = i < clamped;
      const isLostSegment = flashing && i >= this.flashFrom && i < this.flashTo;
      if (isLostSegment) {
        // 失った直後のセグメント: 警告色で明滅させてから空へ落とす
        this.gfx.fillStyle(COLOR_LOST_FLASH, blinkOn ? 1 : 0.25);
      } else {
        const fillColor = critical && filled ? COLOR_CRITICAL : COLOR_FULL;
        this.gfx.fillStyle(filled ? fillColor : COLOR_EMPTY, filled ? 1 : 0.5);
      }
      // セグメント寸法・配置は scaled() で物理px換算し、高DPIでも見た目を一定に保つ。
      const x = scaled(ORIGIN_X + i * (SEG_WIDTH + SEG_GAP));
      this.gfx.fillRect(x, scaled(ORIGIN_Y), scaled(SEG_WIDTH), scaled(SEG_HEIGHT));
      this.gfx.lineStyle(scaled(1), 0x9fffe8, filled ? 0.18 : 0.08);
      this.gfx.strokeRect(x, scaled(ORIGIN_Y), scaled(SEG_WIDTH), scaled(SEG_HEIGHT));
    }
  }

  destroy(): void {
    this.gfx.destroy();
    this.label.destroy();
  }
}
