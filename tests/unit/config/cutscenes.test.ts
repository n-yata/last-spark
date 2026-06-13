import { describe, it, expect } from 'vitest';
import { getCutscene } from '../../../src/config/story/cutscenes';

// 演出スクリプト(docs/story.md 確定版)の取りこぼし・誤編集を検出するデータ整合テスト。

describe('getCutscene', () => {
  it('未登録キーは undefined', () => {
    expect(getCutscene('unknown')).toBeUndefined();
  });

  it('stage3-rescue が登録されている', () => {
    expect(getCutscene('stage3-rescue')).toBeDefined();
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
});
