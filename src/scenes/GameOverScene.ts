import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';

// ゲームオーバー表示とリトライ/タイトル導線。

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.gameOver);
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x05080c, 0.85).setOrigin(0);

    this.add
      .text(width / 2, height * 0.32, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '56px',
        color: '#ff2d55',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ff2d55', 16, true, true);

    this.makeButton(width / 2, height * 0.58, 'RETRY', '#fff27a', () =>
      this.scene.start(SCENE_KEYS.game),
    );
    this.makeButton(width / 2, height * 0.74, 'TITLE', '#7fe9dd', () =>
      this.scene.start(SCENE_KEYS.title),
    );
  }

  private makeButton(x: number, y: number, label: string, color: string, onClick: () => void): void {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '28px',
        color,
      })
      .setOrigin(0.5)
      .setPadding(16, 8)
      .setInteractive({ useHandCursor: true });
    text.on(Phaser.Input.Events.POINTER_DOWN, onClick);
    text.on(Phaser.Input.Events.POINTER_OVER, () => text.setScale(1.1));
    text.on(Phaser.Input.Events.POINTER_OUT, () => text.setScale(1));
  }
}
