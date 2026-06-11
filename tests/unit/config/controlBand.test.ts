import { describe, it, expect } from 'vitest';
import {
  controlBandHeight,
  CONTROL_BAND_MIN_PX,
  CONTROL_BAND_MAX_PX,
  CONTROL_BAND_RATIO,
} from '../../../src/config/controlBand';

describe('controlBandHeight(下部コントロール帯の高さ算出)', () => {
  it('非タッチ(enabled=false)なら帯なし(0)=フル画面', () => {
    expect(controlBandHeight(540, false)).toBe(0);
    expect(controlBandHeight(1000, false)).toBe(0);
  });

  it('タッチ時は画面高さ比(RATIO)を帯高さとする(中間値)', () => {
    // 700 * 0.22 = 154 → [112,168] の範囲内なのでそのまま
    expect(controlBandHeight(700, true)).toBe(Math.round(700 * CONTROL_BAND_RATIO));
    expect(controlBandHeight(700, true)).toBe(154);
  });

  it('背の高い画面では MAX にクランプ', () => {
    // 1000 * 0.22 = 220 → MAX(168) に丸められる
    expect(controlBandHeight(1000, true)).toBe(CONTROL_BAND_MAX_PX);
  });

  it('背の低い画面では MIN にクランプ', () => {
    // 400 * 0.22 = 88 → MIN(112) に持ち上げられる
    expect(controlBandHeight(400, true)).toBe(CONTROL_BAND_MIN_PX);
  });

  it('画面高さが0以下なら帯なし(0)', () => {
    expect(controlBandHeight(0, true)).toBe(0);
    expect(controlBandHeight(-10, true)).toBe(0);
  });

  it('画面高さが極端に小さい正値でも MIN クランプし0にならない', () => {
    expect(controlBandHeight(1, true)).toBe(CONTROL_BAND_MIN_PX);
  });

  it('MIN は半径44ボタン(直径88)が収まる余裕がある', () => {
    expect(CONTROL_BAND_MIN_PX).toBeGreaterThan(88);
  });
});
