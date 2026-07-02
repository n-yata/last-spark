import { describe, it, expect, vi } from 'vitest';
import {
  computeButtonMetrics,
  NEON_BUTTON_COLORS,
  type NeonButtonVariant,
} from '../../../src/ui/neonButton';

// neonButton.ts は Phaser を import するが、このテストは純ロジックのみを対象とするため
// phaser をスタブする(characterRig.test.ts 等と同じ流儀。jsdom は canvas を持たない)。
// vi.mock はホイストされるため import より先に適用される。
vi.mock('phaser', () => ({ default: {} }));

// NeonButton の純ロジック(パネル寸法計算・variant 配色表)を検証する。
// Phaser 依存の描画・tween・入力はユニットテストでは扱わない(既存方針)。

describe('computeButtonMetrics(パネル寸法の純関数)', () => {
  it('ラベル寸法 + パディング(高さ比)でパネル寸法が決まる', () => {
    // labelH=20 → padX=22, padY=6.4
    const m = computeButtonMetrics(100, 20);
    expect(m.width).toBe(Math.round(100 + 22 * 2)); // 144
    expect(m.height).toBe(Math.round(20 + 6.4 * 2)); // 33
  });

  it('minWidth 未満ならパネル幅が minWidth まで広がる', () => {
    const m = computeButtonMetrics(40, 20, 200);
    expect(m.width).toBe(200);
  });

  it('minWidth 以上ならラベル幅なり(minWidth は下限であって固定幅ではない)', () => {
    const wide = computeButtonMetrics(300, 20, 200);
    expect(wide.width).toBe(Math.round(300 + 22 * 2)); // 344 > 200
  });

  it('minWidth 省略(既定0)でもラベル幅なりで計算される', () => {
    const m = computeButtonMetrics(100, 20);
    const explicit = computeButtonMetrics(100, 20, 0);
    expect(m).toEqual(explicit);
  });

  it('角丸半径はパネル高さ比(高さの28%)で、カプセル形(高さの半分)を超えない', () => {
    const m = computeButtonMetrics(100, 20);
    expect(m.radius).toBe(Math.round(m.height * 0.28));
    expect(m.radius).toBeLessThan(m.height / 2);
  });

  it('ラベルが大きいほどパディングも比例して増える(フォントサイズ追従)', () => {
    const small = computeButtonMetrics(100, 20);
    const large = computeButtonMetrics(100, 40);
    // 高さ比パディングなので、ラベル高2倍でパネル高もほぼ2倍になる。
    expect(large.height).toBeGreaterThan(small.height * 1.9);
    // 横パディング(width - labelW)も2倍になる。
    expect(large.width - 100).toBeGreaterThan((small.width - 100) * 1.9);
  });

  it('境界値: ラベル寸法0でも負にならず、幅は minWidth に従う', () => {
    const m = computeButtonMetrics(0, 0, 120);
    expect(m.width).toBe(120);
    expect(m.height).toBe(0);
    expect(m.radius).toBe(0);
  });
});

describe('NEON_BUTTON_COLORS(variant 配色表)', () => {
  const variants: NeonButtonVariant[] = ['default', 'primary', 'danger', 'ghost'];

  it('全 variant に label/labelHover(CSS色) と frame/fill(数値色) が揃っている', () => {
    for (const v of variants) {
      const c = NEON_BUTTON_COLORS[v];
      expect(c.label).toMatch(/^#[0-9a-f]{6}$/i);
      expect(c.labelHover).toMatch(/^#[0-9a-f]{6}$/i);
      expect(c.frame).toBeGreaterThanOrEqual(0);
      expect(c.frame).toBeLessThanOrEqual(0xffffff);
      expect(c.fill).toBeGreaterThanOrEqual(0);
      expect(c.fill).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('hover 色は通常色と異なる(押下候補が視覚的に判別できる)', () => {
    for (const v of variants) {
      const c = NEON_BUTTON_COLORS[v];
      expect(c.labelHover).not.toBe(c.label);
    }
  });

  it('primary/danger は default と異なるラベル色を持つ(導線の強弱が付く)', () => {
    expect(NEON_BUTTON_COLORS.primary.label).not.toBe(NEON_BUTTON_COLORS.default.label);
    expect(NEON_BUTTON_COLORS.danger.label).not.toBe(NEON_BUTTON_COLORS.default.label);
  });

  it('ghost は旧 menuButton と同じ色規則(#cfe9e2 → hover #fff27a)を踏襲する', () => {
    expect(NEON_BUTTON_COLORS.ghost.label).toBe('#cfe9e2');
    expect(NEON_BUTTON_COLORS.ghost.labelHover).toBe('#fff27a');
  });
});
