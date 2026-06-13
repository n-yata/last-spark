import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { STAGE_IDS } from '../config/stage1';
import { getStageStory } from '../config/story';
import { SaveManager } from '../persistence/SaveManager';
import { getSound } from '../systems/SoundManager';
import { transitionTo, fadeIn } from '../systems/sceneTransition';
import { buildLogEntries, logRowLabel, type LogEntry } from '../systems/logCollection';

// 取得済みの科学者ログをまとめて閲覧する画面。タイトルから遷移してくる。
// 拾得時は本文を流さず収集だけ行い(GameScene.onLogOverlap)、ここで後からまとめて読む。
// 呼び出し元非依存に作り(SaveData を直接参照)、将来ゲーム中からも開けるようにする。
// 世界観統一のため scientistLog の暖色・serif(StoryOverlay の VISUALS)を流用する。

/** scientistLog の見た目を流用(暖色・serif)。 */
const LOG_COLOR = '#ffcf8f';
const LOG_FONT = 'Georgia, serif';
/** 一覧の通常行/選択行/ロック行の色。 */
const ROW_COLOR = '#cbb08a';
const ROW_SELECTED_COLOR = '#ffe6bf';
const ROW_LOCKED_COLOR = '#5a6270';

/** 一覧レイアウト。左カラムに行を並べ、右カラムに本文を表示する。 */
const LIST_X = 40;
const LIST_TOP = 84;
const ROW_HEIGHT = 26;
const BODY_X = 380;
const BODY_TOP = 84;

export class LogViewerScene extends Phaser.Scene {
  private entries: LogEntry[] = [];
  /** 行テキストと対応エントリ。選択ハイライトの切替に使う。 */
  private rows: { entry: LogEntry; text: Phaser.GameObjects.Text }[] = [];
  private bodyText!: Phaser.GameObjects.Text;
  private selectedKey?: string;

  constructor() {
    super(SCENE_KEYS.logViewer);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0e14');
    fadeIn(this);
    this.rows = [];
    this.selectedKey = undefined;

    const collected = new SaveManager().getCollectedLogs();
    this.entries = buildLogEntries(STAGE_IDS, (s) => getStageStory(s)?.logs, collected);

    // 見出し
    this.add
      .text(width / 2, 34, '記録ログ', {
        fontFamily: LOG_FONT,
        fontSize: '28px',
        color: LOG_COLOR,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 取得状況(N / M)。
    const got = this.entries.filter((e) => e.collected).length;
    this.add
      .text(width - 24, 38, `${got} / ${this.entries.length}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#7fe9dd',
      })
      .setOrigin(1, 0.5);

    // 閉じる導線(戻る)。左上に配置し、タップ/ESC/BACK で閉じる。
    const back = this.add
      .text(24, 38, '← 戻る', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#fff27a',
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    back.on(Phaser.Input.Events.POINTER_DOWN, () => this.close());

    // 本文パネル(右カラム)。
    this.add
      .rectangle(BODY_X - 16, BODY_TOP - 16, width - BODY_X - 8, height - BODY_TOP - 24, 0x05080d, 0.55)
      .setOrigin(0);
    this.bodyText = this.add.text(BODY_X, BODY_TOP, '', {
      fontFamily: LOG_FONT,
      fontSize: '20px',
      color: LOG_COLOR,
      align: 'left',
      lineSpacing: 8,
      wordWrap: { width: width - BODY_X - 40 },
    });

    // 一覧(左カラム)。取得済みのみ選択可能、未取得はロック表示。
    this.entries.forEach((entry, i) => {
      const y = LIST_TOP + i * ROW_HEIGHT;
      const text = this.add.text(LIST_X, y, logRowLabel(entry), {
        fontFamily: LOG_FONT,
        fontSize: '15px',
        color: entry.collected ? ROW_COLOR : ROW_LOCKED_COLOR,
      });
      if (entry.collected) {
        text.setInteractive({ useHandCursor: true });
        text.on(Phaser.Input.Events.POINTER_DOWN, () => this.select(entry));
      }
      this.rows.push({ entry, text });
    });

    // 初期表示: 最初の取得済みログを開く。1本も無ければ案内文。
    const first = this.entries.find((e) => e.collected);
    if (first) {
      this.select(first);
    } else {
      this.bodyText.setText('まだ記録は見つかっていない。\nステージでログを拾うと、ここに残る。');
    }

    // キーボードでも閉じられるように。
    this.input.keyboard?.on('keydown-ESC', this.close, this);
    this.input.keyboard?.on('keydown-BACKSPACE', this.close, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.close, this);
      this.input.keyboard?.off('keydown-BACKSPACE', this.close, this);
    });
  }

  /** ログを選択して本文を表示し、一覧の選択ハイライトを更新する。 */
  private select(entry: LogEntry): void {
    if (this.selectedKey === entry.key) return;
    getSound().playSe('uiTap');
    this.selectedKey = entry.key;
    this.bodyText.setText(entry.body);
    for (const row of this.rows) {
      if (!row.entry.collected) continue;
      row.text.setColor(row.entry.key === entry.key ? ROW_SELECTED_COLOR : ROW_COLOR);
    }
  }

  /** タイトルへ戻る。 */
  private close(): void {
    getSound().playSe('uiTap');
    transitionTo(this, SCENE_KEYS.title);
  }
}
