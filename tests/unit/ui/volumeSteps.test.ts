import { describe, it, expect } from 'vitest';
import {
  VOLUME_STEPS,
  volumeToStep,
  stepToVolume,
  adjustStep,
  volumeBar,
  volumePercent,
} from '../../../src/ui/volumeSteps';

// 音量段階の純ロジック。量子化の丸め境界・往復一致・上下限クランプ・表示文字列を検証する。

describe('volumeSteps', () => {
  it('VOLUME_STEPS は 4(5段階)', () => {
    expect(VOLUME_STEPS).toBe(4);
  });

  describe('volumeToStep(連続値→段階の量子化)', () => {
    it('0.0 → 0', () => {
      expect(volumeToStep(0)).toBe(0);
    });

    it('1.0 → 4(最大段階)', () => {
      expect(volumeToStep(1)).toBe(4);
    });

    it('0.5 → 2(中央)', () => {
      expect(volumeToStep(0.5)).toBe(2);
    });

    it('0.25 → 1 / 0.75 → 3', () => {
      expect(volumeToStep(0.25)).toBe(1);
      expect(volumeToStep(0.75)).toBe(3);
    });

    it('丸め境界: 0.3 → 1(0.25寄り), 0.4 → 2(0.5寄り)', () => {
      // 0.3*4=1.2→1, 0.4*4=1.6→2
      expect(volumeToStep(0.3)).toBe(1);
      expect(volumeToStep(0.4)).toBe(2);
    });

    it('範囲外は安全側クランプ(負→0, 1超→4)', () => {
      expect(volumeToStep(-0.5)).toBe(0);
      expect(volumeToStep(1.5)).toBe(4);
    });

    it('非有限値は 0', () => {
      expect(volumeToStep(NaN)).toBe(0);
      expect(volumeToStep(Infinity)).toBe(0);
    });
  });

  describe('stepToVolume(段階→連続値)', () => {
    it('各段階が 0/0.25/0.5/0.75/1.0', () => {
      expect(stepToVolume(0)).toBe(0);
      expect(stepToVolume(1)).toBe(0.25);
      expect(stepToVolume(2)).toBe(0.5);
      expect(stepToVolume(3)).toBe(0.75);
      expect(stepToVolume(4)).toBe(1);
    });

    it('範囲外はクランプ(負→0, 4超→1)', () => {
      expect(stepToVolume(-2)).toBe(0);
      expect(stepToVolume(9)).toBe(1);
    });

    it('往復一致: stepToVolume(volumeToStep(v)) が各段階値で安定', () => {
      for (const v of [0, 0.25, 0.5, 0.75, 1]) {
        expect(stepToVolume(volumeToStep(v))).toBe(v);
      }
    });
  });

  describe('adjustStep(増減 + クランプ)', () => {
    it('+1 で 1 段上がる', () => {
      expect(adjustStep(2, 1)).toBe(3);
    });

    it('-1 で 1 段下がる', () => {
      expect(adjustStep(2, -1)).toBe(1);
    });

    it('上限: 4 で +1 しても 4 のまま', () => {
      expect(adjustStep(4, 1)).toBe(4);
    });

    it('下限: 0 で -1 しても 0 のまま', () => {
      expect(adjustStep(0, -1)).toBe(0);
    });
  });

  describe('volumeBar / volumePercent(表示)', () => {
    it('volumeBar: 塗り=段階, 空き=残り(常に4マス)', () => {
      expect(volumeBar(0)).toBe('□□□□');
      expect(volumeBar(2)).toBe('■■□□');
      expect(volumeBar(4)).toBe('■■■■');
    });

    it('volumePercent: 段階を 0–100 の%へ', () => {
      expect(volumePercent(0)).toBe(0);
      expect(volumePercent(1)).toBe(25);
      expect(volumePercent(2)).toBe(50);
      expect(volumePercent(4)).toBe(100);
    });
  });
});
