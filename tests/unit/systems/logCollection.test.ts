import { describe, it, expect } from 'vitest';
import type { LogSlot } from '../../../src/types/story';
import {
  LOG_SLOT_ORDER,
  logKey,
  buildLogEntries,
  logRowLabel,
} from '../../../src/systems/logCollection';

// テスト用のログ母集合。stage1 は 3 本、stage2 は 1 本、stage3 はログ無し(undefined)。
const STAGE_IDS = ['stage1', 'stage2', 'stage3'];
const LOGS: Record<string, Partial<Record<LogSlot, string>> | undefined> = {
  stage1: {
    early: '起動テスト\nすべて正常',
    preBoss: '外に出るな',
    postBoss: '続きは次のログに',
  },
  stage2: { early: '研究ノート\n息子の誕生日に' },
  stage3: undefined,
};
const getLogs = (stageId: string) => LOGS[stageId];

describe('logKey', () => {
  it('"stageId:slot" 形式のキーを返す(SaveManager と同形式)', () => {
    expect(logKey('stage6', 'early')).toBe('stage6:early');
  });
});

describe('LOG_SLOT_ORDER', () => {
  it('early → preBoss → postBoss の固定順である', () => {
    expect(LOG_SLOT_ORDER).toEqual(['early', 'preBoss', 'postBoss']);
  });
});

describe('buildLogEntries', () => {
  it('stageIds × スロット順で、実在するログだけを通し番号付きで列挙する', () => {
    const entries = buildLogEntries(STAGE_IDS, getLogs, []);
    // stage1(3本) + stage2(1本) = 4本。stage3 は logs 無しなので含まれない。
    expect(entries.map((e) => e.key)).toEqual([
      'stage1:early',
      'stage1:preBoss',
      'stage1:postBoss',
      'stage2:early',
    ]);
    // index は 1 始まりの通し番号。
    expect(entries.map((e) => e.index)).toEqual([1, 2, 3, 4]);
  });

  it('スロットは LOG_SLOT_ORDER の順で並ぶ(定義順に依存しない)', () => {
    const shuffled = { postBoss: 'C', early: 'A', preBoss: 'B' };
    const entries = buildLogEntries(['stageX'], () => shuffled, []);
    expect(entries.map((e) => e.slot)).toEqual(['early', 'preBoss', 'postBoss']);
  });

  it('collectedKeys に含まれるログのみ collected=true になる', () => {
    const entries = buildLogEntries(STAGE_IDS, getLogs, ['stage1:preBoss', 'stage2:early']);
    const collected = entries.filter((e) => e.collected).map((e) => e.key);
    expect(collected).toEqual(['stage1:preBoss', 'stage2:early']);
  });

  it('未取得ログも母集合に含まれ、本文を保持する(画面側で表示を制御する)', () => {
    const entries = buildLogEntries(STAGE_IDS, getLogs, []);
    const early = entries.find((e) => e.key === 'stage1:early');
    expect(early?.collected).toBe(false);
    expect(early?.body).toBe('起動テスト\nすべて正常');
  });

  it('存在しない収集キーは無視され、母集合は logs 由来のみになる(データ不整合耐性)', () => {
    const entries = buildLogEntries(STAGE_IDS, getLogs, ['stage9:early', 'ghost:key']);
    expect(entries).toHaveLength(4);
    expect(entries.every((e) => !e.collected)).toBe(true);
  });

  it('全ステージがログ無しなら空配列を返す', () => {
    const entries = buildLogEntries(STAGE_IDS, () => undefined, ['stage1:early']);
    expect(entries).toEqual([]);
  });
});

describe('logRowLabel', () => {
  it('取得済みは「No.NN  本文1行目」を返す', () => {
    const entries = buildLogEntries(STAGE_IDS, getLogs, ['stage1:early']);
    const early = entries.find((e) => e.key === 'stage1:early')!;
    expect(logRowLabel(early)).toBe('No.01  起動テスト');
  });

  it('未取得は slot 名を出さずロック表示にする(ネタバレ防止)', () => {
    const entries = buildLogEntries(STAGE_IDS, getLogs, []);
    const preBoss = entries.find((e) => e.key === 'stage1:preBoss')!;
    const label = logRowLabel(preBoss);
    expect(label).toBe('No.02  ??? ―― 未取得');
    // slot 名・本文が漏れていないこと。
    expect(label).not.toContain('preBoss');
    expect(label).not.toContain('外に出るな');
  });

  it('index が二桁ゼロ埋めされる', () => {
    const entries = buildLogEntries(STAGE_IDS, getLogs, ['stage2:early']);
    const e = entries.find((x) => x.key === 'stage2:early')!;
    // stage2:early は通し番号 4 → "No.04"
    expect(logRowLabel(e)).toBe('No.04  研究ノート');
  });
});
