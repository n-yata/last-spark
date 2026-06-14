import type { StageStory } from '../../types/story';

// Stage 3「収容施設」の確定テキスト。docs/story.md「テキストコンテンツ(確定版)」より転記。
// 救出後演出シーン(TERRA初登場・刻印で名前判明)は config/story/cutscenes.ts の 'stage3-rescue' を正とする。

export const STAGE3_STORY: StageStory = {
  stageId: 'stage3',
  intro: ['人をとじこめる、しせつ。生きている人の、けはいがする。', 'きかいの見はりの目が、光る。', '——だれかが、ここにいる。'].join(
    '\n',
  ),
  eclipseVoice: 'そいつは、おれたちのものだ。かえせ',
  inner: {
    // 収容施設入場(ステージ開始時)
    stageStart: '生きている。人の、においがする',
    // 収容ケージ(TERRA)を見つけて。ケージ接近トリガで発火する。
    terraFound: '……この子が、とじこめられている',
  },
};
