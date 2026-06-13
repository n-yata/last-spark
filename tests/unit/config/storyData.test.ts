import { describe, it, expect } from 'vitest';
import { getStageStory } from '../../../src/config/story';
import { getStageData } from '../../../src/config/stage1';

// 確定テキスト(docs/story.md)の取りこぼし・誤編集を検出するデータ整合テスト。
// 表示そのものは実機確認だが、データが確定版どおりであることはここで保証する。

describe('getStageStory', () => {
  it('stage1 / stage2 のストーリーが登録されている', () => {
    expect(getStageStory('stage1')).toBeDefined();
    expect(getStageStory('stage2')).toBeDefined();
  });

  it('stage3 / stage4 / stage5 / stage6 のストーリーが登録されている', () => {
    expect(getStageStory('stage3')).toBeDefined();
    expect(getStageStory('stage4')).toBeDefined();
    expect(getStageStory('stage5')).toBeDefined();
    expect(getStageStory('stage6')).toBeDefined();
  });

  it('未登録ステージは undefined', () => {
    expect(getStageStory('stageX')).toBeUndefined();
  });

  it('stage1 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage1')!;
    expect(s.eclipseVoice).toBe('ここは、かんりされている。入ってくるものは、けす');
    expect(s.intro).toContain('こわれた町。さびと、つる草におおわれた、むかしの町。');
    expect(s.logs.early).toContain('うごきテストのきろく №001');
    expect(s.logs.preBoss).toContain('まだ外に出るな。');
    expect(s.logs.postBoss).toContain('おれがだれかは、言わない。');
    expect(s.inner.stageStart).toBe('……おれは、目をさました');
    expect(s.inner.firstEnemyDefeated).toBe('動けた。——おれは、何者だ');
    expect(s.inner.firstLogFound).toBe('だれかが、ここにいた');
  });

  it('stage2 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage2')!;
    expect(s.eclipseVoice).toBe('このたてものは、ECLIPSEのものだ。入ってくるものは、けす');
    expect(s.logs.early).toContain('研究ノート');
    expect(s.logs.preBoss).toContain('ECLIPSEは止まらない。');
    expect(s.logs.postBoss).toContain('気もちのテストのきろく');
    expect(s.inner.stageStart).toBe('上に、何かある。引きよせられる——どうして');
    expect(s.inner.firstLogFound).toBe('……だれかが、これを書いた');
    expect(s.inner.firstLogRead).toBe('おれのために、だれかが——');
  });

  it('stage3 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage3')!;
    expect(s.intro).toContain('人をとじこめる、しせつ。生きている人の、けはいがする。');
    expect(s.eclipseVoice).toBe('そいつは、おれたちのものだ。かえせ');
    expect(s.logs.early).toContain('かんさつのきろく');
    expect(s.logs.preBoss).toContain('息子は、えがおがすきだった。');
    expect(s.logs.postBoss).toContain('この世界に、えがおをとりもどせ');
    expect(s.inner.stageStart).toBe('生きている。人の、においがする');
    expect(s.inner.terraFound).toBe('……この子が、とじこめられている');
  });

  it('stage4 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage4')!;
    expect(s.intro).toContain('よごれた土地。大地はかれ、空気はにごっている。');
    expect(s.eclipseVoice).toBe('お前もきかいだ。なぜ、むだなことをえらぶ');
    expect(s.logs.early).toContain('かんきょうデータのきろく');
    expect(s.logs.preBoss).toContain('自由をうばうけんりが、きかいにあるか。');
    expect(s.logs.postBoss).toContain('その両方ができるものが、かならずいると、おれはしんじた。');
    expect(s.inner.stageStart).toBe('……これが、人間のしたことか');
    expect(s.inner.eclipseReaction).toBe('ECLIPSEは……正しいのか');
    expect(s.inner.bossDefeated).toBe('それでも——TERRAの顔が、うかぶ');
  });

  it('stage5 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage5')!;
    expect(s.intro).toContain('ECLIPSEのそとがわ。きかいが、どんどん多くなる。');
    expect(s.eclipseVoice).toBe('気もちは、こしょうだ。地球は、お前をいらない');
    expect(s.logs.early).toContain('もうすぐ終わる。お前は、ここまで来た。');
    expect(s.logs.preBoss).toContain('りくつには、気もちで答えろ。');
    // postBoss は遺言(クライマックス)。「おれの息子は、もういない。でも、お前がいる」を含む。
    expect(s.logs.postBoss).toContain('おれの息子は、もういない。');
    expect(s.logs.postBoss).toContain('でも、お前がいる。');
    expect(s.inner.firstLogRead).toBe('……この人が、おれを作った');
    expect(s.inner.eclipseReaction).toBe('気もちが、力になる。おれには——それがある');
    expect(s.inner.bossDefeated).toBe('おれは、感じるために作られた。それだけで——十分だ');
  });

  it('stage6 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage6')!;
    expect(s.intro).toContain('いちばんおくのへや。ここが、ECLIPSEのまんなかだ。');
    expect(s.eclipseVoice).toBe('地球を守るために、お前をけす');
    // Stage 6 は序盤ログのみ(科学者の最後のメッセージ)。
    expect(s.logs.early).toContain('RAY、お前をほこりに思う');
    expect(s.logs.preBoss).toBeUndefined();
    expect(s.logs.postBoss).toBeUndefined();
    expect(s.inner.stageStart).toBe('ここだ。ここで——終わる');
    expect(s.inner.eclipseReaction).toBe('これが、おれの答えだ');
    expect(s.inner.bossDefeated).toBe('……終わった');
  });

  it('stage1〜5 は全3スロットのログ本文が確定版として存在する(stage6 は序盤のみ)', () => {
    for (const id of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']) {
      const s = getStageStory(id)!;
      expect(s.logs.early).toBeTruthy();
      expect(s.logs.preBoss).toBeTruthy();
      expect(s.logs.postBoss).toBeTruthy();
    }
  });
});

describe('ボス後演出フローのステージ条件', () => {
  it('stage3 はボス後演出(救出)を持つ: postBossCutsceneKey と cage が定義されている', () => {
    const s = getStageData('stage3');
    expect(s.postBossCutsceneKey).toBe('stage3-rescue');
    expect(s.cage).toBeDefined();
    // stage3 は重装ミサイル型(warden)。固有設定・リグは WardenBoss が内包するため、
    // bossConfig ではなく系統(bossKind)で識別する。
    expect(s.bossKind).toBe('warden');
  });

  it('stage1 / stage2 / stage4 / stage5 / stage6 はボス後演出(救出)を持たない', () => {
    for (const id of ['stage1', 'stage2', 'stage4', 'stage5', 'stage6']) {
      const s = getStageData(id);
      expect(s.postBossCutsceneKey).toBeUndefined();
      expect(s.cage).toBeUndefined();
    }
  });

  it('stage2→stage3→stage4→stage5→stage6 と連結している', () => {
    expect(getStageData('stage2').nextStageId).toBe('stage3');
    expect(getStageData('stage3').nextStageId).toBe('stage4');
    expect(getStageData('stage4').nextStageId).toBe('stage5');
    expect(getStageData('stage5').nextStageId).toBe('stage6');
  });

  it('stage5 は飛行型(使者)ボス・開始演出を持ち、stage6 へ連結している', () => {
    const s = getStageData('stage5');
    expect(s.bossKind).toBe('flying');
    expect(s.bossVariant).toBe('envoy');
    expect(s.introCutsceneKey).toBe('stage5-intro');
    expect(s.nextStageId).toBe('stage6');
  });

  it('stage6 はコア型ラスボス・最終ステージで、撃破後はエンディング演出へ分岐する', () => {
    const s = getStageData('stage6');
    expect(s.bossKind).toBe('core');
    expect(s.endingCutsceneKey).toBe('stage6-ending');
    // 最終ステージ: 次ステージなし(未実装ステージへの遷移=stage1 フォールバックを防ぐ)。
    expect(s.nextStageId).toBeUndefined();
  });
});

describe('ステージ開始演出フローのステージ条件', () => {
  it('stage1 は開始演出を専用シーンで再生する: introCutsceneKey が定義されている', () => {
    expect(getStageData('stage1').introCutsceneKey).toBe('stage1-intro');
  });

  it('stage2 / stage3 は従来どおり開始テキスト(StoryOverlay)で開始する: introCutsceneKey 未定義', () => {
    for (const id of ['stage2', 'stage3']) {
      expect(getStageData(id).introCutsceneKey).toBeUndefined();
    }
  });

  it('stage1 は演出が開始テキストを兼ねる(introCutsceneCoversStartText): 演出後に開始テキストを重ねない', () => {
    // 演出スクリプト(stage1-intro)が intro + 「目覚め」の内心そのものなので、
    // 演出完了後に開始テキストを出すと同一文が二重表示になる。これを抑止するフラグ。
    expect(getStageData('stage1').introCutsceneCoversStartText).toBe(true);
  });

  it('stage4 / stage5 は演出と開始テキストが別内容: introCutsceneCoversStartText を立てない(演出→開始テキスト)', () => {
    for (const id of ['stage4', 'stage5']) {
      const s = getStageData(id);
      expect(s.introCutsceneKey).toBeDefined();
      expect(s.introCutsceneCoversStartText).toBeFalsy();
    }
  });
});

describe('ログトリガー配置', () => {
  it('stage1 / stage2 / stage3 / stage4 / stage5 に early・preBoss のトリガーが配置されている', () => {
    for (const id of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']) {
      const slots = (getStageData(id).logTriggers ?? []).map((t) => t.slot);
      expect(slots).toContain('early');
      expect(slots).toContain('preBoss');
    }
  });

  it('preBoss トリガーはボストリガー手前に置かれている', () => {
    for (const id of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']) {
      const stage = getStageData(id);
      const preBoss = (stage.logTriggers ?? []).find((t) => t.slot === 'preBoss');
      expect(preBoss).toBeDefined();
      expect(preBoss!.x).toBeLessThan(stage.bossTriggerX);
    }
  });

  it('stage4 / stage5 はボス後演出を持たないため、postBoss ログもボストリガー手前(走行中に拾える位置)に置かれている', () => {
    for (const id of ['stage4', 'stage5']) {
      const stage = getStageData(id);
      const postBoss = (stage.logTriggers ?? []).find((t) => t.slot === 'postBoss');
      expect(postBoss).toBeDefined();
      expect(postBoss!.x).toBeLessThan(stage.bossTriggerX);
    }
  });

  it('stage6 は序盤ログのみ(ボス前・ボス後なし)で、ボストリガー手前に置かれている', () => {
    const stage = getStageData('stage6');
    const slots = (stage.logTriggers ?? []).map((t) => t.slot);
    expect(slots).toEqual(['early']);
    const early = (stage.logTriggers ?? []).find((t) => t.slot === 'early');
    expect(early!.x).toBeLessThan(stage.bossTriggerX);
  });

  it('stage3 の postBoss ログはアリーナ内(ボストリガーより後ろ)に置かれている', () => {
    const stage = getStageData('stage3');
    const postBoss = (stage.logTriggers ?? []).find((t) => t.slot === 'postBoss');
    expect(postBoss).toBeDefined();
    expect(postBoss!.x).toBeGreaterThan(stage.bossTriggerX);
    // ケージはさらに奥(ボス後ログを拾ってからケージへ向かう動線)。
    expect(stage.cage!.x).toBeGreaterThan(postBoss!.x);
  });
});
