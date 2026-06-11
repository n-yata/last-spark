import { describe, it, expect, afterEach } from 'vitest';
import {
  controlBandHeight,
  isTouchControlEnabled,
  CONTROL_BAND_MIN_PX,
  CONTROL_BAND_MAX_PX,
  CONTROL_BAND_RATIO,
} from '../../../src/config/controlBand';
import type Phaser from 'phaser';

describe('controlBandHeight(下部コントロール帯の高さ算出)', () => {
  it('非タッチ(enabled=false)なら帯なし(0)=フル画面', () => {
    expect(controlBandHeight(540, false)).toBe(0);
    expect(controlBandHeight(1000, false)).toBe(0);
  });

  it('タッチ時は画面高さ比(RATIO)を帯高さとする(中間値)', () => {
    // 700 * 0.14 = 98 → [96,112] の範囲内なのでそのまま
    expect(controlBandHeight(700, true)).toBe(Math.round(700 * CONTROL_BAND_RATIO));
    expect(controlBandHeight(700, true)).toBe(98);
  });

  it('背の高い画面では MAX にクランプ', () => {
    // 1000 * 0.14 = 140 → MAX(112) に丸められる
    expect(controlBandHeight(1000, true)).toBe(CONTROL_BAND_MAX_PX);
  });

  it('背の低い画面では MIN にクランプ', () => {
    // 400 * 0.14 = 56 → MIN(96) に持ち上げられる
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

describe('isTouchControlEnabled(純タッチ端末の判定)', () => {
  const originalMatchMedia = window.matchMedia;

  // pointer メディアクエリの結果をモックする(coarse=指操作主, fine=マウス等の精密ポインタ有無)。
  const mockPointer = (coarse: boolean, anyFine: boolean): void => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('any-pointer: fine') ? anyFine : query.includes('pointer: coarse') ? coarse : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  };

  const fakeGame = (deviceTouch: boolean): Phaser.Game =>
    ({ device: { input: { touch: deviceTouch } } }) as unknown as Phaser.Game;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('スマホ/タブレット(coarse のみ・fine 無し)は有効', () => {
    mockPointer(true, false);
    expect(isTouchControlEnabled(fakeGame(true))).toBe(true);
  });

  it('タッチPC(coarse だが fine も有り=マウス併用)は無効=フル画面維持', () => {
    mockPointer(true, true);
    expect(isTouchControlEnabled(fakeGame(true))).toBe(false);
  });

  it('デスクトップ(coarse 無し)は無効', () => {
    mockPointer(false, true);
    expect(isTouchControlEnabled(fakeGame(false))).toBe(false);
  });

  it('matchMedia 非対応環境では Phaser のタッチ判定にフォールバックする', () => {
    // @ts-expect-error テストのため一時的に matchMedia を取り除く
    window.matchMedia = undefined;
    expect(isTouchControlEnabled(fakeGame(true))).toBe(true);
    expect(isTouchControlEnabled(fakeGame(false))).toBe(false);
  });
});
