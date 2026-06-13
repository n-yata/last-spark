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
});
