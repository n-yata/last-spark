import Phaser from 'phaser';
import { getSound } from '../systems/SoundManager';
import { scaled, scaledFontPx } from '../config/uiScale';
import { createNeonButton } from '../ui/neonButton';
import {
  getStageBackground,
  generateSilhouetteColumns,
  hexToNum,
  lerpColor,
} from '../config/stageBackground';
import { SaveManager } from '../persistence/SaveManager';
import {
  buildStageCardModels,
  cardGridLayout,
  formatBestTime,
  type CardRect,
  type StageCardModel,
} from './stageCards';

// タイトル画面のステージ選択 UI(カード式)。任意の解放済みステージから本編を始められる。
// 各カードにステージ背景テーマのミニプレビュー・クリア状況・ベストタイム・ロック状態を表示する。
// 初期表示を軽くするため、TitleScene から表示確定後に「動的 import」で遅延ロードする
// (ステージ選択は導線をタップして初めて使うため、別チャンクに分けても体験を損なわない)。

export interface StageSelect {
  /** ステージ選択オーバーレイが開いているか(キーボード誤発進ガード用)。 */
  isOverlayOpen(): boolean;
}

// 配色(既存パレットに準拠)。
const COLOR_TITLE = '#37f7d8';
const COLOR_NAME = '#cfe9e2';
const COLOR_VALUE = '#9fffe8';
const COLOR_MUTED = '#5a6b6a';
const CARD_BORDER = 0x2a4a4a;
const CARD_BORDER_HOVER = 0x37f7d8;
const CARD_PANEL = 0x0a121a;

// ミニプレビューのシルエット生成に使う仮想ワールド幅(論理px)。
// 実ステージの列ピッチ(step 110〜260)でカード幅に 6〜14 列が並ぶ密度になる。
const PREVIEW_WORLD_WIDTH = 1600;
// シルエット基準高さの正規化分母。テーマの layer.height 最大値(480)を少し上回る値にし、
// プレビュー領域からはみ出さないようにする。
const PREVIEW_HEIGHT_NORM = 520;

/**
 * タイトル画面に「STAGE SELECT」導線とステージ選択オーバーレイを追加する。
 * @param scene       追加先のシーン(TitleScene)
 * @param startZone   スタート判定ゾーン。オーバーレイ表示中は無効化して誤発進を防ぐ。
 * @param onStartStage 選択した stageId で本編を開始するコールバック(効果音・遷移は呼び出し側)。
 */
export function createStageSelect(
  scene: Phaser.Scene,
  startZone: Phaser.GameObjects.Zone,
  onStartStage: (stageId: string) => void,
): StageSelect {
  const { width, height } = scene.scale;
  let overlay: Phaser.GameObjects.Container | undefined;

  const destroyOverlay = (): void => {
    overlay?.destroy();
    overlay = undefined;
    startZone.setInteractive();
  };

  /** カードのミニプレビュー(空グラデーション + シルエット + アクセント灯)を g に描く。 */
  const drawPreview = (
    g: Phaser.GameObjects.Graphics,
    stageId: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void => {
    const theme = getStageBackground(stageId);

    // 空: skyTop→skyBottom を帯で補間する(Graphics の fillGradientStyle は WebGL 限定のため
    // Canvas フォールバックでも同じ見た目になる帯方式を使う)。
    const bands = 6;
    const top = hexToNum(theme.skyTop);
    const bottom = hexToNum(theme.skyBottom);
    const bandH = h / bands;
    for (let i = 0; i < bands; i++) {
      g.fillStyle(lerpColor(top, bottom, i / (bands - 1)), 1);
      g.fillRect(x, y + bandH * i, w, bandH + 1);
    }

    // シルエット: テーマのレイヤー(奥→手前)を決定論生成し、カード幅へ縮小して敷く。
    // 生成は worldWidth を僅かに超えるまで列を敷くため、カード右端でクリップする
    // (実ステージではカメラが切るが、ここは Graphics 直描きなので自前で切る)。
    const sx = w / PREVIEW_WORLD_WIDTH;
    for (const layer of theme.layers) {
      const columns = generateSilhouetteColumns(layer, PREVIEW_WORLD_WIDTH, theme.seed);
      g.fillStyle(hexToNum(layer.color), 1);
      for (const c of columns) {
        const colX = c.x * sx;
        if (colX >= w) continue;
        const colW = Math.min(c.width * sx, w - colX);
        const colH = (c.height / PREVIEW_HEIGHT_NORM) * h;
        g.fillRect(x + colX, y + h - colH, Math.max(1, colW), colH);
      }
    }

    // アクセント灯: 固定位置(決定論)に小さな発光点を置き、テーマの発光色を見せる。
    g.fillStyle(hexToNum(theme.accent), 1);
    const dot = Math.max(1, scaled(2));
    for (const fx of [0.22, 0.52, 0.8]) {
      g.fillRect(x + w * fx, y + h * 0.62, dot, dot);
    }
  };

  /** カード1枚を container に追加する。 */
  const addCard = (
    container: Phaser.GameObjects.Container,
    model: StageCardModel,
    rect: CardRect,
  ): void => {
    const pad = scaled(6);
    const previewX = rect.x + pad;
    const previewY = rect.y + pad;
    const previewW = rect.width - pad * 2;
    // テキスト3行(STAGE n / 名前 / BEST)が狭い画面でも重ならない高さ配分にする。
    const previewH = rect.height * 0.46;

    // パネル + プレビュー(静的描画は 1 Graphics にまとめる)
    const g = scene.add.graphics();
    g.fillStyle(CARD_PANEL, 1);
    g.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, scaled(6));
    drawPreview(g, model.id, previewX, previewY, previewW, previewH);
    container.add(g);

    // テキスト領域(プレビューの下)
    const textX = rect.x + pad * 1.5;
    const noY = previewY + previewH + scaled(6);
    container.add(
      scene.add.text(textX, noY, `STAGE ${model.stageNo}`, {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(11),
        color: COLOR_VALUE,
        fontStyle: 'bold',
      }),
    );
    container.add(
      scene.add.text(textX, noY + scaled(16), model.name, {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(14),
        color: COLOR_NAME,
      }),
    );

    // 進捗: CLEAR バッジ(右上)とベストタイム(左下)
    if (model.cleared) {
      container.add(
        scene.add
          .text(rect.x + rect.width - pad * 1.5, noY, 'CLEAR', {
            fontFamily: 'monospace',
            fontSize: scaledFontPx(11),
            color: COLOR_TITLE,
            fontStyle: 'bold',
          })
          .setOrigin(1, 0),
      );
    }
    if (model.bestTimeMs !== undefined) {
      container.add(
        scene.add
          .text(textX, rect.y + rect.height - pad, `BEST ${formatBestTime(model.bestTimeMs)}`, {
            fontFamily: 'monospace',
            fontSize: scaledFontPx(11),
            color: COLOR_VALUE,
          })
          .setOrigin(0, 1),
      );
    }

    // 枠線はホバーで色が変わるため専用 Graphics に分離して再描画する。
    const border = scene.add.graphics();
    const drawBorder = (color: number): void => {
      border.clear();
      border.lineStyle(Math.max(1, scaled(2)), color, 1);
      border.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, scaled(6));
    };
    drawBorder(CARD_BORDER);
    container.add(border);

    if (model.locked) {
      // 未解放: 暗転 + LOCKED。入力ゾーンを張らない(タップ無効)。
      const dim = scene.add.graphics();
      dim.fillStyle(0x05080c, 0.74);
      dim.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, scaled(6));
      container.add(dim);
      container.add(
        scene.add
          .text(rect.x + rect.width / 2, rect.y + rect.height / 2, 'LOCKED', {
            fontFamily: 'monospace',
            fontSize: scaledFontPx(14),
            color: COLOR_MUTED,
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
      return;
    }

    // 解放済み: カード全面の入力ゾーン(サイズ指定ゾーンは Zone で作る流儀)。
    const zone = scene.add
      .zone(rect.x, rect.y, rect.width, rect.height)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_OVER, () => drawBorder(CARD_BORDER_HOVER));
    zone.on(Phaser.Input.Events.POINTER_OUT, () => drawBorder(CARD_BORDER));
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      // 開始へ進む。効果音は onStartStage 側に任せ、二重再生を避ける。
      destroyOverlay();
      onStartStage(model.id);
    });
    container.add(zone);
  };

  const openStageSelect = (): void => {
    if (overlay) {
      return;
    }
    startZone.disableInteractive();
    const o = scene.add.container(0, 0).setDepth(1000);

    // 背景の暗幕。クリックを吸収して背後のゾーンに透過させない。
    o.add(scene.add.rectangle(0, 0, width, height, 0x05080c, 0.88).setOrigin(0).setInteractive());

    o.add(
      scene.add
        .text(width / 2, height * 0.1, 'STAGE SELECT', {
          fontFamily: 'monospace',
          fontSize: scaledFontPx(28),
          color: COLOR_TITLE,
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    // 進捗(セーブ)からカードモデルを構築し、3列グリッドに敷く。
    const save = new SaveManager().getData();
    const models = buildStageCardModels(save);
    const rects = cardGridLayout(width, models.length, {
      top: height * 0.18,
      bottom: height * 0.84,
      marginX: width * 0.06,
      gutter: scaled(12),
    });
    models.forEach((model, i) => addCard(o, model, rects[i]));

    // BACK: 効果音を鳴らして閉じる。グリッドの下に配置する。
    o.add(
      createNeonButton(scene, width / 2, height * 0.92, '◂ BACK', () => {
        getSound().playSe('uiTap');
        destroyOverlay();
      }, { variant: 'ghost' }).container,
    );

    overlay = o;
  };

  // STAGE SELECT 導線。右下に控えめに配置する(小型パネル。暗背景で背景絵の上でも読める)。
  // NeonButton は中央原点の Container なので、右下アンカーは寸法確定後に座標へ換算する。
  const button = createNeonButton(scene, 0, 0, 'STAGE SELECT ▸', () => {
    getSound().playSe('uiTap');
    openStageSelect();
  }, { fontSize: 16 });
  button.container.setPosition(
    width - scaled(16) - button.container.width / 2,
    height - scaled(16) - button.container.height / 2,
  );

  return { isOverlayOpen: () => overlay !== undefined };
}
