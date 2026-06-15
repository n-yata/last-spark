import { describe, it, expect } from 'vitest';
import { getStageStory } from '../../../src/config/story';
import { getStageData } from '../../../src/config/stages';

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

  it('stage1 の確定テキストが確定版と一致する', () => {
    const s = getStageStory('stage1')!;
    // 無関心・侵入者＝エラー扱い。
    expect(s.eclipseVoice).toBe('ここは管理されている。入る者は、消す。');
    expect(s.intro).toContain('壊れた町。さびと、つたに覆われている。');
    expect(s.inner.stageStart).toBe('……私は、目を覚ました。');
    // 命令の衝動だけで動く＝心が分からない、をテーマの起点に。
    expect(s.inner.firstEnemyDefeated).toBe('体が、勝手に動く。これは、命令なのだろうか。');
  });

  it('stage2 の確定テキストが確定版と一致する', () => {
    const s = getStageStory('stage2')!;
    // 態度は「観測」へ（単調反復をやめる）。
    expect(s.eclipseVoice).toBe('まだ動いているのか。お前は、ここにいてはいけない。下がれ。');
    expect(s.inner.stageStart).toBe('上に、何かある。引き寄せられるのは、なぜだろう。');
    // 伏線の起点。ボス接近時に「生きた気配」を感じる（S3執着→S5回収へ繋ぐ。"温かい"でテラ／光を匂わせる）。
    expect(s.inner.terraFound).toBe('この奥に、生きた気配。ひとつだけ、温かい。');
  });

  it('stage3 の確定テキストが確定版と一致する', () => {
    const s = getStageStory('stage3')!;
    expect(s.intro).toContain('人を、閉じ込めていた場所。');
    // 所有・執着＝標的の伏線。まだ奪っていないので「返せ」ではなく「返さない」。
    expect(s.eclipseVoice).toBe('それは、我々のものだ。返さない。');
    expect(s.inner.stageStart).toBe('ここに、だれか残っている。たしかに、生きている。');
    // ボス前の気配。まだテラとは分からない。
    expect(s.inner.terraFound).toBe('奥の檻に、小さな影。閉じ込められている。');
  });

  it('stage4 の確定テキストが確定版と一致する', () => {
    const s = getStageStory('stage4')!;
    // intro は情景に限定（カットシーンの「人間が壊した」を繰り返さない＝三重の繰り返し解消）。
    expect(s.intro).toContain('枯れた大地。草も水も、にごっている。');
    // 詰問で煽る。観測した「守る行動」が根拠。
    expect(s.eclipseVoice).toBe('お前は、星を殺す者を守る。なぜだ。');
    // 開始内心は情景の繰り返しでなく「守る意味があるのか」という問いへ前進。
    expect(s.inner.stageStart).toBe('こんな者たちを、守る意味はあるのだろうか。');
    // 崩せない論理に答えられない＝葛藤の山場。
    expect(s.inner.eclipseReaction).toBe('その問いに、私は答えられない。');
    expect(s.inner.bossDefeated).toBe('それでも、あの子の顔が浮かぶ。');
  });

  it('stage5 の確定テキストが確定版と一致する（転＝テラが最後の標的）', () => {
    const s = getStageStory('stage5')!;
    expect(s.intro).toContain('世界を管理するものの、すぐ外。');
    expect(s.inner.stageStart).toBe('もう、迷わない。私は、この子を連れて進む。');
    // 【転】の予感。ボス接近時に、あの声がテラだけを見ていることに気づく。
    expect(s.inner.terraFound).toBe('あの声が、テラだけを見ている。まさか——');
    // 名指し＝伏線回収（最後の汚染源）＋「私と同じ光」の匂わせ＋故障扱い（選べるレイをエラー扱い）。
    expect(s.eclipseVoice).toBe('お前がかばう、その個体。それが、最後の汚染源だ。引き渡せ。\nお前の核は、私と同じ光。なのに、お前は壊れている。');
    // 過去→未来へ転換した決意。出自（なぜ作られたか）は語らない。
    expect(s.inner.eclipseReaction).toBe('故障でもいい。最後の一人だから、私が守る。私が、そう決めた。');
    // ボス撃破後内心は stage5.ts の inner.bossDefeated で finishStageClear 経由で表示される。
    expect(s.inner.bossDefeated).toBe('この気持ちは、私のものだ。それでいい。');
  });

  it('stage6 の確定テキストが確定版と一致する（決着・管理者の自己定義）', () => {
    const s = getStageStory('stage6')!;
    expect(s.intro).toContain('一番奥の部屋。');
    // ここで初めて自らを「管理者」と名乗り、決着を突きつける。
    expect(s.eclipseVoice).toBe('私は管理者。この星を管理する者だ。\nお前は人間をかばう。それは、星への裏切りだ。');
    // テーマ「選ぶこと」＝自分で選んだ道。
    expect(s.inner.stageStart).toBe('テラのために。これは、私が選んだ道だ。');
    // 論破せず、行動で答える。
    expect(s.inner.eclipseReaction).toBe('言い返さない。守ることが、私の答えだ。');
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
    // stage3 は救出フロー(cage あり)。stage5 は通常クリア経路(cage なし)。
    // stage1 / stage2 / stage4 / stage6 はボス後演出自体を持たない。
    for (const id of ['stage1', 'stage2', 'stage4', 'stage6']) {
      const s = getStageData(id);
      expect(s.postBossCutsceneKey).toBeUndefined();
      expect(s.cage).toBeUndefined();
    }
  });

  it('postBossCutsceneKey を持つのは stage3 のみ: stage5 は通常クリア経路へ復帰', () => {
    // stage5 は強化演出(postBossCutsceneKey)を持たず、finishStageClear の通常経路を通る。
    // RAY の攻撃強化は stage6 開始の覚醒演出(introCutsceneKey)で獲得する設計に変更済み。
    // 全ステージ走査: postBossCutsceneKey を持つのは救出フロー(cage あり)の stage3 のみ。
    const stage5 = getStageData('stage5');
    expect(stage5.postBossCutsceneKey).toBeUndefined();
    expect(stage5.cage).toBeUndefined();
    // 全ステージを走査して postBossCutsceneKey の保持者が stage3 のみであることを保証する。
    for (const id of ['stage1', 'stage2', 'stage4', 'stage5', 'stage6']) {
      expect(getStageData(id).postBossCutsceneKey).toBeUndefined();
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

  it('stage4 / stage5 / stage6 は演出と開始テキストが別内容: introCutsceneCoversStartText を立てない(演出→開始テキスト)', () => {
    // stage6 は覚醒演出(stage6-awakening)と開始テキスト(中枢到達の決意)を両方見せる設計。
    // introCutsceneCoversStartText は立てない(stage4/5 と同列)。
    for (const id of ['stage4', 'stage5', 'stage6']) {
      const s = getStageData(id);
      expect(s.introCutsceneKey).toBeDefined();
      expect(s.introCutsceneCoversStartText).toBeFalsy();
    }
  });

  it('stage6 は stage6-awakening の開始演出を持つ', () => {
    // Stage6 開始時に覚醒演出を再生し、RAY が最後の力を受け取る(攻撃強化獲得)。
    const s = getStageData('stage6');
    expect(s.introCutsceneKey).toBe('stage6-awakening');
  });
});
