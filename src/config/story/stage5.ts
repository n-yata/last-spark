import type { StageStory } from '../../types/story';

// Stage 5「ECLIPSE外縁部」の確定テキスト。docs/story.md「テキストコンテンツ(確定版)」より転記。
// ステージ開始演出シーン(TERRA同行)は config/story/cutscenes.ts の 'stage5-intro' を正とする。
// テーマは「決意」。揺らぎを理屈でなく選択で越える(命令→意志の完成)。科学者は姿を見せない。

export const STAGE5_STORY: StageStory = {
  stageId: 'stage5',
  intro: ['ECLIPSEのそとがわ。きかいが、どんどん多くなる。', '科学者は、ここに何をのこしたのか。', '——それを、受け取りに来た。'].join(
    '\n',
  ),
  eclipseVoice: '気もちは、こしょうだ。地球は、お前をいらない',
  inner: {
    // ECLIPSE の語りかけ(ボス前)を聞いて。bossIntro の直後に発火する。
    eclipseReaction: '気もちが、力になる。おれには——それがある',
    // ボス撃破後。撃破演出後・クリア遷移前に発火する。
    bossDefeated: 'おれは、感じるために作られた。それだけで——十分だ',
  },
};
