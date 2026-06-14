import Phaser from 'phaser';
import { scaledFontPx } from '../config/uiScale';

// メニュー用テキストボタンの共通ファクトリ。hover/out の色変化 + 押下ハンドラを持つ。
// stageSelect.ts のローカル実装を一般化し、ステージ選択とオプションメニューで共有する
// (重複定義を作らない)。フォントサイズ/色は任意で上書きできる。

export interface MenuButtonStyle {
  /** ベース fontSize(px)。内部で scaledFontPx により高DPI換算する。既定 20。 */
  fontSize?: number;
  /** 通常時の文字色。既定 '#cfe9e2'。 */
  color?: string;
  /** ホバー/押下候補時の文字色。既定 '#fff27a'。 */
  hoverColor?: string;
}

/**
 * 中央寄せのインタラクティブなテキストボタンを生成して返す(シーンに追加済み)。
 * @param scene   追加先シーン
 * @param x,y     中央座標
 * @param label   表示文字列
 * @param onClick 押下(POINTER_DOWN)時のハンドラ。効果音は呼び出し側で鳴らす。
 * @param style   フォントサイズ・色の上書き(任意)
 */
export function makeMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  style: MenuButtonStyle = {},
): Phaser.GameObjects.Text {
  const fontSize = style.fontSize ?? 20;
  const baseColor = style.color ?? '#cfe9e2';
  const hoverColor = style.hoverColor ?? '#fff27a';
  const btn = scene.add
    .text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: scaledFontPx(fontSize),
      color: baseColor,
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  btn.on(Phaser.Input.Events.POINTER_OVER, () => btn.setColor(hoverColor));
  btn.on(Phaser.Input.Events.POINTER_OUT, () => btn.setColor(baseColor));
  btn.on(Phaser.Input.Events.POINTER_DOWN, onClick);
  return btn;
}
