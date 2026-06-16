import { describe, it, expect } from 'vitest';
import {
  clamp01,
  noteToFrequency,
  centsToRatio,
  selectExplorationBgm,
  effectiveVolume,
  scheduleNotes,
  trackDurationSec,
  voicePeak,
  droneVoices,
} from '../../../src/systems/soundSynth';
import type { GameSettings } from '../../../src/types/save';
import type { BgmTrack, BgmDrone } from '../../../src/config/audio';

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

describe('voicePeak', () => {
  it('声数 1 で basePeak(=0.8)を返す(後方互換)', () => {
    expect(voicePeak(1)).toBeCloseTo(0.8, 5);
  });

  it('声数が増えるにつれ単調減少する(クリップ回避)', () => {
    const v1 = voicePeak(1);
    const v2 = voicePeak(2);
    const v3 = voicePeak(3);
    const v4 = voicePeak(4);
    expect(v1).toBeGreaterThan(v2);
    expect(v2).toBeGreaterThan(v3);
    expect(v3).toBeGreaterThan(v4);
  });

  it('2 声は basePeak / sqrt(2) ≈ 0.566 になる', () => {
    // 0.8 / Math.sqrt(2) ≈ 0.5656...
    expect(voicePeak(2)).toBeCloseTo(0.8 / Math.sqrt(2), 5);
  });

  it('4 声は basePeak / sqrt(4) = 0.4 になる', () => {
    // 0.8 / sqrt(4) = 0.8 / 2 = 0.4
    expect(voicePeak(4)).toBeCloseTo(0.4, 5);
  });

  it('0 以下・NaN・Infinity は 1 声扱いで basePeak(=0.8)を返す', () => {
    expect(voicePeak(0)).toBeCloseTo(0.8, 5);
    expect(voicePeak(-1)).toBeCloseTo(0.8, 5);
    expect(voicePeak(Number.NaN)).toBeCloseTo(0.8, 5);
    expect(voicePeak(Number.POSITIVE_INFINITY)).toBeCloseTo(0.8, 5);
    expect(voicePeak(Number.NEGATIVE_INFINITY)).toBeCloseTo(0.8, 5);
  });

  it('結果は常に 0–1 に収まる', () => {
    for (const n of [1, 2, 3, 4, 10, 100]) {
      const result = voicePeak(n);
      expect(result, `voicePeak(${n})`).toBeGreaterThanOrEqual(0);
      expect(result, `voicePeak(${n})`).toBeLessThanOrEqual(1);
    }
  });

  it('basePeak を変えた場合も声数 1 でその値になる', () => {
    expect(voicePeak(1, 1.0)).toBeCloseTo(1.0, 5);
    expect(voicePeak(1, 0.5)).toBeCloseTo(0.5, 5);
    expect(voicePeak(2, 1.0)).toBeCloseTo(1.0 / Math.sqrt(2), 5);
  });
});

describe('droneVoices', () => {
  it('semitones が指定(非空)のときはその配列をそのまま返す', () => {
    const drone: BgmDrone = { semitone: -24, volume: 0.4, semitones: [-24, -17] };
    expect(droneVoices(drone)).toEqual([-24, -17]);
  });

  it('semitones が複数要素のときも全声を返す', () => {
    const drone: BgmDrone = { semitone: -24, volume: 0.4, semitones: [-24, -17, -12] };
    expect(droneVoices(drone)).toEqual([-24, -17, -12]);
  });

  it('semitones が未指定のときは [semitone] の単声へフォールバックする', () => {
    const drone: BgmDrone = { semitone: -24, volume: 0.4 };
    expect(droneVoices(drone)).toEqual([-24]);
  });

  it('semitones が空配列のときも [semitone] の単声へフォールバックする', () => {
    const drone: BgmDrone = { semitone: -12, volume: 0.5, semitones: [] };
    expect(droneVoices(drone)).toEqual([-12]);
  });

  it('semitones 指定時は semitone フィールドの値に依存しない(配列が優先)', () => {
    const drone: BgmDrone = { semitone: -999, volume: 0.3, semitones: [-24, -17] };
    expect(droneVoices(drone)).toEqual([-24, -17]);
    expect(droneVoices(drone)).not.toContain(-999);
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
