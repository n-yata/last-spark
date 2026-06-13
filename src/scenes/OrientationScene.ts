import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { scaled, scaledFontPx } from '../config/uiScale';

// 縦持ち検知時の「横向きにしてください」案内オーバーレイ。最前面に表示する。

export class OrientationScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.orientation);
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x05080c, 0.96).setOrigin(0).setDepth(0);

    this.add
      .text(width / 2, height / 2 - scaled(30), '📱 ↻', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(48),
        color: '#37f7d8',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + scaled(30), 'がめんを横向きにしてください', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(20),
        color: '#9fffe8',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + scaled(64), '両手で横向きにして、あそんでください', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(14),
        color: '#7fe9dd',
      })
      .setOrigin(0.5)
      .setAlpha(0.7);
  }
}
