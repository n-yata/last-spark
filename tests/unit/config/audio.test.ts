import { describe, it, expect } from 'vitest';
import { SE, SE_KEYS, BGM, type BgmKey } from '../../../src/config/audio';

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
  // story.md「BGM方針」の4シーンに対応する5トラック(探索は通常/温もりの2種)。
  const keys: BgmKey[] = ['title', 'stage', 'stageWarm', 'boss', 'ending'];

  it('title/stage/stageWarm/boss/ending の 5 トラックが定義されている', () => {
    for (const key of keys) {
      expect(BGM[key], `BGM[${key}] が未定義`).toBeDefined();
    }
    // BGM の全キーがこのリストと一致する(追加漏れ・テスト漏れを検出)。
    expect(Object.keys(BGM).sort()).toEqual([...keys].sort());
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

  it('ドローン(任意)は volume が 0–1 で semitone が有限値', () => {
    for (const key of keys) {
      const drone = BGM[key].drone;
      if (!drone) continue;
      expect(drone.volume, `${key}.drone.volume`).toBeGreaterThanOrEqual(0);
      expect(drone.volume, `${key}.drone.volume`).toBeLessThanOrEqual(1);
      expect(Number.isFinite(drone.semitone), `${key}.drone.semitone`).toBe(true);
    }
  });

  it('デチューン(任意)は非負の有限値', () => {
    for (const key of keys) {
      const cents = BGM[key].detuneCents;
      if (cents === undefined) continue;
      expect(Number.isFinite(cents), `${key}.detuneCents`).toBe(true);
      expect(cents, `${key}.detuneCents`).toBeGreaterThanOrEqual(0);
    }
  });

  it('温もり(stageWarm)は探索(stage)と温度差を持つ: デチューンが効き、長3度(C#5=+4)を含む', () => {
    // 温もりはコーラス感(デチューン)を持つ。探索(stage)は単声。
    expect(BGM.stageWarm.detuneCents).toBeGreaterThan(0);
    expect(BGM.stage.detuneCents ?? 0).toBe(0);
    // 探索は短3度(C5=+3)、温もりは長3度(C#5=+4)を含み、音の温度差を作る。
    const warmSemis = BGM.stageWarm.loop.map((n) => n.semitone);
    expect(warmSemis).toContain(4);
    const stageSemis = BGM.stage.loop.map((n) => n.semitone);
    expect(stageSemis).toContain(3);
  });

  it('探索・温もり・エンディングはアンビエントの土台としてドローンを持つ', () => {
    expect(BGM.stage.drone).toBeDefined();
    expect(BGM.stageWarm.drone).toBeDefined();
    expect(BGM.ending.drone).toBeDefined();
  });
});
