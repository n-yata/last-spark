import type Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { resolveControlBand } from '../config/controlBand';
import { TEXT_STYLES, readingDurationMs } from '../systems/storyDirector';
import type { StoryTextKind, TextRequest } from '../types/story';

// ストーリーテキストのオーバーレイ描画。UIScene 上に常駐し、TextRequest のキューを順に再生する。
// - 一時停止系(科学者ログ/ECLIPSE/開始テキスト): GameScene を pause し、タップで次へ。
// - 非停止系(RAY内心/TERRAセリフ): プレイ継続のまま画面下部に表示し、一定時間で自動消去。
// 種別の見た目(色・フォント)で「誰の言葉か」を瞬時に区別できるようにする(話者ラベルは出さない)。

interface KindVisual {
  color: string;
  fontFamily: string;
  fontStyle: string;
  /** 背景パネルを敷くか(可読性。一時停止系のみ)。 */
  backdrop: boolean;
}

const VISUALS: Record<StoryTextKind, KindVisual> = {
  // 科学者: 人間の温もり(暖色)。手書き風フォント未調達のため serif で代替(後で差し替え可)。
  scientistLog: { color: '#ffcf8f', fontFamily: 'Georgia, serif', fontStyle: 'normal', backdrop: true },
  // ECLIPSE: 機械の冷たさ(冷色・等幅)。
  eclipseVoice: { color: '#7fe9ff', fontFamily: 'monospace', fontStyle: 'normal', backdrop: true },
  // RAY内心: 白・イタリック・半透明。
  rayInner: { color: '#f2f4f8', fontFamily: 'sans-serif', fontStyle: 'italic', backdrop: false },
  // ステージ開始: 白・標準。
  stageIntro: { color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'normal', backdrop: true },
  // TERRA: 暖色(RAYの冷白と対比)。基盤のみ。
  terraLine: { color: '#ffd9a0', fontFamily: 'sans-serif', fontStyle: 'normal', backdrop: false },
};

const DEPTH = 200;
const FADE_MS = 220;

export class StoryOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private readonly queue: TextRequest[] = [];
  private active = false;
  private current?: TextRequest;
  private autoTimer?: Phaser.Time.TimerEvent;
  private gamePaused = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.backdrop = scene.add.rectangle(0, 0, 10, 10, 0x05080d, 0.72).setOrigin(0.5).setVisible(false);
    this.text = scene.add
      .text(0, 0, '', { fontSize: '20px', color: '#ffffff', align: 'center' })
      .setOrigin(0.5)
      .setVisible(false);
    this.container = scene.add
      .container(0, 0, [this.backdrop, this.text])
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setAlpha(0)
      .setVisible(false);
  }

  /** テキスト要求の並びをキューに積み、再生中でなければ再生を開始する。 */
  enqueue(requests: TextRequest[]): void {
    if (requests.length === 0) return;
    this.queue.push(...requests);
    if (!this.active) this.showNext();
  }

  /** 再生中・キューが残っているか(GameScene 側の判定用)。 */
  isBusy(): boolean {
    return this.active || this.queue.length > 0;
  }

  private showNext(): void {
    const next = this.queue.shift();
    if (!next) {
      this.active = false;
      this.current = undefined;
      this.resumeGameIfNeeded();
      this.container.setVisible(false);
      return;
    }
    this.active = true;
    this.current = next;
    this.layout(next);

    const style = TEXT_STYLES[next.kind];
    if (style.pauseGame) {
      this.pauseGame();
    } else {
      // 非停止テキスト(内心/TERRA)はプレイ継続のまま浮かべる。直前の停止テキストで
      // ゲームが止まっていれば、ここで再開してから表示する(例: 開始テキスト→内心)。
      this.resumeGameIfNeeded();
    }

    this.container.setVisible(true);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: FADE_MS });

    // すべてのテキストは本文の長さに応じた時間で自動的に次へ進む。タップでは閉じない。
    // プレイ中のタップ(移動/ジャンプ/ショット)や、ボス出現時の連射で誤って閉じて
    // しまい「読む前に消える」のを防ぐ。一時停止系はこの間ゲームを止める。
    this.autoTimer = this.scene.time.delayedCall(readingDurationMs(next.text), () => this.dismiss());
  }

  private dismiss(): void {
    if (!this.current) return;
    this.autoTimer?.remove();
    this.autoTimer = undefined;
    // 非停止テキストを抜けたらゲームを再開(停止テキストが連続しない限り)。
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => this.showNext(),
    });
  }

  /** 種別の位置・スタイルに応じてパネルとテキストを配置する。 */
  private layout(req: TextRequest): void {
    const visual = VISUALS[req.kind];
    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;
    const band = resolveControlBand(this.scene);
    const playH = screenH - band;
    const maxWidth = Math.min(760, screenW - 80);

    this.text.setStyle({
      fontFamily: visual.fontFamily,
      fontStyle: visual.fontStyle,
      fontSize: req.kind === 'stageIntro' ? '24px' : '20px',
      color: visual.color,
      align: 'center',
    });
    this.text.setWordWrapWidth(maxWidth, true);
    this.text.setText(req.text);
    this.text.setAlpha(visual.backdrop ? 1 : 0.92);
    // コンストラクタで非表示にしているテキスト本体を表示に戻す(これを忘れると
    // パネルだけ出て文字が出ない)。
    this.text.setVisible(true);

    const pos = TEXT_STYLES[req.kind].position;
    let y: number;
    if (pos === 'top') y = Math.min(110, playH * 0.18);
    else if (pos === 'center') y = playH * 0.42;
    else y = playH - 70; // bottom: 帯の上に収める

    this.container.setPosition(screenW / 2, y);
    this.text.setPosition(0, 0);

    if (visual.backdrop) {
      const padX = 28;
      const padY = 18;
      this.backdrop
        .setSize(this.text.width + padX * 2, this.text.height + padY * 2)
        .setVisible(true);
    } else {
      this.backdrop.setVisible(false);
    }
  }

  private pauseGame(): void {
    if (this.gamePaused) return;
    if (this.scene.scene.isActive(SCENE_KEYS.game)) {
      this.scene.scene.pause(SCENE_KEYS.game);
      this.gamePaused = true;
    }
  }

  private resumeGameIfNeeded(): void {
    if (!this.gamePaused) return;
    if (this.scene.scene.isPaused(SCENE_KEYS.game)) {
      this.scene.scene.resume(SCENE_KEYS.game);
    }
    this.gamePaused = false;
  }

  destroy(): void {
    this.autoTimer?.remove();
    this.resumeGameIfNeeded();
    this.container.destroy();
  }
}
