import { describe, it, expect } from 'vitest';
import { SE, SE_KEYS, BGM } from '../../../src/config/audio';

describe('SE カタログ', () => {
  it('13 種の SE キーが定義されている', () => {
    expect(SE_KEYS).toHaveLength(13);
  });

  it('各 SE キーに対応する仕様が存在する', () => {
    for (const key of SE_KEYS) {
      expect(SE[key], `SE[${key}] が未定義`).toBeDefined();
    }
  });

  it('各 SE の音量は 0–1、長さ・エンベロープは正の値', () => {
    for (const key of SE_KEYS) {
      const spec = SE[key];
      expect(spec.volume, `${key}.volume`).toBeGreaterThanOrEqual(0);
      expect(spec.volume, `${key}.volume`).toBeLessThanOrEqual(1);
      expect(spec.durationMs, `${key}.durationMs`).toBeGreaterThan(0);
      expect(spec.attackMs, `${key}.attackMs`).toBeGreaterThanOrEqual(0);
      expect(spec.releaseMs, `${key}.releaseMs`).toBeGreaterThanOrEqual(0);
      // アタック+リリースが全長を超えない(エンベロープが破綻しない)
      expect(spec.attackMs + spec.releaseMs, `${key} envelope`).toBeLessThanOrEqual(
        spec.durationMs,
      );
    }
  });
});

describe('BGM トラック', () => {
  const keys = ['title', 'stage', 'boss'] as const;

  it('title/stage/boss の 3 トラックが定義されている', () => {
    for (const key of keys) {
      expect(BGM[key], `BGM[${key}] が未定義`).toBeDefined();
    }
  });

  it('各トラックは bpm>0・baseVolume 0–1・loop 非空', () => {
    for (const key of keys) {
      const track = BGM[key];
      expect(track.bpm, `${key}.bpm`).toBeGreaterThan(0);
      expect(track.baseVolume, `${key}.baseVolume`).toBeGreaterThanOrEqual(0);
      expect(track.baseVolume, `${key}.baseVolume`).toBeLessThanOrEqual(1);
      expect(track.loop.length, `${key}.loop`).toBeGreaterThan(0);
    }
  });

  it('各ノートの拍数は正の値', () => {
    for (const key of keys) {
      for (const token of BGM[key].loop) {
        expect(token.beats, `${key} note beats`).toBeGreaterThan(0);
      }
    }
  });
});
