import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  controlBandHeight,
  isTouchControlEnabled,
  CONTROL_BAND_MIN_PX,
  CONTROL_BAND_MAX_PX,
  CONTROL_BAND_RATIO,
} from '../../../src/config/controlBand';
import { setUiScale } from '../../../src/config/uiScale';
import type Phaser from 'phaser';

// 帯高さの MIN/MAX(CSS px ベース値)は scaled()=uiScale 倍される。uiScale は
// モジュール変数で状態を持つため、各テストの前後で必ず 1 に戻し、既存(uiScale=1)
// ケースへの状態リークを防ぐ。uiScale=2 は専用 describe 内だけで使う。
beforeEach(() => setUiScale(1));
afterEach(() => setUiScale(1));

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

// 高DPI(uiScale=2)時: クランプ境界 MIN/MAX が scaled()=2倍され [192, 224] になる。
// RATIO 部(screenHeight*0.14)は screenHeight が物理pxなので自動的にスケールする。
describe('controlBandHeight(uiScale=2 でのクランプ境界)', () => {
  it('RATIO 値が境界内(196)ならそのまま(1400*0.14=196 ∈ [192,224])', () => {
    setUiScale(2);
    expect(controlBandHeight(1400, true)).toBe(196);
  });

  it('RATIO 値が下限未満なら MIN(192) に持ち上げる(800*0.14=112 → 192)', () => {
    setUiScale(2);
    expect(controlBandHeight(800, true)).toBe(192); // scaled(96)=192
  });

  it('RATIO 値が上限超過なら MAX(224) に丸める(2000*0.14=280 → 224)', () => {
    setUiScale(2);
    expect(controlBandHeight(2000, true)).toBe(224); // scaled(112)=224
  });

  it('境界は uiScale 倍される(MIN=scaled(96), MAX=scaled(112))', () => {
    setUiScale(2);
    expect(controlBandHeight(800, true)).toBe(CONTROL_BAND_MIN_PX * 2);
    expect(controlBandHeight(2000, true)).toBe(CONTROL_BAND_MAX_PX * 2);
  });

  it('非タッチ(enabled=false)は uiScale に関わらず帯なし(0)', () => {
    setUiScale(2);
    expect(controlBandHeight(1400, false)).toBe(0);
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
