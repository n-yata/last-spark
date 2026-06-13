import { describe, it, expect } from 'vitest';
import { resolveStoryEvent, TEXT_STYLES, readingDurationMs } from '../../../src/systems/storyDirector';
import type { StageStory } from '../../../src/types/story';

const STORY: StageStory = {
  stageId: 'stageX',
  intro: 'イントロ1\nイントロ2',
  eclipseVoice: '排除する',
  logs: {
    early: '序盤ログ',
    preBoss: 'ボス前ログ',
    postBoss: 'ボス後ログ',
  },
  inner: {
    stageStart: '起きた',
    firstLogFound: '誰かがいた',
    firstLogRead: '俺のために',
  },
};

describe('resolveStoryEvent', () => {
  it('stageStart は 開始テキスト→内心 の順で返す', () => {
    const out = resolveStoryEvent(STORY, { type: 'stageStart' });
    expect(out.map((r) => r.kind)).toEqual(['stageIntro', 'rayInner']);
    expect(out[0].text).toBe('イントロ1\nイントロ2');
    expect(out[1].text).toBe('起きた');
  });

  it('stageStart で開始内心が無ければ開始テキストのみ', () => {
    const noInner: StageStory = { ...STORY, inner: {} };
    const out = resolveStoryEvent(noInner, { type: 'stageStart' });
    expect(out.map((r) => r.kind)).toEqual(['stageIntro']);
  });

  it('logFound は該当スロットの科学者ログを返す', () => {
    const out = resolveStoryEvent(STORY, { type: 'logFound', slot: 'preBoss' });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('scientistLog');
    expect(out[0].text).toBe('ボス前ログ');
  });

  it('logFound で存在しないスロットは空配列', () => {
    const sparse: StageStory = { ...STORY, logs: { early: 'のみ' } };
    expect(resolveStoryEvent(sparse, { type: 'logFound', slot: 'postBoss' })).toEqual([]);
  });

  it('bossIntro は ECLIPSE の語りかけを返す', () => {
    const out = resolveStoryEvent(STORY, { type: 'bossIntro' });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('eclipseVoice');
    expect(out[0].text).toBe('排除する');
  });

  it('inner は sceneKey の内心を返す', () => {
    const out = resolveStoryEvent(STORY, { type: 'inner', sceneKey: 'firstLogRead' });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('rayInner');
    expect(out[0].text).toBe('俺のために');
  });

  it('inner で未定義の sceneKey は空配列', () => {
    expect(resolveStoryEvent(STORY, { type: 'inner', sceneKey: 'unknown' })).toEqual([]);
  });

  it('pauseGame は kind の既定スタイルに一致する', () => {
    const intro = resolveStoryEvent(STORY, { type: 'stageStart' })[0];
    expect(intro.pauseGame).toBe(TEXT_STYLES.stageIntro.pauseGame);
    const log = resolveStoryEvent(STORY, { type: 'logFound', slot: 'early' })[0];
    expect(log.pauseGame).toBe(true);
    const inner = resolveStoryEvent(STORY, { type: 'inner', sceneKey: 'stageStart' })[0];
    expect(inner.pauseGame).toBe(false);
  });

  it('科学者ログとECLIPSEは一時停止、内心は非停止', () => {
    expect(TEXT_STYLES.scientistLog.pauseGame).toBe(true);
    expect(TEXT_STYLES.eclipseVoice.pauseGame).toBe(true);
    expect(TEXT_STYLES.rayInner.pauseGame).toBe(false);
    expect(TEXT_STYLES.terraLine.pauseGame).toBe(false);
  });
});

describe('readingDurationMs', () => {
  it('短い本文は下限(2400ms)を返す', () => {
    expect(readingDurationMs('短い')).toBe(2400);
  });

  it('長い本文ほど長く、上限(7000ms)で頭打ち', () => {
    expect(readingDurationMs('あ'.repeat(80))).toBe(7000);
  });

  it('文字数が多いほど表示時間が長い', () => {
    expect(readingDurationMs('あ'.repeat(30))).toBeGreaterThan(readingDurationMs('あ'.repeat(10)));
  });

  it('空白・改行は読字数に数えない', () => {
    expect(readingDurationMs('あ\n\nい  う')).toBe(readingDurationMs('あいう'));
  });
});
