import Phaser from 'phaser';
import { EFFECTS } from '../config/effects';
import { scaled } from '../config/uiScale';
import { damageFlashActive, flashBlinkOn, nextLagRatio, chargePulseAlpha } from '../systems/hudFx';

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
const COLOR_GHOST = 0xffb14a; // 残像ゴースト(琥珀。BossHpBar の DAMAGE_LAG と揃える)
const COLOR_CRITICAL_BORDER = 0xff2d55; // 危機パルスの警告色(枠線)

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
  /** 実 HP より少し遅れて減る残像ゲージ(hp 単位)。負は未観測。 */
  private lagHp = -1;

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

    // 残像ゲージ(hp 単位)。未観測なら現在値から開始する。
    const maxHpSafe = Math.max(1, maxHp);
    if (this.lagHp < 0) this.lagHp = clamped;
    this.lagHp =
      nextLagRatio(this.lagHp / maxHpSafe, clamped / maxHpSafe, EFFECTS.hud.lifeBarLagDrainPerFrame) *
      maxHpSafe;

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

    const critical = maxHp > 0 && clamped / maxHp <= 0.25;
    if (critical) {
      const pulseAlpha = chargePulseAlpha(
        nowMs,
        EFFECTS.hud.criticalPulseMs,
        EFFECTS.hud.criticalPulseAlphaMin,
        EFFECTS.hud.criticalPulseAlphaMax,
      );
      this.gfx.lineStyle(scaled(1.5), COLOR_CRITICAL_BORDER, pulseAlpha);
    } else {
      this.gfx.lineStyle(scaled(1), COLOR_BORDER, 0.28);
    }
    this.gfx.strokeRoundedRect(panelX, panelY, panelW, panelH, scaled(4));

    for (let i = 0; i < maxHp; i++) {
      const filled = i < clamped;
      // ゴースト幅比率: 実 HP と lagHp の差分区間(未充填のみ)。端数は部分幅で描く。
      const ghostRatio = filled ? 0 : Math.max(0, Math.min(1, this.lagHp - i));
      const isLostSegment = flashing && i >= this.flashFrom && i < this.flashTo;
      // セグメント寸法・配置は scaled() で物理px換算し、高DPIでも見た目を一定に保つ。
      const x = scaled(ORIGIN_X + i * (SEG_WIDTH + SEG_GAP));
      const y = scaled(ORIGIN_Y);
      const w = scaled(SEG_WIDTH);
      const h = scaled(SEG_HEIGHT);

      // 空セグメント(下地)
      this.gfx.fillStyle(COLOR_EMPTY, 0.5);
      this.gfx.fillRect(x, y, w, h);

      // ゴースト(琥珀。実 HP と lagHp の差分区間)
      if (ghostRatio > 0) {
        this.gfx.fillStyle(COLOR_GHOST, 0.5);
        this.gfx.fillRect(x, y, w * ghostRatio, h);
      }

      // 実 HP セグメント
      if (filled) {
        const fillColor = critical ? COLOR_CRITICAL : COLOR_FULL;
        this.gfx.fillStyle(fillColor, 1);
        this.gfx.fillRect(x, y, w, h);
      }

      // 失った直後のセグメント: 警告色で明滅させてから空へ落とす(最前)
      if (isLostSegment) {
        this.gfx.fillStyle(COLOR_LOST_FLASH, blinkOn ? 1 : 0.25);
        this.gfx.fillRect(x, y, w, h);
      }

      this.gfx.lineStyle(scaled(1), 0x9fffe8, filled ? 0.18 : 0.08);
      this.gfx.strokeRect(x, y, w, h);
    }
  }

  destroy(): void {
    this.gfx.destroy();
    this.label.destroy();
  }
}
