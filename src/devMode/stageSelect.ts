import Phaser from 'phaser';
import { getSound } from '../systems/SoundManager';
import { PLAYABLE_STAGES } from './stages';

// 開発モード(タイトル画面のステージ選択)の UI。
// このモジュールは TitleScene から `import.meta.env.DEV` ガード下で「動的 import」される。
// 本番ビルドではガードが false に畳まれて import 文ごと除去されるため、別チャンク化された
// 本モジュールは未参照となり本番バンドルから完全に外れる。DEV MODE 等の文字列や
// ステージ表示ラベルが本番 JS に残留・露見しない(DevTools からの手動起動も不可)。

export interface DevMode {
  /** ステージ選択オーバーレイが開いているか(キーボード誤発進ガード用)。 */
  isOverlayOpen(): boolean;
}

/**
 * タイトル画面に「DEV MODE」導線とステージ選択オーバーレイを追加する。
 * @param scene       追加先のシーン(TitleScene)
 * @param startZone   スタート判定ゾーン。オーバーレイ表示中は無効化して誤発進を防ぐ。
 * @param onStartStage 選択した stageId で本編を開始するコールバック(効果音・遷移は呼び出し側)。
 */
export function createDevMode(
  scene: Phaser.Scene,
  startZone: Phaser.GameObjects.Zone,
  onStartStage: (stageId: string) => void,
): DevMode {
  const { width, height } = scene.scale;
  let overlay: Phaser.GameObjects.Container | undefined;

  const destroyOverlay = (): void => {
    overlay?.destroy();
    overlay = undefined;
    startZone.setInteractive();
  };

  const makeMenuButton = (
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text => {
    const btn = scene.add
      .text(x, y, label, { fontFamily: 'monospace', fontSize: '20px', color: '#cfe9e2' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on(Phaser.Input.Events.POINTER_OVER, () => btn.setColor('#fff27a'));
    btn.on(Phaser.Input.Events.POINTER_OUT, () => btn.setColor('#cfe9e2'));
    btn.on(Phaser.Input.Events.POINTER_DOWN, onClick);
    return btn;
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
        .text(width / 2, height * 0.2, 'STAGE SELECT (DEV)', {
          fontFamily: 'monospace',
          fontSize: '28px',
          color: '#37f7d8',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    // ステージボタンを縦に並べる。
    const startY = height * 0.34;
    const gap = 56;
    PLAYABLE_STAGES.forEach((stage, index) => {
      o.add(
        makeMenuButton(width / 2, startY + gap * index, stage.label, () => {
          // 開始へ進む。効果音は onStartStage 側に任せ、二重再生を避ける。
          destroyOverlay();
          onStartStage(stage.id);
        }),
      );
    });

    // BACK: 効果音を鳴らして閉じる。
    o.add(
      makeMenuButton(width / 2, startY + gap * PLAYABLE_STAGES.length + 24, '◂ BACK', () => {
        getSound().playSe('uiTap');
        destroyOverlay();
      }),
    );

    overlay = o;
  };

  // DEV MODE 導線。右下に控えめに配置する。
  const button = scene.add
    .text(width - 16, height - 16, 'DEV MODE ▸', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#8aa0b8',
    })
    .setOrigin(1, 1)
    .setInteractive({ useHandCursor: true });
  button.on(Phaser.Input.Events.POINTER_OVER, () => button.setColor('#fff27a'));
  button.on(Phaser.Input.Events.POINTER_OUT, () => button.setColor('#8aa0b8'));
  button.on(Phaser.Input.Events.POINTER_DOWN, () => {
    getSound().playSe('uiTap');
    openStageSelect();
  });

  return { isOverlayOpen: () => overlay !== undefined };
}
