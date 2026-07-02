import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { getSound } from '../systems/SoundManager';
import { transitionTo, fadeIn } from '../systems/sceneTransition';
import { scaled, scaledFontPx } from '../config/uiScale';
import { createNeonButton } from '../ui/neonButton';

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
    // 主導線の RETRY は primary で強調し、TITLE(離脱)は default で控えめにする。
    createNeonButton(this, width / 2, height * 0.58, 'RETRY', () => {
      getSound().playSe('uiTap');
      transitionTo(this, SCENE_KEYS.game, { stageId: this.stageId, skipCutscene: true });
    }, { variant: 'primary', fontSize: 28, minWidth: 240 });
    createNeonButton(this, width / 2, height * 0.76, 'TITLE', () => {
      getSound().playSe('uiTap');
      transitionTo(this, SCENE_KEYS.title);
    }, { fontSize: 22, minWidth: 240 });
  }
}
