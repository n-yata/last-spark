import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { getSound } from '../systems/SoundManager';
import { transitionTo, fadeIn } from '../systems/sceneTransition';
import { scaled, scaledFontPx } from '../config/uiScale';

// ゲームオーバー表示とリトライ/タイトル導線。

/** GameOverScene 起動データ。やり直し先ステージを GameScene から引き継ぐ。 */
export interface GameOverSceneData {
  stageId?: string;
}

export class GameOverScene extends Phaser.Scene {
  /** やり直し対象のステージ(GameScene から引き継ぐ。未指定なら GameScene 側の既定=stage1)。 */
  private stageId?: string;

  constructor() {
    super(SCENE_KEYS.gameOver);
  }

  init(data: GameOverSceneData): void {
    this.stageId = data?.stageId;
  }

  create(): void {
    const { width, height } = this.scale;
    fadeIn(this);

    // BGM を止めてゲームオーバー音を鳴らす
    getSound().stopBgm();
    getSound().playSe('gameOver');

    this.add.rectangle(0, 0, width, height, 0x05080c, 0.85).setOrigin(0);

    this.add
      .text(width / 2, height * 0.32, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(56),
        color: '#ff2d55',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ff2d55', scaled(16), true, true);

    // やり直しは同じステージから。開始演出はゲームオーバー後は冗長なのでスキップする。
    this.makeButton(width / 2, height * 0.58, 'RETRY', '#fff27a', () =>
      transitionTo(this, SCENE_KEYS.game, { stageId: this.stageId, skipCutscene: true }),
    );
    this.makeButton(width / 2, height * 0.74, 'TITLE', '#7fe9dd', () =>
      transitionTo(this, SCENE_KEYS.title),
    );
  }

  private makeButton(x: number, y: number, label: string, color: string, onClick: () => void): void {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(28),
        color,
      })
      .setOrigin(0.5)
      .setPadding(scaled(16), scaled(8))
      .setInteractive({ useHandCursor: true });
    text.on(Phaser.Input.Events.POINTER_DOWN, () => {
      getSound().playSe('uiTap');
      onClick();
    });
    text.on(Phaser.Input.Events.POINTER_OVER, () => text.setScale(1.1));
    text.on(Phaser.Input.Events.POINTER_OUT, () => text.setScale(1));
  }
}
