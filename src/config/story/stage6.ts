import type { StageStory } from '../../types/story';

// Stage 6「ECLIPSE支配中枢」の確定テキスト。docs/story.md「テキストコンテンツ(確定版)」より転記。
// テーマは「感情 vs 論理の決着・両刃の勝利」。最終決戦。ボス前の ECLIPSE 語りかけは通常どおり発生する。
// 撃破後の TERRA とのやり取り・エンディング本文は config/story/cutscenes.ts の 'stage6-ending' を正とする。

export const STAGE6_STORY: StageStory = {
  stageId: 'stage6',
  intro: ['いちばんおくのへや。ここが、ECLIPSEのまんなかだ。', 'ここから、世界のすべてが、かんりされてきた。', '——終わりにする。'].join(
    '\n',
  ),
  eclipseVoice: '地球を守るために、お前をけす',
  inner: {
    // 支配中枢を前に(ステージ開始時)。
    stageStart: 'ここだ。ここで——終わる',
    // ECLIPSE の語りかけ(ボス前=ECLIPSE対決前)を聞いて。bossIntro の直後に発火する。
    eclipseReaction: 'これが、おれの答えだ',
    // ECLIPSE撃破後。撃破演出後・エンディング遷移前に発火する。
    bossDefeated: '……終わった',
  },
};
