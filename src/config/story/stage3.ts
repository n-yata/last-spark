import type { StageStory } from '../../types/story';

// Stage 3「収容施設」の確定テキスト。docs/story.md のビートと「書き方の原則」に沿って③で確定。
// 救出後演出シーン(テラ初登場・刻印で名前判明)は config/story/cutscenes.ts の 'stage3-rescue' を正とする。
// 時系列に注意: あの声・terraFound はボス出現直前に発火する（救出はボス撃破後）。この時点ではまだ
// テラに会っておらず、奪ってもいない。よって「返せ」「この子」ではなく、奥へ向かう行動への反応にする。

export const STAGE3_STORY: StageStory = {
  stageId: 'stage3',
  intro: ['人を閉じ込める場所。', '生きている気配がする。', '機械の目が、光る。'].join('\n'),
  // レイが檻の奥（収容対象）へ向かう行動への反応。まだ奪っていないので「返せ」ではなく「渡さない」。
  eclipseVoice: 'それは、我々のものだ。渡さない。',
  inner: {
    // 収容施設入場(ステージ開始時)
    stageStart: '生きている。誰か、いる。',
    // ボス出現直前、檻の奥に誰かの気配を感じて（まだテラとは分からない）。
    terraFound: '奥に、誰かいる。閉じ込められている。',
  },
};
