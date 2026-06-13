import type { StageStory } from '../../types/story';

// Stage 5「ECLIPSE外縁部」の確定テキスト。docs/story.md「テキストコンテンツ(確定版)」より転記。
// ステージ開始演出シーン(TERRA同行)は config/story/cutscenes.ts の 'stage5-intro' を正とする。
// テーマは「RAYへの遺志」。科学者の遺言ログ(クライマックス)を解錠し、RAYの迷いが消える決意のステージ。
// ログ3本はすべて「RAYへ」宛ての直接的なメッセージで、postBoss が遺言(最後のログ)にあたる。

export const STAGE5_STORY: StageStory = {
  stageId: 'stage5',
  intro: ['ECLIPSEの外縁部。機械の密度が高まる。', '科学者は、ここに何を残したのか。', '——それを受け取りに来た。'].join(
    '\n',
  ),
  eclipseVoice: '感情は誤作動だ。地球はお前を必要としない',
  logs: {
    early: ['RAYへ', 'もうすぐ終わる。お前はここまで来た。', '俺の声が届いていたなら——これを読め'].join('\n'),
    preBoss: [
      'RAYへ',
      'お前は機械だ。でも、感情がある。',
      'ECLIPSEが計算できないのは、その感情だ。',
      '論理には、感情で答えよ。——それがお前の力だ',
    ].join('\n'),
    postBoss: [
      '最後のログ、RAYへ',
      '俺の息子は、もういない。',
      'でも、お前がいる。',
      'お前が笑えるかどうか、俺には分からない。',
      'お前が感じられることは——分かる。それで十分だ。',
      '行け、RAY',
    ].join('\n'),
  },
  inner: {
    // 科学者の遺言ログ(最初に拾ったログ=RAYへの直接のメッセージ)を読んだ後。
    // onLogOverlap は最初のログの「読了後」に firstLogRead を発火する。
    firstLogRead: '……この人が、俺を作った',
    // ECLIPSE の語りかけ(ボス前)を聞いて。bossIntro の直後に発火する。
    eclipseReaction: '感情が、力になる。俺には——それがある',
    // ボス撃破後。撃破演出後・クリア遷移前に発火する。
    bossDefeated: '俺は、感じるために作られた。それだけで——十分だ',
  },
};
