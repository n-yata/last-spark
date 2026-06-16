import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { SaveManager } from '../persistence/SaveManager';
import { getSound } from '../systems/SoundManager';
import { transitionTo, fadeIn } from '../systems/sceneTransition';
import { scaled, scaledFontPx } from '../config/uiScale';

interface ClearData {
  clearTimeMs: number;
  /** 今クリアしたステージ ID(セーブ記録用)。 */
  stageId?: string;
  /** 次ステージ ID(任意)。あれば中継表示で次ステージへ継続、なければ最終クリア。 */
  nextStageId?: string;
  /**
   * 入力(タップ送り)を受け付けるまでの待機時間(ms)。未指定なら既定値。
   * stage6 エンディング直後の最終クリアは、余韻を残すため長め(2000ms)を渡す。
   */
  inputDelayMs?: number;
}

/** 入力受付までの既定待機時間(ms)。演出を一拍読ませてから送りを受け付ける。 */
const DEFAULT_INPUT_DELAY_MS = 600;

// ボス撃破時のクリア演出。
// 次ステージがあれば「TAP TO CONTINUE」で継続、なければ最終クリアとして保存しタイトルへ。

export class ClearScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.clear);
  }

  create(data: ClearData): void {
    const { width, height } = this.scale;
    fadeIn(this);
    const clearTimeMs = data?.clearTimeMs ?? 0;
    const nextStageId = data?.nextStageId;
    const isFinal = !nextStageId;

    // クリアはステージ単位で記録する(途中ステージも到達状況として保存する)。
    if (data?.stageId) {
      new SaveManager().markStageCleared(data.stageId, clearTimeMs);
    }

    // BGM を止めてクリアジングルを鳴らす
    getSound().stopBgm();
    getSound().playSe('stageClear');

    this.add.rectangle(0, 0, width, height, 0x06121a, 0.85).setOrigin(0);

    this.add
      .text(width / 2, height * 0.3, isFinal ? 'ALL CLEAR' : 'STAGE CLEAR', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(56),
        color: '#37f7d8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#37f7d8', scaled(18), true, true);

    this.add
      .text(width / 2, height * 0.46, `TIME  ${this.formatTime(clearTimeMs)}`, {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(24),
        color: '#9fffe8',
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.6,
        isFinal ? '最後のあかりは、まだ消えていない。' : '次のたて穴へ——まだ先がある。',
        {
          fontFamily: 'monospace',
          fontSize: scaledFontPx(16),
          color: '#7fe9dd',
        },
      )
      .setOrigin(0.5);

    const back = this.add
      .text(width / 2, height * 0.78, isFinal ? 'TAP TO TITLE' : 'TAP TO CONTINUE', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(22),
        color: '#fff27a',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: back, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    // 演出を読ませるため、短い猶予の後に入力を受け付ける(最終クリアは余韻のため長め)
    this.time.delayedCall(data?.inputDelayMs ?? DEFAULT_INPUT_DELAY_MS, () => {
      const proceed = (): void => {
        getSound().playSe('uiTap');
        if (nextStageId) {
          transitionTo(this, SCENE_KEYS.game, { stageId: nextStageId });
        } else {
          transitionTo(this, SCENE_KEYS.title);
        }
      };
      this.input.once(Phaser.Input.Events.POINTER_DOWN, proceed);
      this.input.keyboard?.once('keydown', proceed);
    });
  }

  private formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
