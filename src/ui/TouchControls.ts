import Phaser from 'phaser';
import type { TouchLayout } from '../config/touchLayout';
import { EFFECTS } from '../config/effects';
import { scaled, scaledFontPx } from '../config/uiScale';

// 仮想ボタン(SHOT/JUMP)と下部操作帯のガイドを描画する(操作はしない=表示のみ)。
// タッチ端末でのみ表示し、非タッチ(デスクトップ)では一切描画しない。
// 入力判定は InputController が別系統で行うため、本クラスの表示有無は操作に影響しない。
// 実画面サイズに追従するため、毎フレーム render(layout) で再描画する。

const ZONE_COLOR = 0x37f7d8;
const SHOOT_COLOR = 0xfff27a;
const JUMP_COLOR = 0x6cf0ff;
const BAND_COLOR = 0x05080c;

export class TouchControls {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly shootLabel: Phaser.GameObjects.Text;
  private readonly jumpLabel: Phaser.GameObjects.Text;
  private readonly moveHint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(95).setAlpha(0.85);
    const labelStyle = { fontFamily: 'monospace', fontSize: scaledFontPx(14) };
    this.shootLabel = scene.add
      .text(0, 0, 'SHOT', { ...labelStyle, color: '#fff6c2' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(95);
    this.jumpLabel = scene.add
      .text(0, 0, 'JUMP', { ...labelStyle, color: '#c7f6ff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(95);
    this.moveHint = scene.add
      .text(0, 0, '◀  MOVE  ▶', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(16),
        color: '#7fe9dd',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(95)
      .setAlpha(0.5);
  }

  /**
   * 現在のレイアウト(実画面サイズ基準)に合わせてガイドを再描画する。
   * touchEnabled=false(非タッチ端末)では帯・ボタン・ラベルを一切描画せず、画面を素のまま保つ。
   * bandHeight>0(タッチ時の下部コントロール帯)の場合、画面下部に帯背景を描画し、
   * 仮想ボタンが帯の上に乗るようにする(プレイ領域=帯の上、ボタン=帯の中)。
   * shootHeld/jumpHeld が true のボタンは強調表示し、指で隠れても押下中と分かるようにする。
   */
  render(
    layout: TouchLayout,
    width: number,
    height: number,
    bandHeight = 0,
    shootHeld = false,
    jumpHeld = false,
    touchEnabled = false,
  ): void {
    this.gfx.clear();
    // 非タッチ端末(デスクトップ等)ではキーボード操作のため、仮想ボタン・帯・ラベルは不要。
    // 全要素を非表示にして素の画面を保つ(移動ゾーンの枠線・薄塗りもここで一切描かれない)。
    if (!touchEnabled) {
      this.shootLabel.setVisible(false);
      this.jumpLabel.setVisible(false);
      this.moveHint.setVisible(false);
      return;
    }
    this.shootLabel.setVisible(true);
    this.jumpLabel.setVisible(true);
    this.moveHint.setVisible(true);

    const { moveZone, shootButton, jumpButton } = layout;
    // 下部コントロール帯の背景。プレイ領域との境界に上端線を引く。
    if (bandHeight > 0) {
      const bandTop = height - bandHeight;
      this.gfx.fillStyle(BAND_COLOR, 0.92);
      this.gfx.fillRect(0, bandTop, width, bandHeight);
      this.gfx.lineStyle(scaled(2), ZONE_COLOR, 0.25);
      this.gfx.lineBetween(0, bandTop, width, bandTop);
    }
    // 右: ジャンプ(左上) + ショット(右下)の仮想ボタン
    this.drawButton(jumpButton.x, jumpButton.y, jumpButton.radius, JUMP_COLOR, jumpHeld);
    this.drawButton(shootButton.x, shootButton.y, shootButton.radius, SHOOT_COLOR, shootHeld);

    this.shootLabel.setPosition(shootButton.x, shootButton.y);
    this.jumpLabel.setPosition(jumpButton.x, jumpButton.y);
    // 帯ありはプレイ領域の下端付近(帯の上)に、帯なしは従来どおり画面下端付近に置く。
    const hintY = bandHeight > 0 ? height - bandHeight - scaled(16) : height - scaled(26);
    this.moveHint.setPosition(moveZone.x + moveZone.width / 2, hintY);
  }

  private drawButton(x: number, y: number, radius: number, color: number, held = false): void {
    // 押下中は塗りを濃く・輪郭を太く・半径を広げる(指の外周からも押下中と分かる)。
    const r = held ? radius * EFFECTS.touch.pressedRadiusScale : radius;
    this.gfx.fillStyle(color, held ? EFFECTS.touch.pressedFillAlpha : 0.12);
    this.gfx.fillCircle(x, y, r);
    this.gfx.lineStyle(scaled(held ? 3 : 2), color, held ? 0.9 : 0.5);
    this.gfx.strokeCircle(x, y, r);
  }

  destroy(): void {
    this.gfx.destroy();
    this.shootLabel.destroy();
    this.jumpLabel.destroy();
    this.moveHint.destroy();
  }
}
