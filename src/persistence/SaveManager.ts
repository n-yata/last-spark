import type { SaveData, GameSettings } from '../types/save';
import { STORAGE_KEYS, SAVE_VERSION } from '../config/storageKeys';

// Persistence レイヤー: SaveData の読み書き・既定値生成・バージョン検証・旧形式マイグレーション。
// プレイ継続を最優先し、localStorage が不可/破損でも throw しない。

/** 既定のユーザー設定。 */
export function defaultSettings(): GameSettings {
  return { muted: false, bgmVolume: 0.6, seVolume: 0.8 };
}

/** 既定のセーブデータ(未プレイ状態)。 */
export function defaultSaveData(): SaveData {
  return {
    version: SAVE_VERSION,
    clearedStages: [],
    bestTimeMs: undefined,
    collectedLogs: [],
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

/** clearedStages が「文字列の配列」かを検証する。 */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/** bestTimeMs(任意)が「ステージID→非負有限数」のレコードかを検証する。 */
function isValidBestTimes(value: unknown): value is Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((v) =>
    isFiniteInRange(v, 0, Number.MAX_SAFE_INTEGER),
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
  if (!isStringArray(d.clearedStages)) return false;
  if (d.bestTimeMs !== undefined && !isValidBestTimes(d.bestTimeMs)) return false;
  if (!isStringArray(d.collectedLogs)) return false;
  if (!isValidSettings(d.settings)) return false;
  return true;
}

/**
 * 旧形式を現行形式へ移行する。
 * - v2 (clearedStages:string[] / bestTimeMs:Record): collectedLogs を欠くだけなので [] を補完する。
 * - v1 (cleared:boolean / bestTimeMs:number): clearedStages 配列化 + collectedLogs:[] を補完する。
 * 移行できない/不正な場合は undefined を返し、呼び出し側で既定値へフォールバックさせる。
 */
function migrate(value: unknown): SaveData | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const d = value as Record<string, unknown>;

  // v2 → v3: 既存の進捗(clearedStages / bestTimeMs / settings)を保持したまま collectedLogs:[] を補完。
  // これを欠くと既存プレイヤーの v2 セーブが既定値へ初期化され、クリア進捗が失われる。
  if (d.version === 2 && isStringArray(d.clearedStages) && isValidSettings(d.settings)) {
    if (d.bestTimeMs !== undefined && !isValidBestTimes(d.bestTimeMs)) return undefined;
    return {
      version: SAVE_VERSION,
      clearedStages: [...(d.clearedStages as string[])],
      bestTimeMs: isValidBestTimes(d.bestTimeMs) ? { ...(d.bestTimeMs as Record<string, number>) } : undefined,
      collectedLogs: [],
      settings: { ...(d.settings as GameSettings) },
    };
  }

  // v1 → v3(version 未指定・不一致で cleared:boolean を持つもの)。
  if (typeof d.cleared !== 'boolean') return undefined;
  if (!isValidSettings(d.settings)) return undefined;

  const clearedStages = d.cleared ? ['stage1'] : [];
  let bestTimeMs: Record<string, number> | undefined;
  // 旧 bestTimeMs:number はステージ1のタイムとして移行する。
  if (isFiniteInRange(d.bestTimeMs, 0, Number.MAX_SAFE_INTEGER)) {
    bestTimeMs = { stage1: d.bestTimeMs };
  }
  return {
    version: SAVE_VERSION,
    clearedStages,
    bestTimeMs,
    collectedLogs: [],
    settings: { ...(d.settings as GameSettings) },
  };
}

export class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  /** 現在のセーブデータ(内部状態のコピー)を返す。 */
  getData(): SaveData {
    return {
      ...this.data,
      clearedStages: [...this.data.clearedStages],
      bestTimeMs: this.data.bestTimeMs ? { ...this.data.bestTimeMs } : undefined,
      collectedLogs: [...this.data.collectedLogs],
      settings: { ...this.data.settings },
    };
  }

  /**
   * localStorage から読み込む。現行形式ならそのまま、旧形式ならマイグレーションを試み、
   * 失敗・破損・移行不能時は既定値を返す(throw しない)。
   */
  load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.save);
      if (!raw) {
        this.data = defaultSaveData();
        return this.getData();
      }
      const parsed: unknown = JSON.parse(raw);
      let valid: SaveData;
      if (isValidSaveData(parsed)) {
        valid = parsed;
      } else {
        // 現行形式でなければ旧形式からの移行を試みる。
        valid = migrate(parsed) ?? defaultSaveData();
      }
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
    this.data = {
      ...data,
      clearedStages: [...data.clearedStages],
      bestTimeMs: data.bestTimeMs ? { ...data.bestTimeMs } : undefined,
      collectedLogs: [...data.collectedLogs],
      settings: { ...data.settings },
    };
    try {
      localStorage.setItem(STORAGE_KEYS.save, JSON.stringify(this.data));
    } catch {
      console.warn('[SaveManager] セーブに失敗しました(localStorage 利用不可)。進捗は保存されません。');
    }
  }

  /** 指定ステージのクリアを記録する。最速タイムのみ更新する。 */
  markStageCleared(stageId: string, timeMs?: number): void {
    const next = this.getData();
    if (!next.clearedStages.includes(stageId)) {
      next.clearedStages = [...next.clearedStages, stageId];
    }
    if (timeMs !== undefined && Number.isFinite(timeMs) && timeMs >= 0) {
      const times = next.bestTimeMs ?? {};
      const prev = times[stageId];
      if (prev === undefined || timeMs < prev) {
        next.bestTimeMs = { ...times, [stageId]: timeMs };
      }
    }
    this.save(next);
  }

  /** 旧 API 互換: ステージ1のクリアとして記録する。 */
  markCleared(timeMs: number): void {
    this.markStageCleared('stage1', timeMs);
  }

  /** 指定ステージがクリア済みか。 */
  isStageCleared(stageId: string): boolean {
    return this.data.clearedStages.includes(stageId);
  }

  /** ログ取得を記録する。キーは "stageId:slot"。重複は追加しない。 */
  markLogCollected(stageId: string, slot: string): void {
    const key = `${stageId}:${slot}`;
    if (this.data.collectedLogs.includes(key)) return;
    const next = this.getData();
    next.collectedLogs = [...next.collectedLogs, key];
    this.save(next);
  }

  /** 取得済みログのキー配列("stageId:slot")を返す。 */
  getCollectedLogs(): string[] {
    return [...this.data.collectedLogs];
  }

  /** 設定を部分更新して保存する。 */
  updateSettings(partial: Partial<GameSettings>): void {
    const next = this.getData();
    next.settings = { ...next.settings, ...partial };
    this.save(next);
  }
}
