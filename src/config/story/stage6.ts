import type { StageStory } from '../../types/story';

// Stage 6「ECLIPSE支配中枢」の確定テキスト。docs/story.md「テキストコンテンツ(確定版)」より転記。
// テーマは「遺志：使命の完全な開示」。最終決戦。科学者の言葉は Stage 5 で完結しているため、
// Stage 6 のログは序盤の1本のみ(ボス前・ボス後ログなし)。ボス前の ECLIPSE 語りかけは通常どおり発生する。
// 撤破後の TERRA とのやり取り・エンディング本文は config/story/cutscenes.ts の 'stage6-ending' を正とする。

export const STAGE6_STORY: StageStory = {
  stageId: 'stage6',
  intro: ['支配中枢。ここがECLIPSEの心臓だ。', 'ここから、世界のすべてが管理されてきた。', '——終わりにする。'].join(
    '\n',
  ),
  eclipseVoice: '地球を守るために、お前を終了する',
  logs: {
    // Stage 6 は序盤ログのみ。科学者の最後のメッセージ(完全な肯定)。
    early: ['これを読んでいるなら', 'お前はここまで来た。', '後は——お前次第だ。', 'RAY、お前を誇りに思う'].join('\n'),
  },
  inner: {
    // 支配中枢を前に(ステージ開始時)。
    stageStart: 'ここだ。ここで——終わる',
    // ECLIPSE の語りかけ(ボス前=ECLIPSE対決前)を聞いて。bossIntro の直後に発火する。
    eclipseReaction: 'これが、俺の答えだ',
    // ECLIPSE撃破後。撃破演出後・エンディング遷移前に発火する。
    bossDefeated: '……終わった',
  },
};
