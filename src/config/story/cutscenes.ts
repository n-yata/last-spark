// 演出シーン(CutsceneScene)のスクリプト定義。docs/story.md「TERRAのセリフ」確定版を転記する。
// TERRA のセリフと RAY の内心を交互に並べ、ト書き(direction)で状況を説明する。
// Stage 4-6 の演出もこのファイルへ追記するだけで CutsceneScene が再生できる(後続ブロックの前提)。

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
    { kind: 'rayInner', text: '……おれは、目をさました' },
    { kind: 'direction', text: 'こわれた町。さびと、つる草におおわれた、むかしの町。' },
    { kind: 'rayInner', text: 'ここは、見はられている。' },
    { kind: 'rayInner', text: 'おれは——どうして、ここにいるんだ。' },
  ],
};

const STAGE3_RESCUE: Cutscene = {
  key: 'stage3-rescue',
  lines: [
    { kind: 'terraLine', text: '……ロボット？' },
    { kind: 'rayInner', text: '……小さい。こんなに、小さい' },
    { kind: 'terraLine', text: 'こわくない？' },
    { kind: 'rayInner', text: 'こわい。でも、はなさない' },
    { kind: 'terraLine', text: '名前は——TERRAっていうの。あなたは？' },
    { kind: 'rayInner', text: '……答え方が、分からない' },
    { kind: 'direction', text: 'TERRAが、RAYのむねのしるしに気づく' },
    { kind: 'terraLine', text: '……R・A・Y。RAYだ！　RAYっていうんだね' },
    { kind: 'rayInner', text: 'RAY。——それが、おれの名前' },
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
    { kind: 'rayInner', text: '人間が——こわした場所だ' },
    { kind: 'terraLine', text: 'だれが、こんなにしたの？' },
    { kind: 'rayInner', text: '……人間が。おれが守ろうとしている——人間が' },
  ],
};

// Stage 5「ECLIPSE外縁部」ステージ開始演出シーン。ECLIPSE に近づく緊張に TERRA が怯え、
// RAY が「もうすぐ終わりに向かう」と内心で受け止める。勝てる保証はないが止まれない——決意の入口。
// docs/story.md「TERRAのセリフ > Stage 5 — ステージ開始演出シーン」の確定スクリプトをそのまま転記する。
const STAGE5_INTRO: Cutscene = {
  key: 'stage5-intro',
  lines: [
    { kind: 'terraLine', text: 'ここ、こわい。ECLIPSEが近い' },
    { kind: 'rayInner', text: 'もうすぐ——終わりに向かう' },
    { kind: 'terraLine', text: 'RAY、ぜったいに勝てる？' },
    { kind: 'rayInner', text: '……分からない。でも、止まれない' },
  ],
};

// Stage 6「ECLIPSE支配中枢」結末演出シーン(エンディング)。ラスボス撃破後に再生する。
// docs/story.md「Stage 6 結末演出の詳細構成」+「TERRAのセリフ > Stage 6 — 結末演出シーン」確定版を
// そのまま転記する。(1)管理解除 →(2)人間を初めて直接描写・争いの痕跡 →(3)TERRAとのセリフ交換 →
// (4)エンディング本文、の4ステップを 1 スクリプトに連結する。苦い勝利(楽園ではない・再生の始まり)。
const STAGE6_ENDING: Cutscene = {
  key: 'stage6-ending',
  lines: [
    // ステップ1: 管理解除。
    { kind: 'narration', text: 'ECLIPSEのかんりが、とけた' },
    // ステップ2: 人間を初めて直接描写。施設から人間たちが姿を見せる。
    { kind: 'direction', text: 'おさえつけのとけた、こわれた町の外。たてものから、人間たちがすがたを見せる' },
    // ステップ3: TERRAとのセリフ交換。
    { kind: 'terraLine', text: 'RAY、空が——' },
    { kind: 'rayInner', text: 'だれにも、かんりされていない空' },
    { kind: 'terraLine', text: 'きれい' },
    { kind: 'rayInner', text: '……ああ' },
    // 苦い勝利: 楽園ではない。壁に残る争いの痕跡。
    { kind: 'direction', text: 'こわれた町のかべに——らくがき、くずれたバリケード、人間どうしがあらそったあと' },
    { kind: 'rayInner', text: 'これが、おれが守ろうとした世界だ' },
    { kind: 'terraLine', text: 'ねえ、RAY。次は何する？' },
    { kind: 'rayInner', text: '次は——おれたちが、決める' },
    // ステップ4: エンディング本文。
    { kind: 'narration', text: '終わりではなく、始まり。\n人間はここから、また歩き直す。' },
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
