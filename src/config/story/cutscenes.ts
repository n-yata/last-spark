// 演出シーン(CutsceneScene)のスクリプト定義。docs/story.md のビートと「書き方の原則」に沿って③で確定。
// テラのセリフとレイの内心を交互に並べ、ト書き(direction)で状況を説明する。表示テキストの固有名は
// レイ/テラ（型・キー等のコード識別子は RAY/TERRA のまま）。胸の刻印のみ英字「RAY」を残す。

/** 演出スクリプトの 1 行。話者種別で表示スタイルが変わる(話者ラベルは出さない)。 */
export type CutsceneLine =
  | { kind: 'terraLine'; text: string } // TERRA のセリフ(暖色・標準)
  | { kind: 'rayInner'; text: string } // RAY の内心(白・イタリック)
  | { kind: 'direction'; text: string } // ト書き(中央・小さめ・状況説明。括弧で囲む)
  | { kind: 'narration'; text: string }; // ナレーション/システム文(中央・括弧なし。管理解除・エンディング本文)

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
    { kind: 'rayInner', text: '……私は、目を覚ました' },
    { kind: 'direction', text: '壊れた町。さびと、つたに覆われている' },
    { kind: 'rayInner', text: 'この町は、見張られているようだ' },
    { kind: 'rayInner', text: '私は、なぜここにいるのだろう' },
  ],
};

const STAGE3_RESCUE: Cutscene = {
  key: 'stage3-rescue',
  lines: [
    { kind: 'terraLine', text: '……ロボット？' },
    { kind: 'rayInner', text: '……小さい。こんなに、小さいのか' },
    { kind: 'terraLine', text: '怖くない？' },
    { kind: 'rayInner', text: '怖い。でも、離さない' },
    { kind: 'terraLine', text: '名前は、テラっていうの。あなたは？' },
    { kind: 'rayInner', text: '……答え方が、分からない' },
    // 胸の刻印は英字「RAY」のまま。テラがそれを読んで「レイ」と呼ぶ（名前の由来 ray of light と繋がる）。
    { kind: 'direction', text: 'テラが、レイの胸の印に気づく' },
    { kind: 'terraLine', text: '……R・A・Y。レイだ！　レイって、いうんだね' },
    { kind: 'rayInner', text: 'レイ。それが、私の名前' },
    { kind: 'rayInner', text: 'この子を守る。理由は分からない。でも、そう感じる' },
  ],
};

// Stage 4「汚染地帯」ステージ開始演出シーン。TERRA 同行後の最初のステージで、汚染された空気に
// TERRA が反応し、RAY が「人間が壊した場所」だと内心で受け止める。docs/story.md
// 「TERRAのセリフ > Stage 4 — ステージ開始演出シーン」の確定スクリプトをそのまま転記する。
const STAGE4_INTRO: Cutscene = {
  key: 'stage4-intro',
  lines: [
    { kind: 'terraLine', text: 'ここ、空気が変。息が、苦しい' },
    { kind: 'rayInner', text: '人間が、壊した場所だ' },
    { kind: 'terraLine', text: 'だれが、こんなにしたの？' },
    { kind: 'rayInner', text: '……人間が。私が守ろうとしている、その人間が' },
  ],
};

// Stage 5「ECLIPSE外縁部」ステージ開始演出シーン。ECLIPSE に近づく緊張に TERRA が怯え、
// RAY が「もうすぐ終わりに向かう」と内心で受け止める。勝てる保証はないが止まれない——決意の入口。
// docs/story.md「TERRAのセリフ > Stage 5 — ステージ開始演出シーン」の確定スクリプトをそのまま転記する。
const STAGE5_INTRO: Cutscene = {
  key: 'stage5-intro',
  lines: [
    { kind: 'terraLine', text: 'ここ、怖い。あの声が、近い' },
    { kind: 'rayInner', text: 'もうすぐ、終わりに向かう' },
    { kind: 'terraLine', text: 'レイ、絶対に勝てる？' },
    { kind: 'rayInner', text: '……分からない。でも、止まれない' },
  ],
};

// Stage 6「ECLIPSE支配中枢」結末演出シーン(エンディング)。ラスボス撃破後に再生する。
// docs/story.md「Stage 6 結末演出の詳細構成」+「TERRAのセリフ > Stage 6 — 結末演出シーン」確定版を
// そのまま転記する。(1)管理解除 →(2)TERRAとのセリフ交換(自由な空) →(3)争いの痕跡(ト書き) →
// (4)エンディング本文、の4ステップを 1 スクリプトに連結する。苦い勝利(楽園ではない・再生の始まり)。
// ※群衆は出さない(人類はほぼ絶滅・RAYとTERRAの二人だけ)。「建物から人間たちが姿を見せる」描写は廃止。
const STAGE6_ENDING: Cutscene = {
  key: 'stage6-ending',
  lines: [
    // ステップ1: 管理解除。
    { kind: 'narration', text: 'あの声の管理が、解けた' },
    // ステップ2: テラとのセリフ交換(だれにも管理されない自由な空)。
    { kind: 'terraLine', text: 'レイ、空が——' },
    { kind: 'rayInner', text: 'だれにも管理されていない空だ' },
    { kind: 'terraLine', text: 'きれい' },
    { kind: 'rayInner', text: '……ああ' },
    // 苦い勝利: 楽園ではない。壁に残る争いの痕跡（群衆は出さない・ト書き描写は story.md 容認）。
    { kind: 'direction', text: '壊れた町の壁に、落書き。崩れたバリケード。人間どうしが争った跡' },
    { kind: 'rayInner', text: 'これが、私が守ろうとした世界だ' },
    { kind: 'terraLine', text: 'ねえ、レイ。次は何する？' },
    { kind: 'rayInner', text: '次は、私たちが決める' },
    // ステップ4: エンディング本文（人類はほぼ絶滅・やり直しはこの二人から）。
    { kind: 'narration', text: '終わりではなく、始まり。\nここから、私たちが歩き出す。' },
  ],
};

const CUTSCENES: Record<string, Cutscene> = {
  'stage1-intro': STAGE1_INTRO,
  'stage3-rescue': STAGE3_RESCUE,
  'stage4-intro': STAGE4_INTRO,
  'stage5-intro': STAGE5_INTRO,
  'stage6-ending': STAGE6_ENDING,
};

/** scriptKey に対応する演出スクリプトを返す。未登録なら undefined。 */
export function getCutscene(key: string): Cutscene | undefined {
  return CUTSCENES[key];
}
