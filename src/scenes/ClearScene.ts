import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { SaveManager } from '../persistence/SaveManager';
import { getSound } from '../systems/SoundManager';

interface ClearData {
  clearTimeMs: number;
}

// ボス撃破時のクリア演出。クリア状況を保存してタイトルへ。

export class ClearScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.clear);
  }

  create(data: ClearData): void {
    const { width, height } = this.scale;
    const clearTimeMs = data?.clearTimeMs ?? 0;

    // クリアを永続化(localStorage 不可でも throw しない)
    new SaveManager().markCleared(clearTimeMs);

    // BGM を止めてクリアジングルを鳴らす
    getSound().stopBgm();
    getSound().playSe('stageClear');

    this.add.rectangle(0, 0, width, height, 0x06121a, 0.85).setOrigin(0);

    this.add
      .text(width / 2, height * 0.3, 'STAGE CLEAR', {
        fontFamily: 'monospace',
        fontSize: '56px',
        color: '#37f7d8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#37f7d8', 18, true, true);

    this.add
      .text(width / 2, height * 0.46, `TIME  ${this.formatTime(clearTimeMs)}`, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#9fffe8',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.6, '最後の灯は、まだ消えていない。', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#7fe9dd',
      })
      .setOrigin(0.5);

    const back = this.add
      .text(width / 2, height * 0.78, 'TAP TO TITLE', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#fff27a',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: back, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    // 演出を読ませるため、短い猶予の後に入力を受け付ける
    this.time.delayedCall(600, () => {
      const toTitle = (): void => {
        getSound().playSe('uiTap');
        this.scene.start(SCENE_KEYS.title);
      };
      this.input.once(Phaser.Input.Events.POINTER_DOWN, toTitle);
      this.input.keyboard?.once('keydown', toTitle);
    });
  }

  private formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
