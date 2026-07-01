import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SaveManager,
  defaultSaveData,
  isValidSaveData,
} from '../../../src/persistence/SaveManager';
import { STORAGE_KEYS, SAVE_VERSION } from '../../../src/config/storageKeys';

const DEFAULT_SETTINGS = {
  muted: false,
  bgmVolume: 0.6,
  seVolume: 0.8,
  difficulty: 'normal',
  busterMode: false,
  vibration: true,
} as const;

describe('defaultSaveData', () => {
  it('未プレイ状態の既定値を返す(clearedStages=[], bestTimeMs 未設定, loopCount=1)', () => {
    const d = defaultSaveData();
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.clearedStages).toEqual([]);
    expect(d.bestTimeMs).toBeUndefined();
    expect(d.loopCount).toBe(1);
    expect(d.settings).toEqual(DEFAULT_SETTINGS);
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

  it('loopCount が0以下の場合は不正', () => {
    const d = { ...defaultSaveData(), loopCount: 0 };
    expect(isValidSaveData(d)).toBe(false);
  });

  it('loopCount が整数でない場合は不正', () => {
    const d = { ...defaultSaveData(), loopCount: 1.5 };
    expect(isValidSaveData(d)).toBe(false);
  });

  it('loopCount を欠く場合は不正', () => {
    const withoutLoopCount: Record<string, unknown> = { ...defaultSaveData() };
    delete withoutLoopCount.loopCount;
    expect(isValidSaveData(withoutLoopCount)).toBe(false);
  });

  it('loopCount が2以上でも妥当', () => {
    const d = { ...defaultSaveData(), loopCount: 3 };
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
    mgr.updateSettings({ muted: true, difficulty: 'hard' });
    const reloaded = new SaveManager();
    expect(reloaded.getData().settings.muted).toBe(true);
    expect(reloaded.getData().settings.difficulty).toBe('hard');
    expect(reloaded.getData().settings.bgmVolume).toBe(0.6); // 他は維持
  });

  // ---- v2/v3 → v4 マイグレーション ----

  it('v2(clearedStages+bestTimeMs+settings 正常)を現行版へマイグレートし既存進捗を維持する', () => {
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
    // バージョンが現行版に上がっている
    expect(data.version).toBe(SAVE_VERSION);
    // 既存のクリア進捗が失われていない
    expect(data.clearedStages).toEqual(['stage1', 'stage2']);
    // ベストタイムが失われていない
    expect(data.bestTimeMs).toEqual({ stage1: 12_345 });
    // settings が引き継がれている
    expect(data.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('v2 で bestTimeMs を持たないデータも正しく現行版へマイグレートされる', () => {
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
    expect(data.settings.difficulty).toBe('normal');
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

  // ---- v1 マイグレーション回帰(version のみ引き上げ) ----

  it('v1(cleared:true)を現行バージョンへマイグレートする', () => {
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
  });

  it('v1(cleared:false)を現行バージョンへマイグレートする', () => {
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
  });

  // ---- 旧 v3 セーブとの互換(余分な collectedLogs フィールドは無視) ----

  it('当時の v3 セーブ(余分な collectedLogs 付き)も進捗を保って現行版へ移行できる', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: 3,
        clearedStages: ['stage1'],
        bestTimeMs: { stage1: 10_000 },
        collectedLogs: ['stage1:early', 'stage3:mid'], // 撤去済みフィールド
        settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8 },
      }),
    );
    const mgr = new SaveManager();
    const data = mgr.getData();
    // クリア進捗・ベストタイム・設定は失われずに読み込める(余分な collectedLogs は無害)
    expect(data.version).toBe(SAVE_VERSION);
    expect(data.clearedStages).toEqual(['stage1']);
    expect(data.bestTimeMs).toEqual({ stage1: 10_000 });
    expect(data.settings.bgmVolume).toBe(0.6);
    expect(data.settings.difficulty).toBe('normal');
  });

  it('現行版の difficulty: hard を保存・復元できる', () => {
    const mgr = new SaveManager();
    mgr.updateSettings({ difficulty: 'hard' });
    const reloaded = new SaveManager();
    expect(reloaded.getData().settings.difficulty).toBe('hard');
  });

  // ---- v4 → v5 マイグレーション(busterMode 補完) ----

  it('v4(difficulty あり/busterMode なし)を現行版へ移行し busterMode=false を補完する', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: 4,
        clearedStages: ['stage1', 'stage2', 'stage3'],
        bestTimeMs: { stage1: 11_111, stage3: 33_333 },
        settings: { muted: true, bgmVolume: 0.4, seVolume: 0.7, difficulty: 'hard' },
      }),
    );
    const mgr = new SaveManager();
    const data = mgr.getData();
    // バージョンが現行版へ上がっている
    expect(data.version).toBe(SAVE_VERSION);
    // クリア進捗・ベストタイムが失われていない
    expect(data.clearedStages).toEqual(['stage1', 'stage2', 'stage3']);
    expect(data.bestTimeMs).toEqual({ stage1: 11_111, stage3: 33_333 });
    // 既存の設定(難易度・音量)は引き継がれる
    expect(data.settings.difficulty).toBe('hard');
    expect(data.settings.muted).toBe(true);
    expect(data.settings.bgmVolume).toBe(0.4);
    // busterMode は false で補完される
    expect(data.settings.busterMode).toBe(false);
  });

  // ---- busterMode の保存・復元・検証 ----

  it('busterMode: true を保存・復元できる', () => {
    const mgr = new SaveManager();
    mgr.updateSettings({ busterMode: true });
    const reloaded = new SaveManager();
    expect(reloaded.getData().settings.busterMode).toBe(true);
    // 他の設定は維持される
    expect(reloaded.getData().settings.difficulty).toBe('normal');
  });

  it('busterMode が boolean 以外のセーブは既定値へフォールバックする', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: SAVE_VERSION,
        clearedStages: ['stage1'],
        settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8, difficulty: 'normal', busterMode: 'yes' },
      }),
    );
    const mgr = new SaveManager();
    expect(mgr.getData()).toEqual(defaultSaveData());
  });

  it('現行版で busterMode フィールドを欠くセーブは妥当でない(isValidSaveData)', () => {
    const withoutBuster = {
      version: SAVE_VERSION,
      clearedStages: [],
      loopCount: 1,
      settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8, difficulty: 'normal' },
    };
    expect(isValidSaveData(withoutBuster)).toBe(false);
  });

  // ---- v5 → v6 マイグレーション(loopCount 補完) ----

  it('v5(loopCount なし)を現行版へ移行し loopCount=1 を補完する', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: 5,
        clearedStages: ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6'],
        bestTimeMs: { stage1: 11_111, stage6: 66_666 },
        settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8, difficulty: 'hard', busterMode: true },
      }),
    );
    const mgr = new SaveManager();
    const data = mgr.getData();
    expect(data.version).toBe(SAVE_VERSION);
    expect(data.clearedStages).toEqual(['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6']);
    expect(data.bestTimeMs).toEqual({ stage1: 11_111, stage6: 66_666 });
    expect(data.loopCount).toBe(1);
    expect(data.settings.difficulty).toBe('hard');
    expect(data.settings.busterMode).toBe(true);
  });

  it('v1(cleared:true)を現行バージョンへマイグレートすると loopCount=1 が補完される', () => {
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
    expect(mgr.getData().loopCount).toBe(1);
  });

  // ---- v6 → v7 マイグレーション(vibration 補完) ----

  it('v6(vibration なし)を現行版へ移行し vibration=true を補完する(進捗・設定は維持)', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: 6,
        clearedStages: ['stage1', 'stage2'],
        bestTimeMs: { stage1: 12_345 },
        loopCount: 3,
        settings: { muted: true, bgmVolume: 0.4, seVolume: 0.7, difficulty: 'hard', busterMode: true },
      }),
    );
    const mgr = new SaveManager();
    const data = mgr.getData();
    expect(data.version).toBe(SAVE_VERSION);
    // クリア進捗・ベストタイム・周回数が失われていない
    expect(data.clearedStages).toEqual(['stage1', 'stage2']);
    expect(data.bestTimeMs).toEqual({ stage1: 12_345 });
    expect(data.loopCount).toBe(3);
    // 既存の設定は引き継がれ、vibration は true で補完される
    expect(data.settings.difficulty).toBe('hard');
    expect(data.settings.busterMode).toBe(true);
    expect(data.settings.muted).toBe(true);
    expect(data.settings.vibration).toBe(true);
  });

  // ---- vibration の保存・復元・検証 ----

  it('vibration: false を保存・復元できる', () => {
    const mgr = new SaveManager();
    mgr.updateSettings({ vibration: false });
    const reloaded = new SaveManager();
    expect(reloaded.getData().settings.vibration).toBe(false);
    // 他の設定は維持される
    expect(reloaded.getData().settings.busterMode).toBe(false);
  });

  it('vibration が boolean 以外のセーブは既定値へフォールバックする', () => {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({
        version: SAVE_VERSION,
        clearedStages: ['stage1'],
        loopCount: 1,
        settings: {
          muted: false,
          bgmVolume: 0.6,
          seVolume: 0.8,
          difficulty: 'normal',
          busterMode: false,
          vibration: 'on',
        },
      }),
    );
    const mgr = new SaveManager();
    expect(mgr.getData()).toEqual(defaultSaveData());
  });

  it('現行版で vibration フィールドを欠くセーブは妥当でない(isValidSaveData)', () => {
    const withoutVibration = {
      version: SAVE_VERSION,
      clearedStages: [],
      loopCount: 1,
      settings: { muted: false, bgmVolume: 0.6, seVolume: 0.8, difficulty: 'normal', busterMode: false },
    };
    expect(isValidSaveData(withoutVibration)).toBe(false);
  });

  // ---- advanceLoop ----

  describe('advanceLoop', () => {
    it('loopCount を+1し、clearedStages をリセットするが bestTimeMs は保持する', () => {
      const mgr = new SaveManager();
      mgr.markStageCleared('stage1', 10_000);
      mgr.markStageCleared('stage6', 60_000);
      expect(mgr.getData().loopCount).toBe(1);

      mgr.advanceLoop();

      const data = mgr.getData();
      expect(data.loopCount).toBe(2);
      expect(data.clearedStages).toEqual([]);
      expect(data.bestTimeMs).toEqual({ stage1: 10_000, stage6: 60_000 });
    });

    it('複数回呼ぶたびに loopCount が積み上がる', () => {
      const mgr = new SaveManager();
      mgr.advanceLoop();
      mgr.advanceLoop();
      mgr.advanceLoop();
      expect(mgr.getData().loopCount).toBe(4);
    });

    it('保存され、再読み込み後も loopCount と bestTimeMs が維持される', () => {
      const mgr = new SaveManager();
      mgr.markStageCleared('stage1', 5_000);
      mgr.advanceLoop();
      const reloaded = new SaveManager();
      expect(reloaded.getData().loopCount).toBe(2);
      expect(reloaded.getData().clearedStages).toEqual([]);
      expect(reloaded.getData().bestTimeMs).toEqual({ stage1: 5_000 });
    });
  });
});
