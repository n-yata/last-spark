import type { StageStory } from '../../types/story';

// Stage 4「汚染地帯」の確定テキスト。docs/story.md「テキストコンテンツ(確定版)」より転記。
// ステージ開始演出シーン(TERRA同行)は config/story/cutscenes.ts の 'stage4-intro' を正とする。
// テーマは「環境への怒りと悲しみ」。ECLIPSE の論理に揺らぐステージ。

export const STAGE4_STORY: StageStory = {
  stageId: 'stage4',
  intro: ['よごれた土地。大地はかれ、空気はにごっている。', 'これが、人間ののこしたきずあとだ。', 'ECLIPSEの言葉が——頭をよぎる。'].join(
    '\n',
  ),
  eclipseVoice: 'お前もきかいだ。なぜ、むだなことをえらぶ',
  inner: {
    // 汚染地帯を見て(ステージ開始時)
    stageStart: '……これが、人間のしたことか',
    // ECLIPSE の語りかけ(ボス前)を聞いて。bossIntro の直後に発火する。
    eclipseReaction: 'ECLIPSEは……正しいのか',
    // ボス撃破後・TERRA を思い出して。撃破演出後・クリア遷移前に発火する。
    bossDefeated: 'それでも——TERRAの顔が、うかぶ',
  },
};
