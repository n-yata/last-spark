import type { SaveData, GameSettings } from '../types/save';
import { STORAGE_KEYS, SAVE_VERSION } from '../config/storageKeys';

// Persistence レイヤー: SaveData の読み書き・既定値生成・バージョン検証。
// プレイ継続を最優先し、localStorage が不可/破損でも throw しない。

/** 既定のユーザー設定。 */
export function defaultSettings(): GameSettings {
  return { muted: false, bgmVolume: 0.6, seVolume: 0.8 };
}

/** 既定のセーブデータ(未プレイ状態)。 */
export function defaultSaveData(): SaveData {
  return {
    version: SAVE_VERSION,
    cleared: false,
    bestTimeMs: undefined,
    settings: defaultSettings(),
  };
}

function isFiniteInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isValidSettings(value: unknown): value is GameSettings {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.muted === 'boolean' &&
    isFiniteInRange(s.bgmVolume, 0, 1) &&
    isFiniteInRange(s.seVolume, 0, 1)
  );
}

/**
 * 読み込んだ値が現行バージョンの SaveData として妥当かを検証する。
 * 型・version 一致・値域をチェックし、改ざん/破損で進行不能にならないようにする。
 */
export function isValidSaveData(value: unknown): value is SaveData {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Record<string, unknown>;
  if (d.version !== SAVE_VERSION) return false;
  if (typeof d.cleared !== 'boolean') return false;
  if (d.bestTimeMs !== undefined && !isFiniteInRange(d.bestTimeMs, 0, Number.MAX_SAFE_INTEGER)) {
    return false;
  }
  if (!isValidSettings(d.settings)) return false;
  return true;
}

export class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  /** 現在のセーブデータ(内部状態のコピー)を返す。 */
  getData(): SaveData {
    return { ...this.data, settings: { ...this.data.settings } };
  }

  /**
   * localStorage から読み込む。失敗・破損・バージョン不一致時は既定値を返す
   * (throw しない)。
   */
  load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.save);
      if (!raw) return defaultSaveData();
      const parsed: unknown = JSON.parse(raw);
      const valid = isValidSaveData(parsed) ? parsed : defaultSaveData();
      this.data = valid;
      return this.getData();
    } catch {
      // プライベートモード等で localStorage が例外を投げても進行不能にしない
      this.data = defaultSaveData();
      return this.getData();
    }
  }

  /** localStorage へ保存する。利用不可時は no-op + 警告ログ(throw しない)。 */
  save(data: SaveData): void {
    this.data = { ...data, settings: { ...data.settings } };
    try {
      localStorage.setItem(STORAGE_KEYS.save, JSON.stringify(this.data));
    } catch {
      console.warn('[SaveManager] セーブに失敗しました(localStorage 利用不可)。進捗は保存されません。');
    }
  }

  /** クリアを記録する。最速タイムのみ更新する。 */
  markCleared(timeMs: number): void {
    const next = this.getData();
    next.cleared = true;
    if (next.bestTimeMs === undefined || timeMs < next.bestTimeMs) {
      next.bestTimeMs = timeMs;
    }
    this.save(next);
  }

  /** 設定を部分更新して保存する。 */
  updateSettings(partial: Partial<GameSettings>): void {
    const next = this.getData();
    next.settings = { ...next.settings, ...partial };
    this.save(next);
  }
}
