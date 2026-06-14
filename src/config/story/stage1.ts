import type { StageStory } from '../../types/story';

// Stage 1「崩れた都市」の確定テキスト。docs/story.md「テキストコンテンツ(確定版)」より転記。
// 本文は story.md を正本とし、ここでは改変しない。

export const STAGE1_STORY: StageStory = {
  stageId: 'stage1',
  intro: ['こわれた町。さびと、つる草におおわれた、むかしの町。', 'ここは、見はられている。', 'おれは——どうして、ここにいるんだ。'].join(
    '\n',
  ),
  eclipseVoice: 'ここは、かんりされている。入ってくるものは、けす',
  inner: {
    // 目覚め
    stageStart: '……おれは、目をさました',
    // 初の戦闘後
    firstEnemyDefeated: '動けた。——おれは、何者だ',
  },
};
