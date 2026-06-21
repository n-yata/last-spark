import { describe, it, expect, afterEach } from 'vitest';
import { getViewportSize } from '../../../src/systems/viewport';

// window.innerWidth/innerHeight と window.visualViewport を一時的に差し替えるユーティリティ。
function setWindowSize(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
}
function setVisualViewport(value: { width: number; height: number } | undefined): void {
  Object.defineProperty(window, 'visualViewport', { value, configurable: true });
}

const originalVV = window.visualViewport;

afterEach(() => {
  Object.defineProperty(window, 'visualViewport', { value: originalVV, configurable: true });
});

describe('getViewportSize', () => {
  it('visualViewport が正の寸法を持つときはその値を返す(回転後の実可視サイズ優先)', () => {
    setWindowSize(375, 812); // innerWidth/Height は縦向きの古い値を模す
    setVisualViewport({ width: 812, height: 375 }); // 横向きの確定寸法
    expect(getViewportSize()).toEqual({ width: 812, height: 375 });
  });

  it('visualViewport が無い環境では innerWidth/innerHeight にフォールバックする', () => {
    setWindowSize(1280, 720);
    setVisualViewport(undefined);
    expect(getViewportSize()).toEqual({ width: 1280, height: 720 });
  });

  it('visualViewport の寸法が異常値(0)のときも innerWidth/innerHeight にフォールバックする', () => {
    setWindowSize(640, 360);
    setVisualViewport({ width: 0, height: 0 });
    expect(getViewportSize()).toEqual({ width: 640, height: 360 });
  });

  it('visualViewport の片方だけ 0 の場合もフォールバックする(部分異常を弾く)', () => {
    setWindowSize(640, 360);
    setVisualViewport({ width: 800, height: 0 });
    expect(getViewportSize()).toEqual({ width: 640, height: 360 });
  });

  it('フォールバックの innerWidth/innerHeight が 0 のときは正値(1)を返す(scale.resize 破綻防止)', () => {
    setWindowSize(0, 0);
    setVisualViewport(undefined);
    expect(getViewportSize()).toEqual({ width: 1, height: 1 });
  });
});
