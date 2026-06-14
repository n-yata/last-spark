import type Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { resolveControlBand } from '../config/controlBand';
import { scaled, scaledFontPx } from '../config/uiScale';
import { TEXT_STYLES, readingDurationMs } from '../systems/storyDirector';
import type { StoryTextKind, TextRequest } from '../types/story';

// ストーリーテキストのオーバーレイ描画。UIScene 上に常駐し、TextRequest のキューを順に再生する。
// - 開始テキスト(stageIntro): GameScene を pause し画面中央に出す。タップで進み、これが
//   ステージ開始の合図になる(ゲームが止まっているので移動/ショットの誤タップは起きない)。
// - それ以外のステージ中テキスト(ECLIPSE/RAY内心/TERRA): プレイ継続のまま
//   画面上部に表示し、本文長に応じた時間で自動消去する(操作の邪魔になりにくい)。
// 種別の見た目(色・フォント)で「誰の言葉か」を瞬時に区別できるようにする(話者ラベルは出さない)。

interface KindVisual {
  color: string;
  fontFamily: string;
  fontStyle: string;
  /** 背景パネルを敷くか(可読性。一時停止系のみ)。 */
  backdrop: boolean;
}

const VISUALS: Record<StoryTextKind, KindVisual> = {
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
  /** タップ進行系(開始テキスト)で出す「タップで進む」案内。非停止系では隠す。 */
  private readonly hint: Phaser.GameObjects.Text;
  private readonly queue: TextRequest[] = [];
  private active = false;
  private current?: TextRequest;
  private autoTimer?: Phaser.Time.TimerEvent;
  /** タップ受付までの猶予タイマー(フェードイン中の取りこぼし/直前タップの貫通を防ぐ)。 */
  private tapGuard?: Phaser.Time.TimerEvent;
  private gamePaused = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.backdrop = scene.add.rectangle(0, 0, 10, 10, 0x05080d, 0.72).setOrigin(0.5).setVisible(false);
    this.text = scene.add
      .text(0, 0, '', { fontSize: scaledFontPx(20), color: '#ffffff', align: 'center' })
      .setOrigin(0.5)
      .setVisible(false);
    this.hint = scene.add
      .text(0, 0, 'タップで進む', { fontSize: scaledFontPx(13), color: '#9aa3b2', align: 'center' })
      .setOrigin(0.5)
      .setVisible(false);
    this.container = scene.add
      .container(0, 0, [this.backdrop, this.text, this.hint])
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setAlpha(0)
      .setVisible(false);
  }

  /** タップ進行(開始テキスト)用のハンドラ。off で外せるようフィールドに束縛しておく。 */
  private readonly onTapAdvance = (): void => {
    this.dismiss();
  };

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

    this.container.setVisible(true);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: FADE_MS });

    const style = TEXT_STYLES[next.kind];
    if (style.pauseGame) {
      // 開始テキストはゲームを止めてタップ待ち。止まっている間は移動/ショットの誤タップが
      // 起きないので、タップ=ステージ開始の合図として安全に使える。フェードイン中の取り
      // こぼしや直前タップの貫通を避けるため、短い猶予の後に受け付ける。
      this.pauseGame();
      this.tapGuard = this.scene.time.delayedCall(280, () => {
        this.scene.input.once('pointerdown', this.onTapAdvance);
      });
    } else {
      // それ以外のステージ中テキストはプレイ継続のまま浮かべ、本文長に応じて自動で進む。
      // タップでは閉じない(プレイ中の移動/ジャンプ/ショットやボス出現時の連射で誤って
      // 「読む前に消える」のを防ぐ)。直前の開始テキストで止まっていればここで再開する。
      this.resumeGameIfNeeded();
      this.autoTimer = this.scene.time.delayedCall(readingDurationMs(next.text), () => this.dismiss());
    }
  }

  private dismiss(): void {
    if (!this.current) return;
    this.autoTimer?.remove();
    this.autoTimer = undefined;
    this.tapGuard?.remove();
    this.tapGuard = undefined;
    this.scene.input.off('pointerdown', this.onTapAdvance);
    this.hint.setVisible(false);
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
    const maxWidth = Math.min(scaled(760), screenW - scaled(80));

    this.text.setStyle({
      fontFamily: visual.fontFamily,
      fontStyle: visual.fontStyle,
      fontSize: req.kind === 'stageIntro' ? scaledFontPx(24) : scaledFontPx(20),
      color: visual.color,
      align: 'center',
    });
    this.text.setWordWrapWidth(maxWidth, true);
    this.text.setText(req.text);
    this.text.setAlpha(visual.backdrop ? 1 : 0.92);
    // コンストラクタで非表示にしているテキスト本体を表示に戻す(これを忘れると
    // パネルだけ出て文字が出ない)。
    this.text.setVisible(true);

    const style = TEXT_STYLES[req.kind];
    const pos = style.position;
    let y: number;
    if (pos === 'top') y = Math.min(scaled(110), playH * 0.18);
    else if (pos === 'center') y = playH * 0.42;
    else y = playH - scaled(70); // bottom: 帯の上に収める

    this.container.setPosition(screenW / 2, y);
    this.text.setPosition(0, 0);

    if (visual.backdrop) {
      const padX = scaled(28);
      const padY = scaled(18);
      this.backdrop
        .setSize(this.text.width + padX * 2, this.text.height + padY * 2)
        .setVisible(true);
    } else {
      this.backdrop.setVisible(false);
    }

    // タップで進む系(開始テキスト)だけ案内を本文の下に出す。
    if (style.pauseGame) {
      this.hint.setPosition(0, this.text.height / 2 + scaled(30)).setVisible(true);
    } else {
      this.hint.setVisible(false);
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
    this.tapGuard?.remove();
    this.scene.input.off('pointerdown', this.onTapAdvance);
    this.resumeGameIfNeeded();
    this.container.destroy();
  }
}
