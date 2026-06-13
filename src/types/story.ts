// ストーリーテキスト表示の型定義。
// docs/story.md「テキスト表示仕様(5種の視覚的区別)」「テキストコンテンツ(確定版)」に対応。
// 表示ロジック(storyDirector)と描画(StoryOverlay)が共有する。

/** ゲーム内テキストの種別(5種)。種別ごとに表示位置・スタイル・色調が異なる。 */
export type StoryTextKind =
  | 'scientistLog' // 科学者のログ(画面上部・暖色・手書き風)
  | 'eclipseVoice' // ECLIPSEの語りかけ(画面上部・冷色・等幅)
  | 'rayInner' // RAYの内心(画面下部・白・イタリック)
  | 'stageIntro' // ステージ開始テキスト(画面中央・白・フェードイン)
  | 'terraLine'; // TERRAのセリフ(画面下部・暖色) ※基盤のみ。Stage 3 で本格使用

/** kind から解決する表示スタイル。位置とゲーム一時停止要否を持つ。 */
export interface StoryTextStyle {
  position: 'top' | 'center' | 'bottom';
  /** 表示中にゲームを一時停止し、タップで閉じるか。false は自動消去(プレイ継続)。 */
  pauseGame: boolean;
}

/** 表示要求。StoryDirector が生成し、StoryOverlay が描画する。 */
export interface TextRequest {
  kind: StoryTextKind;
  /** 本文。複数行は \n で区切る。 */
  text: string;
  /** 表示中にゲームを止めるか(kind の既定スタイルに従うが、明示保持する)。 */
  pauseGame: boolean;
}

/** ログ断片の配置スロット(1ステージ最大3本)。 */
export type LogSlot = 'early' | 'preBoss' | 'postBoss';

/**
 * ストーリーイベント。GameScene の進行から発火し、StoryDirector が TextRequest へ変換する。
 * - stageStart: ステージ開始(開始テキスト + 開始時の内心)
 * - logFound: ログトリガー接触(そのスロットの科学者ログ)
 * - bossIntro: ボスエリア突入直前(ECLIPSEの語りかけ)
 * - inner: 任意の内心トリガ(sceneKey で本文を引く)
 */
export type StoryEvent =
  | { type: 'stageStart' }
  | { type: 'logFound'; slot: LogSlot }
  | { type: 'bossIntro' }
  | { type: 'inner'; sceneKey: string };

/** 1ステージ分の確定テキスト。docs/story.md の転記。 */
export interface StageStory {
  stageId: string;
  /** ステージ開始テキスト(中央・複数行)。 */
  intro: string;
  /** ECLIPSEの語りかけ(ボス前)。 */
  eclipseVoice: string;
  /** ログ断片(スロット→本文)。存在するスロットのみ持つ。 */
  logs: Partial<Record<LogSlot, string>>;
  /**
   * RAYの内心テキスト(イベントキー→本文)。
   * キー例: 'stageStart' / 'firstEnemyDefeated' / 'firstLogFound' / 'firstLogRead'。
   * 該当キーが無ければ内心は表示されない。
   */
  inner: Record<string, string>;
}
