import type { StageStory } from '../../types/story';

// Stage 2「高層廃墟」の確定テキスト。docs/story.md のビートと「書き方の原則」に沿って③で確定。
// 役割＝謎を深める・まだ孤独。敵名は出さない（あの声も自分を名乗らない）。

export const STAGE2_STORY: StageStory = {
  stageId: 'stage2',
  intro: ['なぜか、上が気になる。', '高いビルの、奥へ。', 'この先に、何かがある。'].join('\n'),
  eclipseVoice: 'ここは管理下にある。入って来た者は、消す。',
  inner: {
    // 高層部へ向かいながら（理由の分からない衝動）
    stageStart: '上に、何かある。引き寄せられるのは、なぜだろう。',
  },
};
