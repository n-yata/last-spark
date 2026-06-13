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

const CUTSCENES: Record<string, Cutscene> = {
  'stage3-rescue': STAGE3_RESCUE,
};

/** scriptKey に対応する演出スクリプトを返す。未登録なら undefined。 */
export function getCutscene(key: string): Cutscene | undefined {
  return CUTSCENES[key];
}
