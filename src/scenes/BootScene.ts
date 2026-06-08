import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';

// 最小設定の初期化を行い、Preload へ遷移する。

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    // 入力のマルチタッチを有効化(移動 + ジャンプ/ショット同時)
    this.input.addPointer(2);
    this.scene.start(SCENE_KEYS.preload);
  }
}
