import { describe, it, expect } from 'vitest';
import { resolveGraphicsQuality, BLOOM_MAX_DPR } from '../../../src/config/graphicsQuality';

// ポストFXの段階的有効化ロジックの検証。
// 仕様: WebGLでなければ全無効。WebGLなら colorGrade/vignette は常に有効、
// bloom のみ生DPRが BLOOM_MAX_DPR を超える高密度端末で無効化する。

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
