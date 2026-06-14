import type { StageStory } from '../../types/story';

// Stage 5「外縁部」の確定テキスト。docs/story.md のビートと「書き方の原則」に沿って③で確定。
// ステージ開始演出シーン(テラ同行)は config/story/cutscenes.ts の 'stage5-intro' を正とする。
// テーマは「決意」。揺らぎを理屈でなく選択で越える。科学者の遺言設定は廃止（科学者は姿を見せない）。
// あの声は観測した「守る行動」を根拠にし、内心（気持ち）は名指ししない。レイは自分の出自を語らない。

export const STAGE5_STORY: StageStory = {
  stageId: 'stage5',
  intro: ['世界を管理するものの、すぐ外。', '機械が、どんどん増えていく。', '私は、もう迷わない。'].join('\n'),
  // 観測した「守る行動」を「故障」と断じる。内心（気持ち）は名指ししない。
  eclipseVoice: 'その個体を守る意味はない。お前の動きは、故障だ。',
  inner: {
    // あの声を聞いた直後の決意。bossIntro の直後に発火する。
    // ※出自は語らず、今の選択を肯定する。
    eclipseReaction: '故障でもいい。私は、この子を守ると決めた。',
    // ボス撃破後の内心「この気持ちは、私のものだ。それでいい」は、強化演出(cutscenes.ts の
    // 'stage5-awakening')の冒頭へ移設した。stage5 は postBossCutsceneKey を持ち finishStageClear を
    // 通らない(enterPostBossCutscene 経由)ため、ここに bossDefeated を置いても発火しない。
  },
};
