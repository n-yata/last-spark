import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { SaveManager } from '../persistence/SaveManager';
import { getSound } from '../systems/SoundManager';
import { transitionTo, fadeIn } from '../systems/sceneTransition';
import { scaled, scaledFontPx } from '../config/uiScale';
import { PLAYER } from '../config/balance';
import { formatBestTime } from '../stageSelect/stageCards';
import { resolveRank, isNewRecord, rankColor } from '../systems/clearResult';
import type { StageRank } from '../types/save';

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
  /**
   * 真なら、最終クリア画面で「次の周回へ進む」「タイトルへ」の2択を提示する(New Game+)。
   * 最終クリア(nextStageId 無し)のときのみ意味を持つ。
   */
  offerNextLoop?: boolean;
  /** そのステージで受けた被ダメージ(ランク判定・戦績表示)。未指定なら戦績・ランクを出さない。 */
  damageTaken?: number;
  /** そのステージで倒した雑魚敵の数(戦績表示)。未指定なら戦績・ランクを出さない。 */
  kills?: number;
  /**
   * ベスト更新済みフラグ(stage6 エンディング経路用)。保存を GameScene 側で行う経路は
   * ClearScene 到達時点で bestTimeMs が更新済みのため、判定結果をここで受け取る。
   * stageId がある経路では無視し、保存前に ClearScene 自身が判定する。
   */
  newRecord?: boolean;
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
    const damageTaken = data?.damageTaken;
    const kills = data?.kills;
    // 戦績・ランクは集計データがある経路のみ表示する(無い経路で嘘の 0 を出さない)。
    const hasStats = damageTaken !== undefined && kills !== undefined;
    const rank = damageTaken !== undefined ? resolveRank(damageTaken, PLAYER.maxHp) : undefined;

    // クリアはステージ単位で記録する(途中ステージも到達状況として保存する)。
    // ベスト更新判定は保存の「前」に既存ベストを読んで行う(保存後では常に自分自身と一致する)。
    let newRecord = data?.newRecord ?? false;
    if (data?.stageId) {
      const save = new SaveManager();
      newRecord = isNewRecord(save.getData().bestTimeMs?.[data.stageId], clearTimeMs);
      save.markStageCleared(data.stageId, clearTimeMs, rank);
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

    // タイム: 0:00 から実タイムまでカウントアップして達成感を出す。完了後にランク・NEW RECORD を出す。
    const timeText = this.add
      .text(width / 2, height * 0.44, 'TIME  0:00', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(24),
        color: '#9fffe8',
      })
      .setOrigin(0.5);
    this.tweens.addCounter({
      from: 0,
      to: clearTimeMs,
      duration: 900,
      onUpdate: (tween) => {
        timeText.setText(`TIME  ${formatBestTime(tween.getValue() ?? 0)}`);
      },
      onComplete: () => {
        timeText.setText(`TIME  ${formatBestTime(clearTimeMs)}`);
        this.revealResult(width, height, rank, newRecord, hasStats);
      },
    });

    // 戦績行(被ダメージ / 撃破数)。集計がある経路のみ。
    if (hasStats) {
      this.add
        .text(width / 2, height * 0.52, `ダメージ ${damageTaken}   撃破 ${kills}`, {
          fontFamily: 'monospace',
          fontSize: scaledFontPx(15),
          color: '#cfe9e2',
        })
        .setOrigin(0.5);
    }

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

    const offerNextLoop = isFinal && (data?.offerNextLoop ?? false);

    if (offerNextLoop) {
      this.createLoopChoice(width, height, data?.inputDelayMs ?? DEFAULT_INPUT_DELAY_MS);
      return;
    }

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

  /**
   * カウントアップ完了後のリザルト開示: NEW RECORD の点滅と、ランクのポップ表示。
   * タイムを読み切った直後に出すことで「記録 → 評価」の順に視線が流れる。
   */
  private revealResult(
    width: number,
    height: number,
    rank: StageRank | undefined,
    newRecord: boolean,
    hasStats: boolean,
  ): void {
    if (newRecord) {
      const nr = this.add
        .text(width / 2 + scaled(170), height * 0.44, 'NEW RECORD!', {
          fontFamily: 'monospace',
          fontSize: scaledFontPx(15),
          color: '#fff27a',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);
      // 出現後は緩く点滅させて「更新」を主張しすぎない強調にとどめる。
      this.tweens.add({ targets: nr, alpha: 0.35, delay: 250, duration: 600, yoyo: true, repeat: -1 });
    }

    if (hasStats && rank) {
      const rx = width * 0.76;
      const ry = height * 0.48;
      this.add
        .text(rx, ry - scaled(34), 'RANK', {
          fontFamily: 'monospace',
          fontSize: scaledFontPx(12),
          color: '#7fe9dd',
        })
        .setOrigin(0.5);
      const letter = this.add
        .text(rx, ry + scaled(6), rank, {
          fontFamily: 'monospace',
          fontSize: scaledFontPx(46),
          color: rankColor(rank),
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScale(1.6)
        .setAlpha(0)
        .setShadow(0, 0, rankColor(rank), scaled(12), true, true);
      this.tweens.add({ targets: letter, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
      getSound().playSe('uiTap');
    }
  }

  /**
   * 最終クリア(ALL CLEAR)時、次の周回へ進むかタイトルへ戻るかの2択を提示する(New Game+導線)。
   * タップ領域は誤操作を避けるため画面下半分を上下に分け、それぞれ十分広く確保する。
   */
  private createLoopChoice(width: number, height: number, inputDelayMs: number): void {
    const optionY = height * 0.78;

    const nextLoopText = this.add
      .text(width / 2, optionY, '次の周回へ進む', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(22),
        color: '#fff27a',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: nextLoopText, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    this.add
      .text(width / 2, optionY + scaled(48), 'タイトルへ戻る', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(16),
        color: '#7fe9dd',
      })
      .setOrigin(0.5);

    // 演出を読ませるため、短い猶予の後に入力を受け付ける。
    this.time.delayedCall(inputDelayMs, () => {
      // 画面下半分を上下に分け、それぞれ十分広いタップ領域を確保する(モバイル誤操作対策)。
      const nextLoopZone = this.add
        .zone(0, height * 0.68, width, height * 0.16)
        .setOrigin(0)
        .setInteractive();
      const titleZone = this.add
        .zone(0, height * 0.84, width, height * 0.16)
        .setOrigin(0)
        .setInteractive();

      nextLoopZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
        getSound().playSe('uiTap');
        new SaveManager().advanceLoop();
        transitionTo(this, SCENE_KEYS.game, { stageId: 'stage1' });
      });
      titleZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
        getSound().playSe('uiTap');
        transitionTo(this, SCENE_KEYS.title);
      });

      // キーボード操作は既定で「次の周回へ」を選ぶ(タップ環境の主導線を優先)。
      this.input.keyboard?.once('keydown', () => nextLoopZone.emit(Phaser.Input.Events.POINTER_DOWN));
    });
  }

}
