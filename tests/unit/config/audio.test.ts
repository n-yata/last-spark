import { describe, it, expect } from 'vitest';
import { SE, SE_KEYS, BGM, BEAM_SOUND, type BgmKey } from '../../../src/config/audio';

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

describe('持続ビーム音(BEAM_SOUND)', () => {
  it('音量・ノイズ量は 0–1 に収まる(クリップ防止)', () => {
    expect(BEAM_SOUND.volume).toBeGreaterThanOrEqual(0);
    expect(BEAM_SOUND.volume).toBeLessThanOrEqual(1);
    expect(BEAM_SOUND.noiseVolume).toBeGreaterThanOrEqual(0);
    expect(BEAM_SOUND.noiseVolume).toBeLessThanOrEqual(1);
  });

  it('エンベロープ(attack/release)は非負', () => {
    expect(BEAM_SOUND.attackMs).toBeGreaterThanOrEqual(0);
    expect(BEAM_SOUND.releaseMs).toBeGreaterThanOrEqual(0);
  });

  it('低層・高層の周波数は正で、高層が「強さ」のため低層より高い', () => {
    expect(BEAM_SOUND.lowFreq).toBeGreaterThan(0);
    expect(BEAM_SOUND.highFreq).toBeGreaterThan(0);
    // 高層を低層より高く取り、パワーコード感(完全5度上)で強さを補強する設計。
    expect(BEAM_SOUND.highFreq).toBeGreaterThan(BEAM_SOUND.lowFreq);
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

  it('harmonies(任意)を持つトラックは有限値の配列である', () => {
    for (const key of keys) {
      const harmonies = BGM[key].harmonies;
      if (harmonies === undefined) continue;
      expect(Array.isArray(harmonies), `${key}.harmonies は配列`).toBe(true);
      for (const semitone of harmonies) {
        expect(Number.isFinite(semitone), `${key}.harmonies の各値は有限値`).toBe(true);
      }
    }
  });

  it('drone.semitones(任意)を持つトラックは有限値の配列である', () => {
    for (const key of keys) {
      const semitones = BGM[key].drone?.semitones;
      if (semitones === undefined) continue;
      expect(Array.isArray(semitones), `${key}.drone.semitones は配列`).toBe(true);
      for (const semitone of semitones) {
        expect(Number.isFinite(semitone), `${key}.drone.semitones の各値は有限値`).toBe(true);
      }
    }
  });

  it('BGM.boss に harmonies が定義されている(重厚化: design.md準拠)', () => {
    expect(BGM.boss.harmonies).toBeDefined();
  });

  it('BGM.ending に harmonies が定義されている(重厚化: design.md準拠)', () => {
    expect(BGM.ending.harmonies).toBeDefined();
  });

  it('BGM.boss.harmonies は完全5度(+7)とオクターブ下(-12)を含む(パワーコード感)', () => {
    // design.md 「harmonies: [-12, 7]」: 重みと完全5度でECLIPSEの機械的な圧を最大化する。
    expect(BGM.boss.harmonies).toContain(7);
    expect(BGM.boss.harmonies).toContain(-12);
  });

  it('BGM.ending.harmonies はオクターブ下(-12)を含む(弦の重み・厚み)', () => {
    // design.md 「harmonies: [-12]」: オクターブ下で弦の重みを加える。
    expect(BGM.ending.harmonies).toContain(-12);
  });
});
