import { describe, expect, it } from 'vitest';
import { isCoreDamageOpen, shouldOpenCoreExposure } from '../../../src/systems/coreExposure';

describe('shouldOpenCoreExposure', () => {
  it('phase1 で掃討待ちかつ配下が 0 なら露出を開く', () => {
    expect(shouldOpenCoreExposure('phase1', true, 0)).toBe(true);
  });

  it('phase1 でも配下が残っている間は露出を開かない', () => {
    expect(shouldOpenCoreExposure('phase1', true, 1)).toBe(false);
  });

  it('phase2 では露出待ち判定を使わない', () => {
    expect(shouldOpenCoreExposure('phase2', true, 0)).toBe(false);
  });
});

describe('isCoreDamageOpen', () => {
  it('phase1 は露出ウィンドウ中のみダメージが通る', () => {
    expect(isCoreDamageOpen('phase1', 1500, 1000)).toBe(true);
    expect(isCoreDamageOpen('phase1', 1500, 1500)).toBe(false);
  });

  it('phase2 は常にダメージが通る', () => {
    expect(isCoreDamageOpen('phase2', 0, 99999)).toBe(true);
  });
});
