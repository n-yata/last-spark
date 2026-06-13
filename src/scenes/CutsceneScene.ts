import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { getCutscene, type CutsceneLine } from '../config/story/cutscenes';
import type { CutsceneSceneData } from '../types/story';

// 演出シーン: 静止画的な簡易演出の上に、TERRAのセリフ↔RAYの内心↔ト書きを 1 行ずつ表示する。
// ゲームを止めて再生し、タップで送り、最後に onComplete(完了後の遷移)を呼ぶ。
// 話者ラベルは出さず、色調・字体で誰の言葉かを区別する(docs/story.md テキスト表示仕様)。
// scriptKey 差し替えで Stage 4-6 の演出にも再利用する。

/** 話者種別ごとの見た目。StoryOverlay の色調に揃える(暖色=人間/TERRA、白=RAY内心)。 */
const LINE_STYLE: Record<CutsceneLine['kind'], { color: string; fontStyle: string; fontSize: string }> = {
  terraLine: { color: '#ffd9a0', fontStyle: 'normal', fontSize: '26px' },
  rayInner: { color: '#f2f4f8', fontStyle: 'italic', fontSize: '24px' },
  direction: { color: '#9aa3b2', fontStyle: 'italic', fontSize: '18px' },
};

const INPUT_GUARD_MS = 350;

export class CutsceneScene extends Phaser.Scene {
  private lines: CutsceneLine[] = [];
  private index = 0;
  private onComplete: () => void = () => {};
  private bodyText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private inputReady = false;
  private finished = false;

  constructor() {
    super(SCENE_KEYS.cutscene);
  }

  init(data: CutsceneSceneData): void {
    const script = getCutscene(data?.scriptKey);
    this.lines = script ? script.lines : [];
    this.onComplete = data?.onComplete ?? (() => {});
    this.index = 0;
    this.inputReady = false;
    this.finished = false;
  }

  create(): void {
    const { width, height } = this.scale;

    // 静止画的な簡易演出背景(アセット未調達でも成立するプレースホルダ)。
    this.add.rectangle(0, 0, width, height, 0x05080d, 1).setOrigin(0);
    this.drawScene(width, height);

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

  /** 演出背景: 冷色のロボット=RAY、その隣に人間の少女=TERRA、奥に収容ケージの格子。 */
  private drawScene(width: number, height: number): void {
    const groundY = height * 0.82;
    // 収容ケージの格子(解錠済み=開いた状態の名残)。
    const bars = this.add.graphics().setAlpha(0.22);
    bars.lineStyle(4, 0x6f7b8a, 1);
    for (let i = 0; i < 6; i += 1) {
      const x = width * 0.66 + i * 22;
      bars.lineBetween(x, groundY - 150, x, groundY);
    }
    // RAY(背の高い冷色のロボット)と TERRA(人間の少女)を並べて描く。
    this.drawRay(width * 0.4, groundY);
    this.drawTerra(width * 0.56, groundY);
  }

  /** RAY: 背の高い冷色のロボット。胸部には名前の由来となる刻印「RAY」を描き込む。 */
  private drawRay(x: number, baseY: number): void {
    const g = this.add.graphics();
    // 脚 + 足
    g.fillStyle(0x2b3b4a, 1);
    g.fillRect(x - 16, baseY - 72, 12, 72);
    g.fillRect(x + 4, baseY - 72, 12, 72);
    g.fillStyle(0x1d2a36, 1);
    g.fillRect(x - 20, baseY - 8, 18, 8);
    g.fillRect(x + 2, baseY - 8, 18, 8);
    // 腕(肩の発光ライン付き)
    g.fillStyle(0x2b3b4a, 1);
    g.fillRect(x - 31, baseY - 130, 9, 60);
    g.fillRect(x + 22, baseY - 130, 9, 60);
    g.fillStyle(0x7fd4ff, 0.7);
    g.fillRect(x - 31, baseY - 130, 9, 4);
    g.fillRect(x + 22, baseY - 130, 9, 4);
    // 胴(角張ったボディ)
    g.fillStyle(0x35485a, 1);
    g.fillRect(x - 22, baseY - 132, 44, 64);
    // 胸部パネル(刻印を載せる暗い面)
    g.fillStyle(0x223240, 1);
    g.fillRect(x - 17, baseY - 122, 34, 26);
    g.lineStyle(1, 0x4a6275, 1);
    g.strokeRect(x - 17, baseY - 122, 34, 26);
    // 頭(角型)
    g.fillStyle(0x40566b, 1);
    g.fillRect(x - 16, baseY - 170, 32, 36);
    // バイザー(発光)
    g.fillStyle(0x7fd4ff, 0.9);
    g.fillRect(x - 11, baseY - 158, 22, 7);

    // 胸部の刻印「RAY」。TERRA がこれを見て名前を知る(演出のト書きと対応)。
    this.add
      .text(x, baseY - 109, 'RAY', {
        fontFamily: 'monospace',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#9fe4ff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#3aa0ff', 6, false, true);
  }

  /** TERRA: 人間の少女。ぼかさず頭・髪・ワンピース・手足を描いて人らしい姿にする。 */
  private drawTerra(x: number, baseY: number): void {
    const skin = 0xf2c9a0;
    const hair = 0x5b3b27;
    const dress = 0xe08a52;
    const g = this.add.graphics();
    // 脚
    g.fillStyle(skin, 1);
    g.fillRect(x - 9, baseY - 26, 7, 26);
    g.fillRect(x + 2, baseY - 26, 7, 26);
    // 靴
    g.fillStyle(0x4a3322, 1);
    g.fillRect(x - 11, baseY - 6, 10, 6);
    g.fillRect(x + 1, baseY - 6, 10, 6);
    // ワンピース(肩から裾へ広がる台形)
    g.fillStyle(dress, 1);
    g.fillPoints(
      [
        new Phaser.Geom.Point(x - 13, baseY - 26),
        new Phaser.Geom.Point(x + 13, baseY - 26),
        new Phaser.Geom.Point(x + 9, baseY - 64),
        new Phaser.Geom.Point(x - 9, baseY - 64),
      ],
      true,
    );
    // 腕
    g.fillStyle(skin, 1);
    g.fillRect(x - 15, baseY - 62, 5, 24);
    g.fillRect(x + 10, baseY - 62, 5, 24);
    // 首
    g.fillRect(x - 3, baseY - 70, 6, 8);
    // 後ろ髪(顔より大きめの円)
    g.fillStyle(hair, 1);
    g.fillCircle(x, baseY - 82, 15);
    // 顔(少し下げて頭頂に髪を残す)
    g.fillStyle(skin, 1);
    g.fillCircle(x, baseY - 78, 12);
    // サイドの髪
    g.fillStyle(hair, 1);
    g.fillRect(x - 16, baseY - 84, 5, 16);
    g.fillRect(x + 11, baseY - 84, 5, 16);
    // 目
    g.fillStyle(0x2a1a10, 1);
    g.fillCircle(x - 4, baseY - 78, 1.6);
    g.fillCircle(x + 4, baseY - 78, 1.6);
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
