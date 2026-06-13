import type { StageStory } from '../../types/story';

// Stage 3「収容施設」の確定テキスト。docs/story.md「テキストコンテンツ(確定版)」より転記。
// 救出後演出シーン(TERRA初登場・刻印で名前判明)は config/story/cutscenes.ts の 'stage3-rescue' を正とする。

export const STAGE3_STORY: StageStory = {
  stageId: 'stage3',
  intro: ['収容施設。生きている人間の気配がある。', '機械の監視の目が光る。', '——誰かが、ここにいる。'].join(
    '\n',
  ),
  eclipseVoice: 'その個体は管理対象だ。返却せよ',
  logs: {
    early: [
      '観察記録',
      '人間の顔を集めている。笑顔、怒り、恐怖、涙。',
      'お前に全部覚えさせた。',
      '——人の顔を見たとき、何を感じるか',
    ].join('\n'),
    preBoss: [
      '個人メモ',
      '息子は笑顔が好きだった。',
      'ECLIPSEが来た日、あの子は泣いていた。',
      '——その怒りを、お前に渡せたかな',
    ].join('\n'),
    postBoss: [
      '私的記録',
      'こんな廃墟の中でも、子供は笑う。',
      'それだけが、俺を動かし続ける。',
      'RAY——この世界に、笑顔を取り戻せ',
    ].join('\n'),
  },
  inner: {
    // 収容施設入場(ステージ開始時)
    stageStart: '生きている。人間の、においがする',
    // 収容ケージ(TERRA)を見つけて。ケージ接近トリガで発火する。
    terraFound: '……この子が、囚われている',
  },
};
