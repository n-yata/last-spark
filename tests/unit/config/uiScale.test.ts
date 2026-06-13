import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DPR_CAP,
  cappedDpr,
  getUiScale,
  setUiScale,
  scaled,
  scaledFontPx,
} from '../../../src/config/uiScale';

// 高DPI(Retina)対応の中核: cappedDpr(DPR を [1,2] にクランプ)と
// uiScale(絶対px のスケール係数)を検証する。uiScale はモジュール変数で
// 状態を持つため、各テストの前後で setUiScale(1) に必ず戻して状態リークを防ぐ。

describe('uiScale', () => {
  // どのテストも初期状態(uiScale=1)から始まり、終了後も 1 に戻す。
  beforeEach(() => setUiScale(1));
  afterEach(() => setUiScale(1));

  describe('cappedDpr(devicePixelRatio を [1, DPR_CAP] にクランプ)', () => {
    it('上限定数 DPR_CAP は 2', () => {
      expect(DPR_CAP).toBe(2);
    });

    it('1未満は下限1に持ち上げる(0.5→1)', () => {
      expect(cappedDpr(0.5)).toBe(1);
    });

    it('等倍(1)はそのまま1', () => {
      expect(cappedDpr(1)).toBe(1);
    });

    it('範囲内(1.5)はそのまま', () => {
      expect(cappedDpr(1.5)).toBe(1.5);
    });

    it('上限ちょうど(2)はそのまま2', () => {
      expect(cappedDpr(2)).toBe(2);
    });

    it('上限超過(2.6)は上限2に切り詰める', () => {
      expect(cappedDpr(2.6)).toBe(2);
    });

    it('高倍率(3)も上限2に切り詰める', () => {
      expect(cappedDpr(3)).toBe(2);
    });

    it('NaN は不正値として1', () => {
      expect(cappedDpr(NaN)).toBe(1);
    });

    it('Infinity は不正値として1', () => {
      expect(cappedDpr(Infinity)).toBe(1);
    });

    describe('引数省略時は window.devicePixelRatio を読む', () => {
      // jsdom の window.devicePixelRatio を一時的に差し替え、テスト後に復元する。
      let original: PropertyDescriptor | undefined;

      const setDpr = (value: unknown): void => {
        Object.defineProperty(window, 'devicePixelRatio', {
          value,
          configurable: true,
          writable: true,
        });
      };

      beforeEach(() => {
        original = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
      });

      afterEach(() => {
        if (original) {
          Object.defineProperty(window, 'devicePixelRatio', original);
        } else {
          // 元々未定義だった場合は削除して元の状態へ戻す。
          delete (window as unknown as { devicePixelRatio?: number }).devicePixelRatio;
        }
      });

      it('window.devicePixelRatio=3 のとき引数省略で上限2にクランプ', () => {
        setDpr(3);
        expect(cappedDpr()).toBe(2);
      });

      it('window.devicePixelRatio=1.5 のとき引数省略でそのまま1.5', () => {
        setDpr(1.5);
        expect(cappedDpr()).toBe(1.5);
      });

      it('window.devicePixelRatio が 0(falsy) のとき引数省略で1(|| 1 のフォールバック)', () => {
        setDpr(0);
        expect(cappedDpr()).toBe(1);
      });
    });
  });

  describe('getUiScale / setUiScale', () => {
    it('初期値は1', () => {
      expect(getUiScale()).toBe(1);
    });

    it('setUiScale(2) で2になる', () => {
      setUiScale(2);
      expect(getUiScale()).toBe(2);
    });

    it('setUiScale(0.5) は下限1にクランプ', () => {
      setUiScale(0.5);
      expect(getUiScale()).toBe(1);
    });

    it('setUiScale(NaN) は不正値として1', () => {
      setUiScale(NaN);
      expect(getUiScale()).toBe(1);
    });

    it('setUiScale(Infinity) は不正値として1', () => {
      setUiScale(Infinity);
      expect(getUiScale()).toBe(1);
    });
  });

  describe('scaled / scaledFontPx', () => {
    it('uiScale=1 では等倍(scaled(10)=10)', () => {
      setUiScale(1);
      expect(scaled(10)).toBe(10);
    });

    it('uiScale=2 では2倍(scaled(10)=20)', () => {
      setUiScale(2);
      expect(scaled(10)).toBe(20);
    });

    it('uiScale=1 で scaledFontPx(16)="16px"', () => {
      setUiScale(1);
      expect(scaledFontPx(16)).toBe('16px');
    });

    it('uiScale=2 で scaledFontPx(16)="32px"', () => {
      setUiScale(2);
      expect(scaledFontPx(16)).toBe('32px');
    });
  });
});
