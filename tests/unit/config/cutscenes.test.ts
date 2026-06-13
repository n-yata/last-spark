import { describe, it, expect } from 'vitest';
import { getCutscene } from '../../../src/config/story/cutscenes';
import { CUTSCENE_BACKGROUND } from '../../../src/config/assetKeys';

// 演出スクリプト(docs/story.md 確定版)の取りこぼし・誤編集を検出するデータ整合テスト。

describe('getCutscene', () => {
  it('未登録キーは undefined', () => {
    expect(getCutscene('unknown')).toBeUndefined();
  });

  it('stage3-rescue が登録されている', () => {
    expect(getCutscene('stage3-rescue')).toBeDefined();
  });

  it('stage1-intro が登録されている', () => {
    expect(getCutscene('stage1-intro')).toBeDefined();
  });

  it('stage1-intro は目覚めの内心と開始テキスト3行を含む(story.md 確定版)', () => {
    const cs = getCutscene('stage1-intro')!;
    const texts = cs.lines.map((l) => l.text);
    // 内心一覧「目覚め」。
    expect(texts).toContain('……俺は、起きた');
    // ステージ開始テキスト Stage 1 の確定3行。
    expect(texts).toContain('廃墟。錆と蔓草に覆われた、かつての都市。');
    expect(texts).toContain('ここは管理下にある。');
    expect(texts).toContain('俺は——なぜ、ここにいる。');
  });

  it('登録済み演出すべてに背景テクスチャが対応づけられている', () => {
    for (const key of ['stage1-intro', 'stage3-rescue']) {
      expect(getCutscene(key)).toBeDefined();
      expect(CUTSCENE_BACKGROUND[key]).toBeTruthy();
    }
  });

  it('stage3-rescue は TERRA と RAY の交互セリフを含む', () => {
    const cs = getCutscene('stage3-rescue')!;
    const kinds = new Set(cs.lines.map((l) => l.kind));
    expect(kinds.has('terraLine')).toBe(true);
    expect(kinds.has('rayInner')).toBe(true);
  });

  it('刻印で名前が判明するト書きと RAY の名前確定セリフを含む', () => {
    const cs = getCutscene('stage3-rescue')!;
    const direction = cs.lines.find((l) => l.kind === 'direction');
    expect(direction?.text).toContain('刻印');
    // TERRA が刻印を読んで「RAY」と名を呼ぶ確定セリフ。
    expect(cs.lines.some((l) => l.kind === 'terraLine' && l.text.includes('RAY'))).toBe(true);
    // RAY が自分の名前を受け取る内心。
    expect(cs.lines.some((l) => l.kind === 'rayInner' && l.text.includes('それが、俺の名前'))).toBe(
      true,
    );
  });

  it('TERRA の名乗りセリフが確定版どおり', () => {
    const cs = getCutscene('stage3-rescue')!;
    expect(cs.lines.some((l) => l.text.includes('TERRAっていうの'))).toBe(true);
  });

  it('stage4-intro が登録され、TERRA と RAY の交互セリフを含む', () => {
    const cs = getCutscene('stage4-intro');
    expect(cs).toBeDefined();
    const kinds = new Set(cs!.lines.map((l) => l.kind));
    expect(kinds.has('terraLine')).toBe(true);
    expect(kinds.has('rayInner')).toBe(true);
  });

  it('stage4-intro は汚染された空気への TERRA の反応で始まる(確定版)', () => {
    const cs = getCutscene('stage4-intro')!;
    expect(cs.lines[0]).toEqual({ kind: 'terraLine', text: 'ここ、空気が変。息が苦しい' });
    expect(cs.lines.some((l) => l.kind === 'rayInner' && l.text.includes('俺が守ろうとしている'))).toBe(
      true,
    );
  });

  it('stage5-intro が登録され、TERRA と RAY の交互セリフを含む', () => {
    const cs = getCutscene('stage5-intro');
    expect(cs).toBeDefined();
    const kinds = new Set(cs!.lines.map((l) => l.kind));
    expect(kinds.has('terraLine')).toBe(true);
    expect(kinds.has('rayInner')).toBe(true);
  });

  it('stage5-intro は ECLIPSE が近づく緊張への TERRA の怯えで始まる(確定版)', () => {
    const cs = getCutscene('stage5-intro')!;
    expect(cs.lines[0]).toEqual({ kind: 'terraLine', text: 'ここ、怖い。ECLIPSEが近い' });
    // 勝てる保証はないが止まれない——決意の入口を RAY の内心で締める。
    expect(cs.lines.some((l) => l.kind === 'rayInner' && l.text.includes('止まれない'))).toBe(true);
  });

  it('stage6-ending が登録され、管理解除→人間描写→TERRAセリフ→エンディング本文の順を持つ', () => {
    const cs = getCutscene('stage6-ending');
    expect(cs).toBeDefined();
    const lines = cs!.lines;
    // ステップ1: 管理解除(ナレーション)で始まる。
    expect(lines[0]).toEqual({ kind: 'narration', text: 'ECLIPSEの管理が、解除された' });
    // ステップ2: 人間を初めて直接描写するト書きを含む。
    expect(lines.some((l) => l.kind === 'direction' && l.text.includes('人間たちが姿を見せる'))).toBe(true);
    // ステップ3: TERRA とのセリフ交換(確定版)を含む。
    expect(lines.some((l) => l.kind === 'terraLine' && l.text.includes('次は何する'))).toBe(true);
    expect(lines.some((l) => l.kind === 'rayInner' && l.text.includes('俺たちが、決める'))).toBe(true);
    // ステップ4: エンディング本文(ナレーション)で締める。
    const last = lines[lines.length - 1];
    expect(last.kind).toBe('narration');
    expect(last.text).toContain('終わりではなく、始まり。');
  });

  it('stage6-ending は苦い勝利(争いの痕跡)のト書きを含む', () => {
    const cs = getCutscene('stage6-ending')!;
    expect(cs.lines.some((l) => l.kind === 'direction' && l.text.includes('争った痕跡'))).toBe(true);
  });
});
