import type { StageStory } from '../../types/story';

// Stage 2「高層廃墟」の確定テキスト。docs/story.md「テキストコンテンツ(確定版)」より転記。

export const STAGE2_STORY: StageStory = {
  stageId: 'stage2',
  intro: ['上へ。高い、こわれたビルのおくに、何かがある。', 'だれかが、のこしていったものが。'].join('\n'),
  eclipseVoice: 'このたてものは、ECLIPSEのものだ。入ってくるものは、けす',
  inner: {
    // 高層部へ向かいながら
    stageStart: '上に、何かある。引きよせられる——どうして',
  },
};
