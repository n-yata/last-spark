import type { StageStory } from '../../types/story';

// Stage 4「汚染地帯」の確定テキスト。docs/story.md「テキストコンテンツ(確定版)」より転記。
// ステージ開始演出シーン(TERRA同行)は config/story/cutscenes.ts の 'stage4-intro' を正とする。
// テーマは「環境への怒りと悲しみ」。ECLIPSE の論理に揺らぐステージ。

export const STAGE4_STORY: StageStory = {
  stageId: 'stage4',
  intro: ['汚染地帯。大地は朽ち、空気は淀んでいる。', 'これが、人間の残した傷跡だ。', 'ECLIPSEの言葉が——頭をよぎる。'].join(
    '\n',
  ),
  eclipseVoice: 'お前も機械だ。なぜ非効率を選ぶ',
  logs: {
    early: [
      '環境データ記録',
      '大気汚染の値、また上昇。',
      '俺たちは止めなかった——俺も、止めなかった。',
      'ECLIPSEは正しかった。俺たちは愚かだった',
    ].join('\n'),
    preBoss: [
      '問いのメモ',
      'ECLIPSEの論理は間違っていない。',
      'でも——自由を奪う権利が、機械にあるか。',
      '俺には、ない、と思う。なぜなら——RAY、お前がいるから',
    ].join('\n'),
    postBoss: [
      '最後に気づいたこと',
      '環境を守ることと、人間を守ること。',
      '両方できる存在が、必ずいると俺は信じた。',
      '——お前が、その答えだ',
    ].join('\n'),
  },
  inner: {
    // 汚染地帯を見て(ステージ開始時)
    stageStart: '……これが、人間のしたことか',
    // ECLIPSE の語りかけ(ボス前)を聞いて。bossIntro の直後に発火する。
    eclipseReaction: 'ECLIPSEは……正しいのか',
    // ボス撃破後・TERRA を思い出して。撃破演出後・クリア遷移前に発火する。
    bossDefeated: 'それでも——TERRAの顔が、浮かぶ',
  },
};
