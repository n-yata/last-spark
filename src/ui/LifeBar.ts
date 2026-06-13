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

export class LifeBar {
  private readonly gfx: Phaser.GameObjects.Graphics;
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
    for (let i = 0; i < maxHp; i++) {
      const filled = i < clamped;
      const isLostSegment = flashing && i >= this.flashFrom && i < this.flashTo;
      if (isLostSegment) {
        // 失った直後のセグメント: 警告色で明滅させてから空へ落とす
        this.gfx.fillStyle(COLOR_LOST_FLASH, blinkOn ? 1 : 0.25);
      } else {
        this.gfx.fillStyle(filled ? COLOR_FULL : COLOR_EMPTY, filled ? 1 : 0.5);
      }
      // セグメント寸法・配置は scaled() で物理px換算し、高DPIでも見た目を一定に保つ。
      const x = scaled(ORIGIN_X + i * (SEG_WIDTH + SEG_GAP));
      this.gfx.fillRect(x, scaled(ORIGIN_Y), scaled(SEG_WIDTH), scaled(SEG_HEIGHT));
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
