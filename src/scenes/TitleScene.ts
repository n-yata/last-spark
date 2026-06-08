import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { SaveManager } from '../persistence/SaveManager';

// タイトル画面。ロゴ + スタート導線。クリア済みフラグと最速タイムを表示する。

export class TitleScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.title);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0e14');

    // 背景: 暗め基調 + 発光アクセント(廃墟のシルエット風グラデーション)
    this.drawBackdrop(width, height);

    // ロゴ
    this.add
      .text(width / 2, height * 0.34, 'LAST SPARK', {
        fontFamily: 'monospace',
        fontSize: '64px',
        color: '#37f7d8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#37f7d8', 18, true, true);

    this.add
      .text(width / 2, height * 0.34 + 52, '― 退廃の中の希望 ―', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#7fe9dd',
      })
      .setOrigin(0.5);

    // スタート導線(点滅)
    const start = this.add
      .text(width / 2, height * 0.66, 'TAP TO START', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#fff27a',
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: start,
      alpha: 0.2,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // クリア状況の表示
    const save = new SaveManager().getData();
    if (save.cleared) {
      const best =
        save.bestTimeMs !== undefined ? `  BEST ${this.formatTime(save.bestTimeMs)}` : '';
      this.add
        .text(width / 2, height * 0.82, `CLEARED${best}`, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#9fffe8',
        })
        .setOrigin(0.5);
    }

    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => this.startGame());
    this.input.keyboard?.once('keydown', () => this.startGame());
  }

  private startGame(): void {
    this.scene.start(SCENE_KEYS.game);
  }

  private drawBackdrop(width: number, height: number): void {
    const g = this.add.graphics();
    // 遠景の発光ライン(地平線)
    g.fillStyle(0x12303a, 0.5);
    g.fillRect(0, height * 0.7, width, height * 0.3);
    g.lineStyle(2, 0x37f7d8, 0.25);
    g.lineBetween(0, height * 0.7, width, height * 0.7);
    // 崩れたビルのシルエット
    g.fillStyle(0x0d141b, 1);
    const buildings = [
      [40, 0.55, 90],
      [160, 0.62, 70],
      [260, 0.5, 110],
      [width - 320, 0.58, 100],
      [width - 180, 0.52, 130],
      [width - 80, 0.64, 60],
    ] as const;
    for (const [x, topRatio, w] of buildings) {
      g.fillRect(x, height * topRatio, w, height);
    }
  }

  private formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
