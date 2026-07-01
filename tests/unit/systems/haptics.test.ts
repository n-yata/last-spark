import { describe, it, expect, vi, afterEach } from 'vitest';
import { Haptics } from '../../../src/systems/haptics';

// navigator.vibrate は jsdom に存在しないため、テストごとに定義して差し替える。
function stubVibrate(): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockReturnValue(true);
  Object.defineProperty(navigator, 'vibrate', {
    value: fn,
    configurable: true,
    writable: true,
  });
  return fn;
}

function removeVibrate(): void {
  delete (navigator as unknown as Record<string, unknown>).vibrate;
}

afterEach(() => {
  removeVibrate();
});

describe('Haptics', () => {
  it('vibrateHit は短い単発の振動を発火する', () => {
    const vibrate = stubVibrate();
    new Haptics().vibrateHit();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(40);
  });

  it('vibrateBossDefeat はパターン(配列)で発火する', () => {
    const vibrate = stubVibrate();
    new Haptics().vibrateBossDefeat();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith([60, 40, 90]);
  });

  it('setEnabled(false) では一切振動しない', () => {
    const vibrate = stubVibrate();
    const haptics = new Haptics();
    haptics.setEnabled(false);
    haptics.vibrateHit();
    haptics.vibrateBossDefeat();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('setEnabled(false) → setEnabled(true) で再び振動する', () => {
    const vibrate = stubVibrate();
    const haptics = new Haptics();
    haptics.setEnabled(false);
    haptics.vibrateHit();
    haptics.setEnabled(true);
    haptics.vibrateHit();
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('navigator.vibrate 非対応環境では例外を出さず no-op', () => {
    removeVibrate();
    const haptics = new Haptics();
    expect(() => {
      haptics.vibrateHit();
      haptics.vibrateBossDefeat();
    }).not.toThrow();
  });

  it('navigator.vibrate が例外を投げても伝播しない', () => {
    const vibrate = stubVibrate();
    vibrate.mockImplementation(() => {
      throw new Error('not allowed');
    });
    expect(() => new Haptics().vibrateHit()).not.toThrow();
  });
});
