import Phaser from 'phaser';

// HUD 隅に短時間だけ表示して自動消去する軽量トースト。
// StoryOverlay のキューとは独立した別系統で、ゲームを一時停止しない。
// ログ取得など「取った」フィードバックを邪魔にならない形で伝えるのに使う。

/** 表示を保持する時間(ms)。これを過ぎるとフェードアウトする。 */
const HOLD_MS = 1200;
/** フェードイン/アウトの所要時間(ms)。 */
const FADE_MS = 250;

export class Toast {
  private readonly scene: Phaser.Scene;
  private text?: Phaser.GameObjects.Text;
  private timer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** メッセージを HUD 右上に表示する。表示中に呼ばれたら差し替える。 */
  show(message: string): void {
    this.clear();
    const t = this.scene.add
      .text(this.scene.scale.width - 16, 16, message, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffd9a0',
        backgroundColor: 'rgba(40,28,12,0.82)',
        padding: { x: 10, y: 6 },
        align: 'right',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(120)
      .setAlpha(0);
    this.text = t;
    this.scene.tweens.add({ targets: t, alpha: 1, duration: FADE_MS });
    this.timer = this.scene.time.delayedCall(HOLD_MS, () => {
      if (!this.text) return;
      this.scene.tweens.add({
        targets: this.text,
        alpha: 0,
        duration: FADE_MS,
        onComplete: () => this.clear(),
      });
    });
  }

  /** 表示中のトーストとタイマーを破棄する。 */
  private clear(): void {
    this.timer?.remove();
    this.timer = undefined;
    this.text?.destroy();
    this.text = undefined;
  }

  destroy(): void {
    this.clear();
  }
}
