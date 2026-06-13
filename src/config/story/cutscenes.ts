// 演出シーン(CutsceneScene)のスクリプト定義。docs/story.md「TERRAのセリフ」確定版を転記する。
// TERRA のセリフと RAY の内心を交互に並べ、ト書き(direction)で状況を説明する。
// Stage 4-6 の演出もこのファイルへ追記するだけで CutsceneScene が再生できる(後続ブロックの前提)。

/** 演出スクリプトの 1 行。話者種別で表示スタイルが変わる(話者ラベルは出さない)。 */
export type CutsceneLine =
  | { kind: 'terraLine'; text: string } // TERRA のセリフ(暖色・標準)
  | { kind: 'rayInner'; text: string } // RAY の内心(白・イタリック)
  | { kind: 'direction'; text: string }; // ト書き(中央・小さめ・状況説明)

export interface Cutscene {
  key: string;
  lines: CutsceneLine[];
}

// Stage 3「収容施設」救出後演出シーン。TERRA 初登場・名乗り・刻印で RAY の名前が判明する。
// docs/story.md「TERRAのセリフ > Stage 3 — 救出後演出シーン」の確定スクリプトをそのまま転記し、
// 末尾に内心一覧の「救出後・TERRAと出会い」(RAY の決意)を続けて締める。
// Stage 1「崩れた都市」開始演出シーン。RAY が廃墟で目覚める導入。背景画像(stage1-intro.svg)を
// 全画面に敷いた専用シーンで再生し、送り終えるとゲーム本編が始まる。テキストは docs/story.md
// 「ステージ開始テキスト > Stage 1」確定版 + 内心一覧「目覚め」をそのまま転記する(改変しない)。
// 目覚め → 情景(ト書き) → RAY の内心、の順で 1 行ずつ提示する。
const STAGE1_INTRO: Cutscene = {
  key: 'stage1-intro',
  lines: [
    { kind: 'rayInner', text: '……俺は、起きた' },
    { kind: 'direction', text: '廃墟。錆と蔓草に覆われた、かつての都市。' },
    { kind: 'rayInner', text: 'ここは管理下にある。' },
    { kind: 'rayInner', text: '俺は——なぜ、ここにいる。' },
  ],
};

const STAGE3_RESCUE: Cutscene = {
  key: 'stage3-rescue',
  lines: [
    { kind: 'terraLine', text: '……ロボット？' },
    { kind: 'rayInner', text: '……小さい。こんなに、小さい' },
    { kind: 'terraLine', text: '怖くない？' },
    { kind: 'rayInner', text: '怖い。でも、離さない' },
    { kind: 'terraLine', text: '名前は——TERRAっていうの。あなたは？' },
    { kind: 'rayInner', text: '……答え方が、分からない' },
    { kind: 'direction', text: 'TERRAがRAYの胸部の刻印に気づく' },
    { kind: 'terraLine', text: '……R・A・Y。RAYだ！　RAYっていうんだね' },
    { kind: 'rayInner', text: 'RAY。——それが、俺の名前' },
    { kind: 'rayInner', text: 'この子を、守る。理由は分からない。でも——そう感じる' },
  ],
};

// Stage 4「汚染地帯」ステージ開始演出シーン。TERRA 同行後の最初のステージで、汚染された空気に
// TERRA が反応し、RAY が「人間が壊した場所」だと内心で受け止める。docs/story.md
// 「TERRAのセリフ > Stage 4 — ステージ開始演出シーン」の確定スクリプトをそのまま転記する。
const STAGE4_INTRO: Cutscene = {
  key: 'stage4-intro',
  lines: [
    { kind: 'terraLine', text: 'ここ、空気が変。息が苦しい' },
    { kind: 'rayInner', text: '人間が——壊した場所だ' },
    { kind: 'terraLine', text: '誰がこんなにしたの？' },
    { kind: 'rayInner', text: '……人間が。俺が守ろうとしている——人間が' },
  ],
};

const CUTSCENES: Record<string, Cutscene> = {
  'stage1-intro': STAGE1_INTRO,
  'stage3-rescue': STAGE3_RESCUE,
  'stage4-intro': STAGE4_INTRO,
};

/** scriptKey に対応する演出スクリプトを返す。未登録なら undefined。 */
export function getCutscene(key: string): Cutscene | undefined {
  return CUTSCENES[key];
}
