import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { getCutscene, type CutsceneLine } from '../config/story/cutscenes';
import { CUTSCENE_BACKGROUND } from '../config/assetKeys';
import { getSound } from '../systems/SoundManager';
import type { CutsceneSceneData } from '../types/story';

// 演出シーン: 静止画的な簡易演出の上に、TERRAのセリフ↔RAYの内心↔ト書き↔ナレーションを 1 行ずつ表示する。
// ゲームを止めて再生し、タップで送り、最後に onComplete(完了後の遷移)を呼ぶ。
// 話者ラベルは出さず、色調・字体で誰の言葉かを区別する(docs/story.md テキスト表示仕様)。
// scriptKey 差し替えで Stage 4-6 の演出・エンディングにも再利用する(BGM は起動データで差し替え可能)。

/** 話者種別ごとの見た目。StoryOverlay の色調に揃える(暖色=人間/TERRA、白=RAY内心)。 */
const LINE_STYLE: Record<CutsceneLine['kind'], { color: string; fontStyle: string; fontSize: string }> = {
  terraLine: { color: '#ffd9a0', fontStyle: 'normal', fontSize: '26px' },
  rayInner: { color: '#f2f4f8', fontStyle: 'italic', fontSize: '24px' },
  direction: { color: '#9aa3b2', fontStyle: 'italic', fontSize: '18px' },
  // ナレーション/システム文(管理解除・エンディング本文)。括弧で囲まず、世界の声として中央に大きく。
  narration: { color: '#9fffe8', fontStyle: 'normal', fontSize: '22px' },
};

const INPUT_GUARD_MS = 350;

export class CutsceneScene extends Phaser.Scene {
  private lines: CutsceneLine[] = [];
  private scriptKey = '';
  private index = 0;
  private onComplete: () => void = () => {};
  /** 演出中に再生する BGM(任意)。エンディング等で差し替える。未指定なら現在の BGM を維持。 */
  private bgm?: CutsceneSceneData['bgm'];
  private bodyText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private inputReady = false;
  private finished = false;

  constructor() {
    super(SCENE_KEYS.cutscene);
  }

  init(data: CutsceneSceneData): void {
    this.scriptKey = data?.scriptKey ?? '';
    const script = getCutscene(data?.scriptKey);
    this.lines = script ? script.lines : [];
    this.onComplete = data?.onComplete ?? (() => {});
    this.bgm = data?.bgm;
    this.index = 0;
    this.inputReady = false;
    this.finished = false;
  }

  create(): void {
    const { width, height } = this.scale;

    // 演出専用 BGM の指定があれば切り替える(エンディングなど)。未指定なら現在の BGM を維持する。
    if (this.bgm) {
      getSound().playBgm(this.bgm);
    }

    // 背景。実静止画があればそれを敷き、無ければ簡易シルエットへフォールバックする。
    this.add.rectangle(0, 0, width, height, 0x05080d, 1).setOrigin(0);
    this.drawBackground(width, height);

    // 本文(1 行ずつ差し替え)。中央下寄りに大きく表示する。
    this.bodyText = this.add
      .text(width / 2, height * 0.66, '', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: Math.min(760, width - 80) },
      })
      .setOrigin(0.5);

    // タップ送り案内(点滅)。
    this.hint = this.add
      .text(width / 2, height * 0.9, 'TAP', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#fff27a',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: this.hint, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    this.cameras.main.fadeIn(220, 0, 0, 0);

    // 空スクリプト(データ不整合)でも詰まらないよう、行が無ければ即完了。
    if (this.lines.length === 0) {
      this.finish();
      return;
    }

    this.showLine(0);

    // 直前のタップ貫通を避けるため、短い猶予の後に送りを受け付ける。
    this.time.delayedCall(INPUT_GUARD_MS, () => {
      this.inputReady = true;
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.advance, this);
    this.input.keyboard?.on('keydown', this.advance, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.advance, this);
      this.input.keyboard?.off('keydown', this.advance, this);
    });
  }

  /**
   * 背景を敷く。scriptKey に対応する静止画テクスチャがロード済みならそれを cover 配置
   * (画面比が論理解像度と異なっても隙間を作らず、はみ出しはトリミング)。未ロード時は
   * 従来の簡易シルエットへフォールバックして演出を成立させる。
   */
  private drawBackground(width: number, height: number): void {
    const bgKey = CUTSCENE_BACKGROUND[this.scriptKey];
    if (bgKey && this.textures.exists(bgKey)) {
      const src = this.textures.get(bgKey).getSourceImage();
      const scale = Math.max(width / src.width, height / src.height);
      this.add.image(width / 2, height / 2, bgKey).setScale(scale);
      return;
    }
    this.drawScene(width, height);
  }

  /** 簡易シルエット演出(フォールバック): 大きい冷色の影=RAY、小さい暖色の影=TERRA、奥に収容ケージの格子。 */
  private drawScene(width: number, height: number): void {
    const groundY = height * 0.82;
    // 収容ケージの格子(解錠済み=開いた状態の名残)。
    const bars = this.add.graphics().setAlpha(0.25);
    bars.lineStyle(4, 0x6f7b8a, 1);
    for (let i = 0; i < 6; i += 1) {
      const x = width * 0.62 + i * 22;
      bars.lineBetween(x, groundY - 150, x, groundY);
    }
    // RAY(背の高い冷色シルエット)
    this.add.ellipse(width * 0.42, groundY - 60, 60, 150, 0x2b3b4a).setOrigin(0.5, 1);
    this.add.circle(width * 0.42, groundY - 150, 26, 0x37424f);
    // TERRA(小さい暖色シルエット)
    this.add.ellipse(width * 0.55, groundY - 30, 34, 78, 0x5a4533).setOrigin(0.5, 1);
    this.add.circle(width * 0.55, groundY - 78, 17, 0x6b5238);
  }

  private showLine(i: number): void {
    const line = this.lines[i];
    const style = LINE_STYLE[line.kind];
    // ト書きは状況説明として括弧で囲み、セリフと区別する。
    const text = line.kind === 'direction' ? `（${line.text}）` : line.text;
    this.bodyText.setColor(style.color);
    this.bodyText.setFontStyle(style.fontStyle);
    this.bodyText.setFontSize(style.fontSize);
    this.bodyText.setText(text);
  }

  private advance(): void {
    if (!this.inputReady || this.finished) return;
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.finish();
      return;
    }
    this.showLine(this.index);
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    const done = this.onComplete;
    // 自身を止めてから完了コールバック(次シーンへの遷移)を呼ぶ。
    this.scene.stop();
    done();
  }
}
