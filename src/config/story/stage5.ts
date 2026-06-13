import type { StageStory } from '../../types/story';

// Stage 5「ECLIPSE外縁部」の確定テキスト。docs/story.md「テキストコンテンツ(確定版)」より転記。
// ステージ開始演出シーン(TERRA同行)は config/story/cutscenes.ts の 'stage5-intro' を正とする。
// テーマは「RAYへの遺志」。科学者の遺言ログ(クライマックス)を解錠し、RAYの迷いが消える決意のステージ。
// ログ3本はすべて「RAYへ」宛ての直接的なメッセージで、postBoss が遺言(最後のログ)にあたる。

export const STAGE5_STORY: StageStory = {
  stageId: 'stage5',
  intro: ['ECLIPSEのそとがわ。きかいが、どんどん多くなる。', '科学者は、ここに何をのこしたのか。', '——それを、受け取りに来た。'].join(
    '\n',
  ),
  eclipseVoice: '気もちは、こしょうだ。地球は、お前をいらない',
  logs: {
    early: ['RAYへ', 'もうすぐ終わる。お前は、ここまで来た。', 'おれの声が、とどいていたなら——これを読め'].join('\n'),
    preBoss: [
      'RAYへ',
      'お前はきかいだ。でも、気もちがある。',
      'ECLIPSEが計算できないのは、その気もちだ。',
      'りくつには、気もちで答えろ。——それがお前の力だ',
    ].join('\n'),
    postBoss: [
      '最後のログ、RAYへ',
      'おれの息子は、もういない。',
      'でも、お前がいる。',
      'お前がわらえるかどうか、おれには分からない。',
      'お前が感じられることは——分かる。それで十分だ。',
      '行け、RAY',
    ].join('\n'),
  },
  inner: {
    // 科学者の遺言ログ(最初に拾ったログ=RAYへの直接のメッセージ)を読んだ後。
    // onLogOverlap は最初のログの「読了後」に firstLogRead を発火する。
    firstLogRead: '……この人が、おれを作った',
    // ECLIPSE の語りかけ(ボス前)を聞いて。bossIntro の直後に発火する。
    eclipseReaction: '気もちが、力になる。おれには——それがある',
    // ボス撃破後。撃破演出後・クリア遷移前に発火する。
    bossDefeated: 'おれは、感じるために作られた。それだけで——十分だ',
  },
};
