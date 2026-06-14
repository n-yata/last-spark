import type { StageStory } from '../../types/story';

// Stage 1「崩れた都市」の確定テキスト。docs/story.md のステージ別ビートと「書き方の原則」に沿って③で確定。
// 一人称「私」／敵名を出さない／敵はRAYの観測できる行動だけを根拠にする。

export const STAGE1_STORY: StageStory = {
  stageId: 'stage1',
  intro: ['壊れた町。さびと、つたに覆われている。', 'だれかに見られている気がする。', '私は、なぜここにいるのだろう。'].join('\n'),
  eclipseVoice: 'ここは管理されている。入って来る者は、消す。',
  inner: {
    // 目覚め
    stageStart: '……私は、目を覚ました。',
    // 初の戦闘後
    firstEnemyDefeated: '体が動く。私は、何なのだろう。',
  },
};
