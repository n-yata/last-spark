import Phaser from 'phaser';
import { HUD } from '../config/registryKeys';
import { getSound } from '../systems/SoundManager';
import { scaled, scaledFontPx } from '../config/uiScale';

// HUD のポーズボタン。UIScene 上の画面右上に配置する。
// 移動ゾーン(画面左半分)・ジャンプ/ショット(右下〜中央)のいずれとも干渉しない位置。
// 押下で registry(HUD.pauseRequested)を立て、GameScene が次フレームに検出してポーズする
// (Scene 間の直接参照を避ける既存の疎結合方針に倣う)。

export class PauseButton {
  private readonly scene: Phaser.Scene;
  private readonly button: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.button = scene.add
      .text(scene.scale.width - scaled(16), scaled(14), '❚❚', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(22),
        color: '#cfe9e2',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    this.button.on(Phaser.Input.Events.POINTER_OVER, () => this.button.setColor('#fff27a'));
    this.button.on(Phaser.Input.Events.POINTER_OUT, () => this.button.setColor('#cfe9e2'));
    this.button.on(Phaser.Input.Events.POINTER_DOWN, () => {
      getSound().playSe('uiTap');
      scene.registry.set(HUD.pauseRequested, true);
    });
    // 端末回転/リサイズでも右上に貼り付け直す。
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.reposition, this);
  }

  private reposition(): void {
    this.button.setPosition(this.scene.scale.width - scaled(16), scaled(14));
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.reposition, this);
    this.button.destroy();
  }
}
