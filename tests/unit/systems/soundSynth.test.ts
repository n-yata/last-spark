import { describe, it, expect } from 'vitest';
import {
  clamp01,
  noteToFrequency,
  centsToRatio,
  selectExplorationBgm,
  effectiveVolume,
  scheduleNotes,
  trackDurationSec,
} from '../../../src/systems/soundSynth';
import type { GameSettings } from '../../../src/types/save';
import type { BgmTrack } from '../../../src/config/audio';

const settings = (over: Partial<GameSettings> = {}): GameSettings => ({
  muted: false,
  bgmVolume: 0.6,
  seVolume: 0.8,
  ...over,
});

describe('clamp01', () => {
  it('範囲内はそのまま、外は 0–1 に丸める', () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
  });

  it('非有限値(NaN/Infinity)は無効値として 0 にする', () => {
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('noteToFrequency', () => {
  it('A4(semitone=0)は 440Hz', () => {
    expect(noteToFrequency(0)).toBeCloseTo(440, 5);
  });

  it('+12 半音で 1 オクターブ上(880Hz)', () => {
    expect(noteToFrequency(12)).toBeCloseTo(880, 5);
  });

  it('-12 半音で 1 オクターブ下(220Hz)', () => {
    expect(noteToFrequency(-12)).toBeCloseTo(220, 5);
  });
});

describe('effectiveVolume', () => {
  it('muted は常に 0', () => {
    expect(effectiveVolume(1, settings({ muted: true }), 'se')).toBe(0);
    expect(effectiveVolume(1, settings({ muted: true }), 'bgm')).toBe(0);
  });

  it('role に応じて bgmVolume / seVolume を乗算する', () => {
    expect(effectiveVolume(0.5, settings(), 'bgm')).toBeCloseTo(0.5 * 0.6, 5);
    expect(effectiveVolume(0.5, settings(), 'se')).toBeCloseTo(0.5 * 0.8, 5);
  });

  it('1 を超えないようクランプする', () => {
    expect(effectiveVolume(2, settings({ bgmVolume: 1 }), 'bgm')).toBe(1);
  });

  it('負の基準音量は 0 に丸める', () => {
    expect(effectiveVolume(-1, settings(), 'se')).toBe(0);
  });
});

describe('scheduleNotes', () => {
  const track: BgmTrack = {
    wave: 'square',
    bpm: 120, // 1拍 = 0.5秒
    baseVolume: 0.3,
    loop: [
      { semitone: 0, beats: 1 }, // A4 440Hz, 0.5秒
      { semitone: null, beats: 0.5 }, // 休符, 0.25秒
      { semitone: 12, beats: 1 }, // A5 880Hz, 0.5秒
    ],
  };

  it('開始秒が累積し、長さが拍×拍秒になる', () => {
    const notes = scheduleNotes(track);
    expect(notes).toHaveLength(3);
    expect(notes[0].startSec).toBeCloseTo(0, 5);
    expect(notes[0].durSec).toBeCloseTo(0.5, 5);
    expect(notes[1].startSec).toBeCloseTo(0.5, 5);
    expect(notes[1].durSec).toBeCloseTo(0.25, 5);
    expect(notes[2].startSec).toBeCloseTo(0.75, 5);
    expect(notes[2].durSec).toBeCloseTo(0.5, 5);
  });

  it('休符は freq=null、音符は周波数を持つ', () => {
    const notes = scheduleNotes(track);
    expect(notes[0].freq).toBeCloseTo(440, 5);
    expect(notes[1].freq).toBeNull();
    expect(notes[2].freq).toBeCloseTo(880, 5);
  });
});

describe('trackDurationSec', () => {
  it('総拍数 × 拍秒 を返す', () => {
    const track: BgmTrack = {
      wave: 'triangle',
      bpm: 120, // 1拍 = 0.5秒
      baseVolume: 0.3,
      loop: [
        { semitone: 0, beats: 1 },
        { semitone: 7, beats: 0.5 },
        { semitone: null, beats: 0.5 },
      ],
    };
    // (1 + 0.5 + 0.5) 拍 × 0.5秒 = 1.0秒
    expect(trackDurationSec(track)).toBeCloseTo(1.0, 5);
  });
});

describe('centsToRatio', () => {
  it('0 セントは等倍(1)', () => {
    expect(centsToRatio(0)).toBeCloseTo(1, 5);
  });

  it('+1200 セント(1オクターブ上)は 2 倍、-1200 は 0.5 倍', () => {
    expect(centsToRatio(1200)).toBeCloseTo(2, 5);
    expect(centsToRatio(-1200)).toBeCloseTo(0.5, 5);
  });

  it('小さなデチューン(±数セント)は 1 にごく近い(温もりの揺らぎ)', () => {
    expect(centsToRatio(5)).toBeGreaterThan(1);
    expect(centsToRatio(5)).toBeLessThan(1.01);
    expect(centsToRatio(-5)).toBeLessThan(1);
    expect(centsToRatio(-5)).toBeGreaterThan(0.99);
  });

  it('非有限値は等倍(1)へフォールバック(無音化・破綻を防ぐ)', () => {
    expect(centsToRatio(Number.NaN)).toBe(1);
    expect(centsToRatio(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('selectExplorationBgm', () => {
  it('Stage 3 未クリア(TERRA同行前)は通常の探索 stage', () => {
    expect(selectExplorationBgm([])).toBe('stage');
    expect(selectExplorationBgm(['stage1', 'stage2'])).toBe('stage');
  });

  it('Stage 3 クリア済み(TERRA同行後)は温もりの stageWarm', () => {
    expect(selectExplorationBgm(['stage1', 'stage2', 'stage3'])).toBe('stageWarm');
    // 順不同でも stage3 が含まれていれば温もりへ切り替わる。
    expect(selectExplorationBgm(['stage3'])).toBe('stageWarm');
  });
});
