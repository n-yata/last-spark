import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { getSound } from '../systems/SoundManager';
import { getHaptics } from '../systems/haptics';
import { SaveManager } from '../persistence/SaveManager';

// 最小設定の初期化を行い、Preload へ遷移する。

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    // 入力のマルチタッチを有効化(移動 + ジャンプ/ショット同時)
    this.input.addPointer(2);
    // サウンド基盤を初期化(未対応環境では無音で継続)。初回タップで AudioContext を resume する。
    getSound().init();
    // 触覚フィードバックへ保存済み設定を反映する(非対応環境では no-op)。
    getHaptics().setEnabled(new SaveManager().getData().settings.vibration);
    this.scene.start(SCENE_KEYS.preload);
  }
}
