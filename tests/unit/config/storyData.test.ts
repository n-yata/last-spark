import { describe, it, expect } from 'vitest';
import { getStageStory } from '../../../src/config/story';
import { getStageData } from '../../../src/config/stages';
import { getCutscene } from '../../../src/config/story/cutscenes';

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

  it('stage1 の確定テキストが③確定版と一致する', () => {
    const s = getStageStory('stage1')!;
    expect(s.eclipseVoice).toBe('ここは管理されている。入って来る者は、消す。');
    expect(s.intro).toContain('壊れた町。さびと、つたに覆われている。');
    expect(s.inner.stageStart).toBe('……私は、目を覚ました。');
    expect(s.inner.firstEnemyDefeated).toBe('体が動く。私は、何なのだろう。');
  });

  it('stage2 の確定テキストが③確定版と一致する', () => {
    const s = getStageStory('stage2')!;
    expect(s.eclipseVoice).toBe('ここは管理下にある。入って来た者は、消す。');
    expect(s.inner.stageStart).toBe('上に、何かある。引き寄せられるのは、なぜだろう。');
  });

  it('stage3 の確定テキストが③確定版と一致する', () => {
    const s = getStageStory('stage3')!;
    expect(s.intro).toContain('人を閉じ込める場所。');
    // ボス前時点ではまだ奪っていないので「返せ」ではなく「渡さない」。
    expect(s.eclipseVoice).toBe('それは、我々のものだ。渡さない。');
    expect(s.inner.stageStart).toBe('生きている。誰か、いる。');
    // ボス前の気配。まだテラとは分からない。
    expect(s.inner.terraFound).toBe('奥に、誰かいる。閉じ込められている。');
  });

  it('stage4 の確定テキストが③確定版と一致する', () => {
    const s = getStageStory('stage4')!;
    expect(s.intro).toContain('汚れた土地。草も枯れ、空気もにごっている。');
    expect(s.eclipseVoice).toBe('お前も機械だ。なぜ、星を殺す者を守る。');
    expect(s.inner.stageStart).toBe('……これが、人間のしたことか。');
    // 「あの声は正しいか」ではない＝レイは敵の名も主張も知らない。
    expect(s.inner.eclipseReaction).toBe('私が守る人間が、この星をこうした。私は、間違っているのだろうか。');
    expect(s.inner.bossDefeated).toBe('それでも、テラの顔が浮かぶ。');
  });

  it('stage5 の確定テキストが③確定版と一致する', () => {
    const s = getStageStory('stage5')!;
    expect(s.intro).toContain('世界を管理するものの、すぐ外。');
    // 内心（気持ち）を名指しせず、観測した「守る行動」を故障と断じる。
    expect(s.eclipseVoice).toBe('その個体を守る意味はない。お前の動きは、故障だ。');
    expect(s.inner.eclipseReaction).toBe('故障でもいい。私は、この子を守ると決めた。');
    // ボス撃破後内心は stage5.ts から強化演出(stage5-awakening)冒頭の rayInner へ移設された。
    // stage5 は postBossCutsceneKey を持ち finishStageClear を通らないため、
    // 撃破内心は演出スクリプトの中で見せる設計になっている。
    // 出自（なぜ作られたか）は語らない。
    const awakening = getCutscene('stage5-awakening')!;
    const firstRayInner = awakening.lines.find((l) => l.kind === 'rayInner');
    expect(firstRayInner?.text).toBe('この気持ちは、私のものだ。それでいい');
  });

  it('stage6 の確定テキストが③確定版と一致する', () => {
    const s = getStageStory('stage6')!;
    expect(s.intro).toContain('一番奥の部屋。');
    expect(s.eclipseVoice).toBe('お前は、星を殺す者の味方をする。それは、星への裏切りだ。');
    expect(s.inner.stageStart).toBe('ここだ。ここで、終わる。');
    expect(s.inner.eclipseReaction).toBe('これが、私の答えだ。');
    expect(s.inner.bossDefeated).toBe('……終わった。');
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

  it('cage を伴う救出演出(postBoss)を持つのは stage3 のみ: 他ステージは cage を持たない', () => {
    // stage3 は救出フロー(cage あり)。stage5 はボス撃破後強化演出を持つが cage は持たない。
    // stage1 / stage2 / stage4 / stage6 はボス後演出自体を持たない。
    for (const id of ['stage1', 'stage2', 'stage4', 'stage6']) {
      const s = getStageData(id);
      expect(s.postBossCutsceneKey).toBeUndefined();
      expect(s.cage).toBeUndefined();
    }
  });

  it('stage5 は cage を持たない強化演出(postBossCutsceneKey)を持つ', () => {
    // stage5-awakening: 休眠コアとの共鳴による強化演出。救出フロー(cage)ではない。
    const s = getStageData('stage5');
    expect(s.postBossCutsceneKey).toBe('stage5-awakening');
    expect(s.cage).toBeUndefined();
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
