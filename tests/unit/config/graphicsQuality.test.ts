import { describe, it, expect } from 'vitest';
import {
  resolveGraphicsQuality,
  graphicsFxLabel,
  cycleGraphicsFx,
  BLOOM_MAX_DPR,
} from '../../../src/config/graphicsQuality';

// ポストFXの段階的有効化ロジックの検証。
// 仕様: WebGLでなければ全無効。WebGLなら colorGrade/vignette は常に有効、
// bloom のみ生DPRが BLOOM_MAX_DPR を超える高密度端末で無効化する。
// ユーザー設定(mode)による上書き: off=全無効 / high=DPR不問で全有効 / auto・未指定=自動判定。

describe('resolveGraphicsQuality', () => {
  it('Canvas(非WebGL)では DPR によらず全FXを無効化する', () => {
    expect(resolveGraphicsQuality({ webgl: false, dpr: 1 })).toEqual({
      colorGrade: false,
      bloom: false,
      vignette: false,
    });
    // 低DPRでも WebGL でなければ無効のまま。
    expect(resolveGraphicsQuality({ webgl: false, dpr: 1 }).bloom).toBe(false);
  });

  it('WebGL かつ低DPR(=1)では全FXを有効化する', () => {
    expect(resolveGraphicsQuality({ webgl: true, dpr: 1 })).toEqual({
      colorGrade: true,
      bloom: true,
      vignette: true,
    });
  });

  it('境界値 DPR=BLOOM_MAX_DPR(2) では bloom を有効に保つ', () => {
    const q = resolveGraphicsQuality({ webgl: true, dpr: BLOOM_MAX_DPR });
    expect(q.bloom).toBe(true);
  });

  it('高密度端末(DPR>2)では bloom のみ無効化し、軽量FXは残す', () => {
    const q = resolveGraphicsQuality({ webgl: true, dpr: 3 });
    expect(q.bloom).toBe(false);
    expect(q.colorGrade).toBe(true);
    expect(q.vignette).toBe(true);
  });

  it('不正なDPR(NaN)は 1 とみなし bloom を有効化する', () => {
    const q = resolveGraphicsQuality({ webgl: true, dpr: Number.NaN });
    expect(q.bloom).toBe(true);
  });
});

describe('resolveGraphicsQuality: ユーザー設定(mode)による上書き', () => {
  it("mode='off' では WebGL・低DPRでも全FXを無効化する", () => {
    expect(resolveGraphicsQuality({ webgl: true, dpr: 1, mode: 'off' })).toEqual({
      colorGrade: false,
      bloom: false,
      vignette: false,
    });
  });

  it("mode='high' では高密度端末(DPR>2)でも bloom 含む全FXを有効化する", () => {
    expect(resolveGraphicsQuality({ webgl: true, dpr: 3, mode: 'high' })).toEqual({
      colorGrade: true,
      bloom: true,
      vignette: true,
    });
  });

  it("mode='high' でも Canvas(非WebGL)なら全FX無効(postFX は WebGL 専用)", () => {
    expect(resolveGraphicsQuality({ webgl: false, dpr: 1, mode: 'high' })).toEqual({
      colorGrade: false,
      bloom: false,
      vignette: false,
    });
  });

  it("mode='auto' は mode 未指定の自動判定と同一の結果になる", () => {
    for (const dpr of [1, BLOOM_MAX_DPR, 3]) {
      expect(resolveGraphicsQuality({ webgl: true, dpr, mode: 'auto' })).toEqual(
        resolveGraphicsQuality({ webgl: true, dpr }),
      );
    }
  });
});

describe('graphicsFxLabel / cycleGraphicsFx', () => {
  it('各モードの表示ラベルを返す', () => {
    expect(graphicsFxLabel('auto')).toBe('AUTO');
    expect(graphicsFxLabel('high')).toBe('HIGH');
    expect(graphicsFxLabel('off')).toBe('OFF');
  });

  it('auto → high → off → auto と巡回する', () => {
    expect(cycleGraphicsFx('auto')).toBe('high');
    expect(cycleGraphicsFx('high')).toBe('off');
    expect(cycleGraphicsFx('off')).toBe('auto');
  });
});
