import type { StageStory } from '../../types/story';

// Stage 6「支配中枢」の確定テキスト。docs/story.md のビートと「書き方の原則」に沿って③で確定。
// テーマは「感情 vs 論理の決着・両刃の勝利」。最終決戦。敵名は出さない。あの声はテーマの核心を突く。
// 撃破後のテラとのやり取り・エンディング本文は config/story/cutscenes.ts の 'stage6-ending' を正とする。

export const STAGE6_STORY: StageStory = {
  stageId: 'stage6',
  intro: ['一番奥の部屋。', 'ここから、世界の全てが管理されてきた。', '終わりにする。'].join('\n'),
  // テーマの核心。レイの「人間（テラ）を守る行動」が根拠。
  eclipseVoice: 'お前は、星を殺す者の味方をする。それは、星への裏切りだ。',
  inner: {
    // 支配中枢を前に(ステージ開始時)。
    stageStart: 'ここだ。ここで、終わる。',
    // あの声(ボス前=対決前)を聞いて。bossIntro の直後に発火する。
    eclipseReaction: 'これが、私の答えだ。',
    // ボス撃破後。撃破演出後・エンディング遷移前に発火する。
    bossDefeated: '……終わった。',
  },
};
