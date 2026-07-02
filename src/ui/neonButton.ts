import Phaser from 'phaser';
import { scaled, scaledFontPx } from '../config/uiScale';

// メニュー系シーン共通のボタン部品(NeonButton)。
// 角丸の半透明ダークパネル + ネオン色のグロー枠 + ラベルで「押せる場所」を明示し、
// 押下時は沈み込み(scale)+枠の発光フラッシュで「押せたこと」を返す。
// hover の無いモバイル(本作の主対象)でも操作フィードバックが成立するのが狙い。
//
// - onClick は POINTER_DOWN で即時発火する(応答性を落とさない)。演出は並行再生。
// - 効果音は従来どおり呼び出し側が鳴らす(onSelectStage 等での二重再生防止の既存方針)。
// - 絶対px・fontSize は scaled()/scaledFontPx() を経由する(高DPI規約)。
// - ghost variant はパネル・枠なし(旧 menuButton 相当の見た目 + 押下フィードバック)。
//   音量の ◂ ▸ や小さな BACK など、パネルだと過剰な補助導線に使う。

export type NeonButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';

export interface NeonButtonStyle {
  /** 見た目の系統。既定 'default'。 */
  variant?: NeonButtonVariant;
  /** ベース fontSize(px)。内部で scaledFontPx により高DPI換算する。既定 20。 */
  fontSize?: number;
  /** パネル幅の下限(ベースpx)。縦並びメニューの幅を揃える用。既定 0(ラベル幅なり)。 */
  minWidth?: number;
}

/** variant ごとの配色。label 系は CSS 色(Text 用)、frame/fill は数値色(Graphics 用)。 */
export interface NeonButtonColors {
  label: string;
  labelHover: string;
  frame: number;
  fill: number;
}

export const NEON_BUTTON_COLORS: Record<NeonButtonVariant, NeonButtonColors> = {
  // 既存パレット準拠(optionsMenu の COLOR_* / 各シーンの実色から採色)。
  default: { label: '#cfe9e2', labelHover: '#fff27a', frame: 0x37f7d8, fill: 0x0d1a22 },
  primary: { label: '#fff27a', labelHover: '#ffffff', frame: 0xfff27a, fill: 0x1a1608 },
  danger: { label: '#ff9a8a', labelHover: '#ffd27a', frame: 0xff9a8a, fill: 0x1c0d0d },
  // ghost はパネルを描かないため frame/fill は未使用(型を揃えるため default と同値を置く)。
  ghost: { label: '#cfe9e2', labelHover: '#fff27a', frame: 0x37f7d8, fill: 0x0d1a22 },
};

/** パネルの寸法(すべて「scaled 適用後」の実px)。 */
export interface ButtonMetrics {
  width: number;
  height: number;
  radius: number;
}

/**
 * ラベル実寸(scaled 適用後の text.width/height)からパネル寸法を決める純関数。
 * パディングはラベル高さ比で決め、フォントサイズ(=dpr 換算後の実寸)に自然に追従させる。
 * @param labelWidth  ラベルの実幅(px)
 * @param labelHeight ラベルの実高(px)
 * @param minWidth    パネル幅の下限(px)。0 以下ならラベル幅なり。
 */
export function computeButtonMetrics(
  labelWidth: number,
  labelHeight: number,
  minWidth = 0,
): ButtonMetrics {
  // padY は控えめ(高さの32%)にする。縦並びメニュー(400px 高のモバイル横持ちに
  // 6項目)でも行間に収まる高さを優先する(パネル化で行が太ることへの対策)。
  const padX = labelHeight * 1.1;
  const padY = labelHeight * 0.32;
  const height = Math.round(labelHeight + padY * 2);
  const width = Math.round(Math.max(labelWidth + padX * 2, minWidth));
  // 角丸はパネル高さ比。高さの半分(カプセル形)までは丸めず、枠らしさを残す。
  const radius = Math.round(height * 0.28);
  return { width, height, radius };
}

export interface NeonButton {
  /** ルート Container(呼び出し側が Container.add / depth 管理に使う)。 */
  readonly container: Phaser.GameObjects.Container;
  /** ラベルを差し替える(パネル寸法・ヒットエリアも追従)。 */
  setLabel(text: string): void;
  /** 押下可否を切り替える(false で減光 + 入力無効)。 */
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

/**
 * 共通ボタンを生成してシーンに追加し、NeonButton を返す。
 * @param scene   追加先シーン
 * @param x,y     中央座標
 * @param label   表示文字列
 * @param onClick 押下(POINTER_DOWN)時のハンドラ。効果音は呼び出し側で鳴らす。
 * @param style   variant / fontSize / minWidth の上書き(任意)
 */
export function createNeonButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  style: NeonButtonStyle = {},
): NeonButton {
  const variant = style.variant ?? 'default';
  const colors = NEON_BUTTON_COLORS[variant];
  const isGhost = variant === 'ghost';

  const container = scene.add.container(x, y);
  const panel = isGhost ? undefined : scene.add.graphics();
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize: scaledFontPx(style.fontSize ?? 20),
      color: colors.label,
    })
    .setOrigin(0.5);
  if (panel) container.add(panel);
  container.add(text);

  // パネル描画とヒットエリアをラベル実寸から確定する(setLabel 時も同じ経路で再確定)。
  const layout = (): void => {
    // ghost はパネルなし。ヒットエリアはラベル寸法 + わずかな余白(タップしやすさ)。
    const m = isGhost
      ? {
          width: Math.round(text.width + text.height * 0.6),
          height: Math.round(text.height * 1.5),
          radius: 0,
        }
      : computeButtonMetrics(text.width, text.height, scaled(style.minWidth ?? 0));
    if (panel) {
      panel.clear();
      // 外周の淡い太線でグロー(にじみ)を擬似的に出し、内側に本線を引く。
      panel.lineStyle(scaled(4), colors.frame, 0.18);
      panel.strokeRoundedRect(-m.width / 2, -m.height / 2, m.width, m.height, m.radius);
      panel.fillStyle(colors.fill, 0.82);
      panel.fillRoundedRect(-m.width / 2, -m.height / 2, m.width, m.height, m.radius);
      panel.lineStyle(scaled(1.5), colors.frame, 0.9);
      panel.strokeRoundedRect(-m.width / 2, -m.height / 2, m.width, m.height, m.radius);
    }
    container.setSize(m.width, m.height);
    // Container の入力ローカル座標は displayOrigin(=size/2)加算後の「左上原点 0..width」で
    // 渡される(実測で確認)。中央原点の矩形(-w/2..)を渡すと判定が左上へ半分ズレるため、
    // ヒットエリアは必ず (0, 0, w, h) で指定する。
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, m.width, m.height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
  };
  layout();

  let enabled = true;

  // hover(PC のみ発生): ラベル・枠の増光。
  container.on(Phaser.Input.Events.POINTER_OVER, () => {
    if (!enabled) return;
    text.setColor(colors.labelHover);
    panel?.setAlpha(1);
  });
  container.on(Phaser.Input.Events.POINTER_OUT, () => {
    text.setColor(colors.label);
    panel?.setAlpha(0.9);
  });
  panel?.setAlpha(0.9);

  // 押下: onClick を即時発火し、沈み込み + 発光フラッシュを並行再生する。
  container.on(Phaser.Input.Events.POINTER_DOWN, () => {
    if (!enabled) return;
    scene.tweens.add({
      targets: container,
      scale: 0.94,
      duration: 55,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    if (panel) {
      panel.setAlpha(1);
      scene.tweens.add({ targets: panel, alpha: 0.9, duration: 160, ease: 'Quad.easeOut' });
    }
    onClick();
  });

  // シーン遷移やパネル差し替えで破棄された後に tween が残らないようにする。
  container.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.tweens.killTweensOf(container);
    if (panel) scene.tweens.killTweensOf(panel);
  });

  return {
    container,
    setLabel: (next: string): void => {
      text.setText(next);
      layout();
    },
    setEnabled: (next: boolean): void => {
      enabled = next;
      container.setAlpha(next ? 1 : 0.4);
      if (next) container.setInteractive();
      else container.disableInteractive();
    },
    destroy: (): void => container.destroy(),
  };
}
