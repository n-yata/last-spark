import type { StageStory } from '../../types/story';

// Stage 1「崩れた都市」の確定テキスト。docs/story.md「テキストコンテンツ(確定版)」より転記。
// 本文は story.md を正本とし、ここでは改変しない。

export const STAGE1_STORY: StageStory = {
  stageId: 'stage1',
  intro: ['廃墟。錆と蔓草に覆われた、かつての都市。', 'ここは管理下にある。', '俺は——なぜ、ここにいる。'].join(
    '\n',
  ),
  eclipseVoice: 'この区域は管理下にある。侵入を排除する',
  logs: {
    early: [
      '起動テスト記録 №001',
      'すべてのシステムは正常だ。',
      'ただ——こいつは泣いた。機械が、泣いた。',
      '……俺は、正しいものを作ったかもしれない',
    ].join('\n'),
    preBoss: ['外に出るな、まだだ。', '奴らはどこにでもいる。', 'でも、お前なら——（残りは焼けて判読不能）'].join(
      '\n',
    ),
    postBoss: ['俺が誰かは、言わない。', 'でも、お前に頼みたいことがある。', '——続きは、次のログに残す'].join('\n'),
  },
  inner: {
    // 目覚め
    stageStart: '……俺は、起きた',
    // 廃墟を初めて見て(=最初のログ=「誰かがいた」発見の瞬間に重ねる)
    firstLogFound: '誰かが、ここにいた',
    // 初の戦闘後
    firstEnemyDefeated: '動けた。——俺は、何者だ',
  },
};
