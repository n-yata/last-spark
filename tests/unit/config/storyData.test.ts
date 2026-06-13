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

  it('stage3 / stage4 / stage5 のストーリーが登録されている', () => {
    expect(getStageStory('stage3')).toBeDefined();
    expect(getStageStory('stage4')).toBeDefined();
    expect(getStageStory('stage5')).toBeDefined();
  });

  it('未登録ステージは undefined', () => {
    expect(getStageStory('stageX')).toBeUndefined();
  });

  it('stage1 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage1')!;
    expect(s.eclipseVoice).toBe('この区域は管理下にある。侵入を排除する');
    expect(s.intro).toContain('廃墟。錆と蔓草に覆われた、かつての都市。');
    expect(s.logs.early).toContain('起動テスト記録 №001');
    expect(s.logs.preBoss).toContain('外に出るな、まだだ。');
    expect(s.logs.postBoss).toContain('俺が誰かは、言わない。');
    expect(s.inner.stageStart).toBe('……俺は、起きた');
    expect(s.inner.firstEnemyDefeated).toBe('動けた。——俺は、何者だ');
    expect(s.inner.firstLogFound).toBe('誰かが、ここにいた');
  });

  it('stage2 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage2')!;
    expect(s.eclipseVoice).toBe('この構造物の制御権はECLIPSEに帰属する。侵入を排除する');
    expect(s.logs.early).toContain('研究ノート');
    expect(s.logs.preBoss).toContain('ECLIPSEは止まらない。');
    expect(s.logs.postBoss).toContain('感情テスト記録');
    expect(s.inner.stageStart).toBe('上に、何かある。引かれる——なぜ');
    expect(s.inner.firstLogFound).toBe('……誰かが、これを書いた');
    expect(s.inner.firstLogRead).toBe('俺のために、誰かが——');
  });

  it('stage3 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage3')!;
    expect(s.intro).toContain('収容施設。生きている人間の気配がある。');
    expect(s.eclipseVoice).toBe('その個体は管理対象だ。返却せよ');
    expect(s.logs.early).toContain('観察記録');
    expect(s.logs.preBoss).toContain('息子は笑顔が好きだった。');
    expect(s.logs.postBoss).toContain('この世界に、笑顔を取り戻せ');
    expect(s.inner.stageStart).toBe('生きている。人間の、においがする');
    expect(s.inner.terraFound).toBe('……この子が、囚われている');
  });

  it('stage4 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage4')!;
    expect(s.intro).toContain('汚染地帯。大地は朽ち、空気は淀んでいる。');
    expect(s.eclipseVoice).toBe('お前も機械だ。なぜ非効率を選ぶ');
    expect(s.logs.early).toContain('環境データ記録');
    expect(s.logs.preBoss).toContain('自由を奪う権利が、機械にあるか。');
    expect(s.logs.postBoss).toContain('両方できる存在が、必ずいると俺は信じた。');
    expect(s.inner.stageStart).toBe('……これが、人間のしたことか');
    expect(s.inner.eclipseReaction).toBe('ECLIPSEは……正しいのか');
    expect(s.inner.bossDefeated).toBe('それでも——TERRAの顔が、浮かぶ');
  });

  it('stage5 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage5')!;
    expect(s.intro).toContain('ECLIPSEの外縁部。機械の密度が高まる。');
    expect(s.eclipseVoice).toBe('感情は誤作動だ。地球はお前を必要としない');
    expect(s.logs.early).toContain('もうすぐ終わる。お前はここまで来た。');
    expect(s.logs.preBoss).toContain('論理には、感情で答えよ。');
    // postBoss は遺言(クライマックス)。「俺の息子は、もういない。でも、お前がいる」を含む。
    expect(s.logs.postBoss).toContain('俺の息子は、もういない。');
    expect(s.logs.postBoss).toContain('でも、お前がいる。');
    expect(s.inner.firstLogRead).toBe('……この人が、俺を作った');
    expect(s.inner.eclipseReaction).toBe('感情が、力になる。俺には——それがある');
    expect(s.inner.bossDefeated).toBe('俺は、感じるために作られた。それだけで——十分だ');
  });

  it('全3スロットのログ本文が確定版として存在する', () => {
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

  it('stage1 / stage2 / stage4 / stage5 はボス後演出を持たない(撃破→(ボス後ログ)→クリア)', () => {
    for (const id of ['stage1', 'stage2', 'stage4', 'stage5']) {
      const s = getStageData(id);
      expect(s.postBossCutsceneKey).toBeUndefined();
      expect(s.cage).toBeUndefined();
    }
  });

  it('stage2→stage3→stage4→stage5 と連結している', () => {
    expect(getStageData('stage2').nextStageId).toBe('stage3');
    expect(getStageData('stage3').nextStageId).toBe('stage4');
    expect(getStageData('stage4').nextStageId).toBe('stage5');
  });

  it('stage5 は飛行型(使者)ボス・開始演出を持ち、現状は最終ステージ(stage6 未実装のため nextStageId なし)', () => {
    const s = getStageData('stage5');
    expect(s.bossKind).toBe('flying');
    expect(s.bossVariant).toBe('envoy');
    expect(s.introCutsceneKey).toBe('stage5-intro');
    // stage6 の実体ができるまで未接続にして、未実装ステージへの遷移(stage1 フォールバック)を防ぐ。
    expect(s.nextStageId).toBeUndefined();
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

  it('stage3 の postBoss ログはアリーナ内(ボストリガーより後ろ)に置かれている', () => {
    const stage = getStageData('stage3');
    const postBoss = (stage.logTriggers ?? []).find((t) => t.slot === 'postBoss');
    expect(postBoss).toBeDefined();
    expect(postBoss!.x).toBeGreaterThan(stage.bossTriggerX);
    // ケージはさらに奥(ボス後ログを拾ってからケージへ向かう動線)。
    expect(stage.cage!.x).toBeGreaterThan(postBoss!.x);
  });
});
