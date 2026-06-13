import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SaveManager,
  defaultSaveData,
  isValidSaveData,
} from '../../../src/persistence/SaveManager';
import { STORAGE_KEYS, SAVE_VERSION } from '../../../src/config/storageKeys';

describe('defaultSaveData', () => {
  it('未プレイ状態の既定値を返す(clearedStages=[], bestTimeMs 未設定)', () => {
    const d = defaultSaveData();
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.clearedStages).toEqual([]);
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

  it('clearedStages が配列でない場合は不正', () => {
    const d = { ...defaultSaveData(), clearedStages: 'stage1' };
    expect(isValidSaveData(d)).toBe(false);
  });

  it('clearedStages に文字列以外が混ざる場合は不正', () => {
    const d = { ...defaultSaveData(), clearedStages: ['stage1', 2] };
    expect(isValidSaveData(d)).toBe(false);
  });

  it('bgmVolume が値域外(>1)の場合は不正', () => {
    const d = defaultSaveData();
    d.settings.bgmVolume = 1.5;
    expect(isValidSaveData(d)).toBe(false);
  });

  it('bestTimeMs に負値が含まれる場合は不正', () => {
    const d = { ...defaultSaveData(), bestTimeMs: { stage1: -100 } };
    expect(isValidSaveData(d)).toBe(false);
  });

  it('bestTimeMs が正しいレコードなら妥当', () => {
    const d = { ...defaultSaveData(), bestTimeMs: { stage1: 1000, stage3: 2000 } };
    expect(isValidSaveData(d)).toBe(true);
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

  it('markStageCleared でクリア状況とタイムをステージ単位で保存・復元できる', () => {
    const mgr = new SaveManager();
    mgr.markStageCleared('stage1', 12_345);
    mgr.markStageCleared('stage3', 67_890);
    const reloaded = new SaveManager();
    expect(reloaded.getData().clearedStages).toEqual(['stage1', 'stage3']);
    expect(reloaded.getData().bestTimeMs).toEqual({ stage1: 12_345, stage3: 67_890 });
    expect(reloaded.isStageCleared('stage3')).toBe(true);
    expect(reloaded.isStageCleared('stage2')).toBe(false);
  });

  it('同じステージを二重に記録しても clearedStages は重複しない', () => {
    const mgr = new SaveManager();
    mgr.markStageCleared('stage1', 10_000);
    mgr.markStageCleared('stage1', 9_000);
    expect(mgr.getData().clearedStages).toEqual(['stage1']);
  });

  it('markStageCleared はより速いタイムのみ更新する(ステージ別)', () => {
    const mgr = new SaveManager();
    mgr.markStageCleared('stage1', 20_000);
    mgr.markStageCleared('stage1', 30_000); // 遅いので更新されない
    expect(mgr.getData().bestTimeMs?.stage1).toBe(20_000);
    mgr.markStageCleared('stage1', 10_000); // 速いので更新される
    expect(mgr.getData().bestTimeMs?.stage1).toBe(10_000);
  });

  it('markCleared(旧API) は stage1 のクリアに委譲する', () => {
    const mgr = new SaveManager();
    mgr.markCleared(15_000);
    expect(mgr.getData().clearedStages).toEqual(['stage1']);
    expect(mgr.getData().bestTimeMs?.stage1).toBe(15_000);
  });

  it('v1 形式(cleared:true / bestTimeMs:number)を新形式へマイグレートする', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: 1,
        cleared: true,
        bestTimeMs: 8_888,
        settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8 },
      }),
    );
    const mgr = new SaveManager();
    expect(mgr.getData().version).toBe(SAVE_VERSION);
    expect(mgr.getData().clearedStages).toEqual(['stage1']);
    expect(mgr.getData().bestTimeMs).toEqual({ stage1: 8_888 });
  });

  it('v1 形式(cleared:false / bestTimeMs なし)は空クリアへマイグレートする', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: 1,
        cleared: false,
        settings: { muted: true, bgmVolume: 0.5, seVolume: 0.5 },
      }),
    );
    const mgr = new SaveManager();
    expect(mgr.getData().clearedStages).toEqual([]);
    expect(mgr.getData().bestTimeMs).toBeUndefined();
    expect(mgr.getData().settings.muted).toBe(true); // 設定は引き継ぐ
  });

  it('破損した JSON は既定値にフォールバックする', () => {
    localStorage.setItem(STORAGE_KEYS.save, '{ broken json');
    const mgr = new SaveManager();
    expect(mgr.getData()).toEqual(defaultSaveData());
  });

  it('移行不能な不正値は既定値にフォールバックする', () => {
    localStorage.setItem(STORAGE_KEYS.save, JSON.stringify({ version: 999, foo: 'bar' }));
    const mgr = new SaveManager();
    expect(mgr.getData()).toEqual(defaultSaveData());
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
    expect(() => mgr.markStageCleared('stage1', 1000)).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it('updateSettings は設定を部分更新して永続化する', () => {
    const mgr = new SaveManager();
    mgr.updateSettings({ muted: true });
    const reloaded = new SaveManager();
    expect(reloaded.getData().settings.muted).toBe(true);
    expect(reloaded.getData().settings.bgmVolume).toBe(0.6); // 他は維持
  });

  // ---- v2 → v3 マイグレーション ----

  it('v2(clearedStages+bestTimeMs+settings 正常)を v3 へマイグレートし既存進捗を維持する', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: 2,
        clearedStages: ['stage1', 'stage2'],
        bestTimeMs: { stage1: 12_345 },
        settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8 },
      }),
    );
    const mgr = new SaveManager();
    const data = mgr.getData();
    // バージョンが 3 に上がっている
    expect(data.version).toBe(SAVE_VERSION);
    // 既存のクリア進捗が失われていない
    expect(data.clearedStages).toEqual(['stage1', 'stage2']);
    // ベストタイムが失われていない
    expect(data.bestTimeMs).toEqual({ stage1: 12_345 });
    // settings が引き継がれている
    expect(data.settings).toEqual({ muted: false, bgmVolume: 0.6, seVolume: 0.8 });
    // collectedLogs が空配列で補完されている
    expect(data.collectedLogs).toEqual([]);
  });

  it('v2 で bestTimeMs を持たないデータも正しく v3 へマイグレートされる', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: 2,
        clearedStages: ['stage3'],
        settings: { muted: true, bgmVolume: 0.5, seVolume: 0.5 },
      }),
    );
    const mgr = new SaveManager();
    const data = mgr.getData();
    expect(data.version).toBe(SAVE_VERSION);
    expect(data.clearedStages).toEqual(['stage3']);
    // bestTimeMs がない場合は undefined のまま
    expect(data.bestTimeMs).toBeUndefined();
    expect(data.settings.muted).toBe(true);
    expect(data.collectedLogs).toEqual([]);
  });

  it('v2 で bestTimeMs が不正値の場合は既定値へフォールバックする', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: 2,
        clearedStages: ['stage1'],
        bestTimeMs: { stage1: -999 }, // 不正: 負値
        settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8 },
      }),
    );
    const mgr = new SaveManager();
    // 移行不能なので既定値にフォールバックする
    expect(mgr.getData()).toEqual(defaultSaveData());
  });

  // ---- v1 マイグレーション回帰 + collectedLogs 補完 ----

  it('v1(cleared:true)のマイグレーション後に collectedLogs:[] が含まれる', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: 1,
        cleared: true,
        bestTimeMs: 8_888,
        settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8 },
      }),
    );
    const mgr = new SaveManager();
    const data = mgr.getData();
    expect(data.version).toBe(SAVE_VERSION);
    expect(data.clearedStages).toEqual(['stage1']);
    expect(data.bestTimeMs).toEqual({ stage1: 8_888 });
    // v1 マイグレーション後も collectedLogs:[] が補完されている
    expect(data.collectedLogs).toEqual([]);
  });

  it('v1(cleared:false)のマイグレーション後に collectedLogs:[] が含まれる', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: 1,
        cleared: false,
        settings: { muted: true, bgmVolume: 0.5, seVolume: 0.5 },
      }),
    );
    const mgr = new SaveManager();
    const data = mgr.getData();
    expect(data.version).toBe(SAVE_VERSION);
    expect(data.clearedStages).toEqual([]);
    expect(data.bestTimeMs).toBeUndefined();
    expect(data.collectedLogs).toEqual([]);
  });

  // ---- markLogCollected / getCollectedLogs ----

  it('markLogCollected でキーが collectedLogs に追加される', () => {
    const mgr = new SaveManager();
    mgr.markLogCollected('stage1', 'early');
    expect(mgr.getData().collectedLogs).toEqual(['stage1:early']);
  });

  it('markLogCollected は同じキーを2回呼んでも重複しない', () => {
    const mgr = new SaveManager();
    mgr.markLogCollected('stage1', 'early');
    mgr.markLogCollected('stage1', 'early'); // 2回目
    expect(mgr.getData().collectedLogs).toEqual(['stage1:early']);
  });

  it('markLogCollected の結果が localStorage に永続化され別インスタンスで復元できる', () => {
    const mgr = new SaveManager();
    mgr.markLogCollected('stage1', 'early');
    mgr.markLogCollected('stage3', 'mid');
    // 別インスタンスを生成してリロード相当の検証
    const reloaded = new SaveManager();
    expect(reloaded.getData().collectedLogs).toEqual(['stage1:early', 'stage3:mid']);
  });

  it('getCollectedLogs が保存済みキー配列を返す', () => {
    const mgr = new SaveManager();
    mgr.markLogCollected('stage2', 'late');
    mgr.markLogCollected('stage4', 'early');
    expect(mgr.getCollectedLogs()).toEqual(['stage2:late', 'stage4:early']);
  });

  it('getCollectedLogs はコピーを返す(返り値の変更が内部状態に影響しない)', () => {
    const mgr = new SaveManager();
    mgr.markLogCollected('stage1', 'early');
    const logs = mgr.getCollectedLogs();
    logs.push('tampered:value');
    // 内部状態は変化していない
    expect(mgr.getCollectedLogs()).toEqual(['stage1:early']);
  });

  // ---- isValidSaveData: collectedLogs バリデーション ----

  it('isValidSaveData: collectedLogs を欠く v3 データは不正と判定する', () => {
    const d = {
      version: SAVE_VERSION,
      clearedStages: [],
      bestTimeMs: undefined,
      // collectedLogs を意図的に省略
      settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8 },
    };
    expect(isValidSaveData(d)).toBe(false);
  });

  it('isValidSaveData: collectedLogs が配列でない v3 データは不正と判定する', () => {
    const d = {
      version: SAVE_VERSION,
      clearedStages: [],
      bestTimeMs: undefined,
      collectedLogs: 'stage1:early', // 文字列は不正
      settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8 },
    };
    expect(isValidSaveData(d)).toBe(false);
  });

  it('isValidSaveData: collectedLogs に文字列以外が混ざる場合は不正と判定する', () => {
    const d = {
      version: SAVE_VERSION,
      clearedStages: [],
      bestTimeMs: undefined,
      collectedLogs: ['stage1:early', 42], // 数値混入
      settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8 },
    };
    expect(isValidSaveData(d)).toBe(false);
  });

  it('isValidSaveData: collectedLogs が正常な文字列配列の v3 データは妥当と判定する', () => {
    const d = {
      version: SAVE_VERSION,
      clearedStages: ['stage1'],
      bestTimeMs: { stage1: 10_000 },
      collectedLogs: ['stage1:early', 'stage3:mid'],
      settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8 },
    };
    expect(isValidSaveData(d)).toBe(true);
  });

  // ---- localStorage エラー時のフォールバック ----

  it('localStorage.setItem が例外を投げても markLogCollected は throw しない', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const mgr = new SaveManager();
    expect(() => mgr.markLogCollected('stage1', 'early')).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});
