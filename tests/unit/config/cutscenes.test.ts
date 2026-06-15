import { describe, it, expect } from 'vitest';
import { getCutscene } from '../../../src/config/story/cutscenes';
import { CUTSCENE_BACKGROUND, CUTSCENE_TEX } from '../../../src/config/assetKeys';

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

  it('stage1-intro は目覚めの内心と開始テキスト3行を含む(確定版)', () => {
    const cs = getCutscene('stage1-intro')!;
    const texts = cs.lines.map((l) => l.text);
    // 内心「目覚め」。
    expect(texts).toContain('……私は、目を覚ました');
    // 情景＋謎＋「なぜ動いているのか」（命令の起点）。
    expect(texts).toContain('壊れた町。さびと、つたが、すべてを覆っている');
    expect(texts).toContain('だれかに、見張られている');
    expect(texts).toContain('私は、なぜ動いているのだろう。それさえ、分からない');
  });

  it('全カットシーンが専用背景テクスチャを持つ(動的描画フォールバックに依存しない)', () => {
    // stage4-intro/stage5-intro/stage6-ending も SVG 背景に統一済み。
    // ここに列挙したスクリプトは CutsceneScene で画像方式の分岐(textures.exists)を通る。
    const imageBackedKeys = [
      'stage1-intro',
      'stage3-rescue',
      'stage4-intro',
      'stage5-intro',
      'stage6-awakening',
      'stage6-ending',
    ];
    for (const key of imageBackedKeys) {
      expect(getCutscene(key)).toBeDefined();
      expect(CUTSCENE_BACKGROUND[key]).toBeTruthy();
    }
  });

  it('追加カットシーンの背景キーが CUTSCENE_TEX と一致する', () => {
    expect(CUTSCENE_BACKGROUND['stage4-intro']).toBe(CUTSCENE_TEX.stage4Intro);
    expect(CUTSCENE_BACKGROUND['stage5-intro']).toBe(CUTSCENE_TEX.stage5Intro);
    expect(CUTSCENE_BACKGROUND['stage6-awakening']).toBe(CUTSCENE_TEX.stage6Awakening);
    expect(CUTSCENE_BACKGROUND['stage6-ending']).toBe(CUTSCENE_TEX.stage6Ending);
  });

  it('stage3-rescue は TERRA と RAY の交互セリフを含む', () => {
    const cs = getCutscene('stage3-rescue')!;
    const kinds = new Set(cs.lines.map((l) => l.kind));
    expect(kinds.has('terraLine')).toBe(true);
    expect(kinds.has('rayInner')).toBe(true);
  });

  it('刻印で名前が判明するト書きとレイの名前確定セリフを含む', () => {
    const cs = getCutscene('stage3-rescue')!;
    const direction = cs.lines.find((l) => l.kind === 'direction');
    expect(direction?.text).toContain('印');
    // テラが刻印(英字RAY)を読んで「レイ」と名を呼ぶ確定セリフ。
    expect(cs.lines.some((l) => l.kind === 'terraLine' && l.text.includes('レイ'))).toBe(true);
    // 胸の刻印は英字「RAY」のまま残す（名前の由来 ray of light）。
    expect(cs.lines.some((l) => l.kind === 'terraLine' && l.text.includes('R・A・Y'))).toBe(true);
    // レイが自分の名前を受け取る内心。
    expect(cs.lines.some((l) => l.kind === 'rayInner' && l.text.includes('それが、私の名前'))).toBe(
      true,
    );
  });

  it('テラの名乗りセリフが確定版どおり', () => {
    const cs = getCutscene('stage3-rescue')!;
    expect(cs.lines.some((l) => l.text.includes('テラっていうの'))).toBe(true);
  });

  it('stage4-intro が登録され、TERRA と RAY の交互セリフを含む', () => {
    const cs = getCutscene('stage4-intro');
    expect(cs).toBeDefined();
    const kinds = new Set(cs!.lines.map((l) => l.kind));
    expect(kinds.has('terraLine')).toBe(true);
    expect(kinds.has('rayInner')).toBe(true);
  });

  it('stage4-intro は汚染された空気へのテラの反応で始まる(確定版)', () => {
    const cs = getCutscene('stage4-intro')!;
    expect(cs.lines[0]).toEqual({ kind: 'terraLine', text: 'ここ、空気が変。息が、苦しい' });
    expect(cs.lines.some((l) => l.kind === 'rayInner' && l.text.includes('私が守ろうとしている'))).toBe(
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

  it('stage5-intro はあの声が近づく緊張へのテラの怯えで始まる(確定版・敵名を出さない)', () => {
    const cs = getCutscene('stage5-intro')!;
    expect(cs.lines[0]).toEqual({ kind: 'terraLine', text: 'ここ、怖い。あの声が、近い' });
    // 勝てる保証はないが止まれない＝決意の入口をレイの内心で締める。
    expect(cs.lines.some((l) => l.kind === 'rayInner' && l.text.includes('止まれない'))).toBe(true);
  });

  it('stage6-ending が登録され、管理解除→テラ再合流→エンディング本文の順を持つ', () => {
    const cs = getCutscene('stage6-ending');
    expect(cs).toBeDefined();
    const lines = cs!.lines;
    // ステップ1: 管理解除(ナレーション)で始まる。ここで「管理者」の名で締める。
    expect(lines[0]).toEqual({ kind: 'narration', text: '管理者の支配が、解けた' });
    // ステップ2: 待っていたテラと再合流（離脱の一拍を回収）。
    expect(lines.some((l) => l.kind === 'terraLine' && l.text === 'レイ！')).toBe(true);
    expect(lines.some((l) => l.kind === 'rayInner' && l.text.includes('無事だった'))).toBe(true);
    // ステップ: テラとのセリフ交換(確定版)を含む。
    expect(lines.some((l) => l.kind === 'terraLine' && l.text.includes('次は、何する'))).toBe(true);
    expect(lines.some((l) => l.kind === 'rayInner' && l.text.includes('私たちが決める'))).toBe(true);
    // 最後: エンディング本文(ナレーション)で締める。
    const last = lines[lines.length - 1];
    expect(last.kind).toBe('narration');
    expect(last.text).toContain('終わりではなく、始まり。');
  });

  it('stage6-ending は群衆を出さない(人類はほぼ絶滅・二人だけ)', () => {
    // 「建物から人間たちが姿を見せる」群衆描写は再設計で廃止。画面に出せない群衆をテキストで語らない。
    const cs = getCutscene('stage6-ending')!;
    expect(cs.lines.some((l) => l.text.includes('人間たちがすがたを見せる'))).toBe(false);
    expect(cs.lines.some((l) => l.text.includes('すがたを見せる'))).toBe(false);
  });

  it('stage6-ending は描画制約で出せない props(落書き・バリケード等)をト書きで描写しない', () => {
    // 鉄則「見せられないものを語らない」。背景は単色＋図形のみで落書き・バリケード・残骸は画面に出せない。
    // 苦い勝利は props でなく事実・口調で表す（「この星は、まだ傷だらけだ」）。
    const cs = getCutscene('stage6-ending')!;
    const allText = cs.lines.map((l) => l.text).join('');
    expect(allText).not.toContain('落書き');
    expect(allText).not.toContain('バリケード');
    expect(allText).not.toContain('争った跡');
    // 苦さは事実・口調で表現する。
    expect(cs.lines.some((l) => l.kind === 'rayInner' && l.text.includes('まだ傷だらけ'))).toBe(true);
  });

  // stage6-awakening: Stage6 開始時の覚醒演出(支配中枢の核が RAY に反応し最後の力を渡す)。
  // docs/story.md 厳守の検証。冒頭にテラ離脱の一拍(「ここで待ってて」)を置き、以降はレイ単独の演出。
  it('stage6-awakening が登録されている', () => {
    expect(getCutscene('stage6-awakening')).toBeDefined();
  });

  it('旧キー stage5-awakening は登録されていない(リネーム漏れ検出)', () => {
    // stage5-awakening は stage6-awakening へリネームされ完全消滅。getCutscene は undefined を返す。
    expect(getCutscene('stage5-awakening')).toBeUndefined();
  });

  it('stage6-awakening の冒頭はテラ離脱の一拍(「ここで待ってる」)で始まる', () => {
    // TERRA は安全な場所で待機(同行しない)。冒頭でその離脱を一拍描き、以降はレイ単独。
    const cs = getCutscene('stage6-awakening')!;
    expect(cs.lines[0]).toEqual({ kind: 'terraLine', text: 'ここで待ってる。レイ、必ず戻ってきて' });
    // 核の反応＝覚醒のト書きを含む。
    expect(
      cs.lines.some((l) => l.kind === 'direction' && l.text.includes('脈打つ核が、レイに反応する')),
    ).toBe(true);
  });

  it('stage6-awakening は terraLine(離脱の一拍)・rayInner・direction のみで構成される(科学者の語り部なし)', () => {
    // docs/story.md 厳守: 科学者は登場させない(科学者ログ全廃方針)。narration(科学者/システム文)は含まない。
    // 冒頭のテラ離脱(terraLine)以外はレイの内心(rayInner)とト書き(direction)。
    const cs = getCutscene('stage6-awakening')!;
    for (const line of cs.lines) {
      expect(['terraLine', 'rayInner', 'direction']).toContain(line.kind);
    }
  });

  it('stage6-awakening に禁止語(科学者・メモリ・設計者・記録)が含まれない', () => {
    // docs/story.md で科学者設定は廃止済み。これらの語はストーリー世界観を壊す。
    const cs = getCutscene('stage6-awakening')!;
    const allText = cs.lines.map((l) => l.text).join('');
    expect(allText).not.toContain('科学者');
    expect(allText).not.toContain('メモリ');
    expect(allText).not.toContain('設計者');
    expect(allText).not.toContain('記録');
  });
});
