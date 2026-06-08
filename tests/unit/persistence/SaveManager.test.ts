import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SaveManager,
  defaultSaveData,
  isValidSaveData,
} from '../../../src/persistence/SaveManager';
import { STORAGE_KEYS, SAVE_VERSION } from '../../../src/config/storageKeys';

describe('defaultSaveData', () => {
  it('未プレイ状態の既定値を返す(cleared=false, bestTimeMs 未設定)', () => {
    const d = defaultSaveData();
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.cleared).toBe(false);
    expect(d.bestTimeMs).toBeUndefined();
    expect(d.settings).toEqual({ muted: false, bgmVolume: 0.6, seVolume: 0.8 });
  });
});

describe('isValidSaveData', () => {
  it('正しい構造のデータを妥当と判定する', () => {
    expect(isValidSaveData(defaultSaveData())).toBe(true);
  });

  it('version 不一致は不正と判定する', () => {
    const d = { ...defaultSaveData(), version: SAVE_VERSION + 1 };
    expect(isValidSaveData(d)).toBe(false);
  });

  it('cleared が boolean でない場合は不正', () => {
    const d = { ...defaultSaveData(), cleared: 'yes' };
    expect(isValidSaveData(d)).toBe(false);
  });

  it('bgmVolume が値域外(>1)の場合は不正', () => {
    const d = defaultSaveData();
    d.settings.bgmVolume = 1.5;
    expect(isValidSaveData(d)).toBe(false);
  });

  it('bestTimeMs が負値の場合は不正', () => {
    const d = { ...defaultSaveData(), bestTimeMs: -100 };
    expect(isValidSaveData(d)).toBe(false);
  });

  it('null や非オブジェクトは不正', () => {
    expect(isValidSaveData(null)).toBe(false);
    expect(isValidSaveData('string')).toBe(false);
    expect(isValidSaveData(42)).toBe(false);
  });
});

describe('SaveManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('未保存状態では既定値をロードする', () => {
    const mgr = new SaveManager();
    expect(mgr.getData()).toEqual(defaultSaveData());
  });

  it('保存したクリア状況をロードで復元できる', () => {
    const mgr = new SaveManager();
    mgr.markCleared(12_345);
    const reloaded = new SaveManager();
    expect(reloaded.getData().cleared).toBe(true);
    expect(reloaded.getData().bestTimeMs).toBe(12_345);
  });

  it('markCleared はより速いタイムのみ更新する', () => {
    const mgr = new SaveManager();
    mgr.markCleared(20_000);
    mgr.markCleared(30_000); // 遅いので更新されない
    expect(mgr.getData().bestTimeMs).toBe(20_000);
    mgr.markCleared(10_000); // 速いので更新される
    expect(mgr.getData().bestTimeMs).toBe(10_000);
  });

  it('破損した JSON は既定値にフォールバックする', () => {
    localStorage.setItem(STORAGE_KEYS.save, '{ broken json');
    const mgr = new SaveManager();
    expect(mgr.getData()).toEqual(defaultSaveData());
  });

  it('version 不一致の保存値は既定値にフォールバックする', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({ ...defaultSaveData(), version: 999, cleared: true }),
    );
    const mgr = new SaveManager();
    expect(mgr.getData().cleared).toBe(false);
  });

  it('localStorage.getItem が例外を投げても throw せず既定値を返す', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied');
    });
    expect(() => new SaveManager()).not.toThrow();
    const mgr = new SaveManager();
    expect(mgr.getData()).toEqual(defaultSaveData());
  });

  it('localStorage.setItem が例外を投げても throw せず警告ログを出す', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const mgr = new SaveManager();
    expect(() => mgr.markCleared(1000)).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it('updateSettings は設定を部分更新して永続化する', () => {
    const mgr = new SaveManager();
    mgr.updateSettings({ muted: true });
    const reloaded = new SaveManager();
    expect(reloaded.getData().settings.muted).toBe(true);
    expect(reloaded.getData().settings.bgmVolume).toBe(0.6); // 他は維持
  });
});
