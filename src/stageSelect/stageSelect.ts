import Phaser from 'phaser';
import { getSound } from '../systems/SoundManager';
import { scaled, scaledFontPx } from '../config/uiScale';
import { makeMenuButton } from '../ui/menuButton';
import { PLAYABLE_STAGES } from './stages';

// タイトル画面のステージ選択 UI。任意のステージから本編を始められる一般向け機能。
// 初期表示を軽くするため、TitleScene から表示確定後に「動的 import」で遅延ロードする
// (ステージ選択は導線をタップして初めて使うため、別チャンクに分けても体験を損なわない)。

export interface StageSelect {
  /** ステージ選択オーバーレイが開いているか(キーボード誤発進ガード用)。 */
  isOverlayOpen(): boolean;
}

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
        .text(width / 2, height * 0.14, 'STAGE SELECT', {
          fontFamily: 'monospace',
          fontSize: scaledFontPx(28),
          color: '#37f7d8',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    // ステージボタン + BACK を縦に並べる。ステージ数が増えても画面内に収まるよう、
    // タイトル下から下端マージンまでの領域に行数ぶんを均等割りして配置する。
    // ステージが少ないときに間延びしないよう、間隔には上限(56px)を設ける。
    const top = height * 0.26;
    const bottom = height * 0.93;
    const rows = PLAYABLE_STAGES.length + 1; // ステージ + BACK
    const gap = Math.min(scaled(56), (bottom - top) / (rows - 1));
    PLAYABLE_STAGES.forEach((stage, index) => {
      o.add(
        makeMenuButton(scene, width / 2, top + gap * index, stage.label, () => {
          // 開始へ進む。効果音は onStartStage 側に任せ、二重再生を避ける。
          destroyOverlay();
          onStartStage(stage.id);
        }),
      );
    });

    // BACK: 効果音を鳴らして閉じる。最後のステージの下に配置する。
    o.add(
      makeMenuButton(scene, width / 2, top + gap * PLAYABLE_STAGES.length, '◂ BACK', () => {
        getSound().playSe('uiTap');
        destroyOverlay();
      }),
    );

    overlay = o;
  };

  // STAGE SELECT 導線。右下に控えめに配置する。
  const button = scene.add
    .text(width - scaled(16), height - scaled(16), 'STAGE SELECT ▸', {
      fontFamily: 'monospace',
      fontSize: scaledFontPx(16),
      color: '#7fe9dd',
    })
    .setOrigin(1, 1)
    .setInteractive({ useHandCursor: true });
  button.on(Phaser.Input.Events.POINTER_OVER, () => button.setColor('#fff27a'));
  button.on(Phaser.Input.Events.POINTER_OUT, () => button.setColor('#7fe9dd'));
  button.on(Phaser.Input.Events.POINTER_DOWN, () => {
    getSound().playSe('uiTap');
    openStageSelect();
  });

  return { isOverlayOpen: () => overlay !== undefined };
}
