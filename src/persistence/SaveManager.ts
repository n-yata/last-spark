import { STAGE_RANK_ORDER, type SaveData, type GameSettings, type DifficultyMode, type GraphicsFxMode, type StageRank } from '../types/save';
import { STORAGE_KEYS, SAVE_VERSION } from '../config/storageKeys';

// Persistence レイヤー: SaveData の読み書き・既定値生成・バージョン検証・旧形式マイグレーション。
// プレイ継続を最優先し、localStorage が不可/破損でも throw しない。

/** 既定のユーザー設定。 */
export function defaultSettings(): GameSettings {
  return {
    muted: false,
    bgmVolume: 0.6,
    seVolume: 0.8,
    difficulty: 'normal',
    busterMode: false,
    vibration: true,
    graphicsFx: 'auto',
  };
}

/** 既定のセーブデータ(未プレイ状態)。 */
export function defaultSaveData(): SaveData {
  return {
    version: SAVE_VERSION,
    clearedStages: [],
    bestTimeMs: undefined,
    loopCount: 1,
    settings: defaultSettings(),
  };
}

function isFiniteInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/** loopCount が「1以上の有限整数」かを検証する。 */
function isValidLoopCount(value: unknown): value is number {
  return isFiniteInRange(value, 1, Number.MAX_SAFE_INTEGER) && Number.isInteger(value);
}

function isDifficultyMode(value: unknown): value is DifficultyMode {
  return value === 'normal' || value === 'hard';
}

function isGraphicsFxMode(value: unknown): value is GraphicsFxMode {
  return value === 'auto' || value === 'high' || value === 'off';
}

function normalizeSettings(value: unknown): GameSettings | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const s = value as Record<string, unknown>;
  if (typeof s.muted !== 'boolean') return undefined;
  if (!isFiniteInRange(s.bgmVolume, 0, 1)) return undefined;
  if (!isFiniteInRange(s.seVolume, 0, 1)) return undefined;
  if (s.difficulty !== undefined && !isDifficultyMode(s.difficulty)) return undefined;
  if (s.busterMode !== undefined && typeof s.busterMode !== 'boolean') return undefined;
  if (s.vibration !== undefined && typeof s.vibration !== 'boolean') return undefined;
  if (s.graphicsFx !== undefined && !isGraphicsFxMode(s.graphicsFx)) return undefined;
  return {
    muted: s.muted,
    bgmVolume: s.bgmVolume,
    seVolume: s.seVolume,
    difficulty: s.difficulty ?? 'normal',
    busterMode: s.busterMode ?? false,
    vibration: s.vibration ?? true,
    graphicsFx: s.graphicsFx ?? 'auto',
  };
}

function isValidSettings(value: unknown): value is GameSettings {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    normalizeSettings(value) !== undefined &&
    isDifficultyMode(s.difficulty) &&
    typeof s.busterMode === 'boolean' &&
    typeof s.vibration === 'boolean'
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

/** bestRank(任意)が「ステージID→'S'|'A'|'B'」のレコードかを検証する。 */
function isValidBestRanks(value: unknown): value is Record<string, StageRank> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (v) => v === 'S' || v === 'A' || v === 'B',
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
  if (d.bestRank !== undefined && !isValidBestRanks(d.bestRank)) return false;
  if (!isValidLoopCount(d.loopCount)) return false;
  if (!isValidSettings(d.settings)) return false;
  return true;
}

/**
 * 旧形式を現行形式へ移行する。
 * - v2〜v6 (clearedStages:string[] / bestTimeMs:Record): difficulty・busterMode・vibration・
 *   loopCount を補完して移行する。(v2/v3 は difficulty なし→normal、v4 は busterMode なし→false、
 *   v6 以下は vibration なし→true を normalizeSettings が補完し、v5 以下は loopCount なし→1 を補完する)
 * - v1 (cleared:boolean / bestTimeMs:number): clearedStages を配列化して移行する。
 * 移行できない/不正な場合は undefined を返し、呼び出し側で既定値へフォールバックさせる。
 * 注記: かつての v3 は collectedLogs を持っていたが撤去済み。当時の v3 セーブに残る余分な
 * collectedLogs フィールドは isValidSaveData では無視され、そのまま読み込める。
 */
function migrate(value: unknown): SaveData | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const d = value as Record<string, unknown>;

  // v2〜v6 → 現行: 進捗を保持し、settings の不足フィールド(difficulty/busterMode/vibration)と
  // loopCount を補完して version を引き上げる。
  // これを欠くと既存プレイヤーの v2〜v6 セーブが既定値へ初期化され、クリア進捗が失われる。
  const migratedSettings = normalizeSettings(d.settings);
  if (
    (d.version === 2 || d.version === 3 || d.version === 4 || d.version === 5 || d.version === 6) &&
    isStringArray(d.clearedStages) &&
    migratedSettings
  ) {
    if (d.bestTimeMs !== undefined && !isValidBestTimes(d.bestTimeMs)) return undefined;
    return {
      version: SAVE_VERSION,
      clearedStages: [...(d.clearedStages as string[])],
      bestTimeMs: isValidBestTimes(d.bestTimeMs) ? { ...(d.bestTimeMs as Record<string, number>) } : undefined,
      loopCount: isValidLoopCount(d.loopCount) ? d.loopCount : 1,
      settings: migratedSettings,
    };
  }

  // v1 → 現行(version 未指定・不一致で cleared:boolean を持つもの)。
  if (typeof d.cleared !== 'boolean') return undefined;
  const legacySettings = normalizeSettings(d.settings);
  if (!legacySettings) return undefined;

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
    loopCount: 1,
    settings: legacySettings,
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
      bestRank: this.data.bestRank ? { ...this.data.bestRank } : undefined,
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
        // graphicsFx はバージョン据え置きの任意フィールドのため、現行形式でも欠けていることが
        // ある。normalizeSettings を通して既定値('auto')を補完する(完全な settings には no-op)。
        valid = { ...parsed, settings: normalizeSettings(parsed.settings) ?? defaultSettings() };
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
      bestRank: data.bestRank ? { ...data.bestRank } : undefined,
      settings: { ...data.settings },
    };
    try {
      localStorage.setItem(STORAGE_KEYS.save, JSON.stringify(this.data));
    } catch {
      console.warn('[SaveManager] セーブに失敗しました(localStorage 利用不可)。進捗は保存されません。');
    }
  }

  /** 指定ステージのクリアを記録する。最速タイム・最高ランク(S > A > B)のみ更新する。 */
  markStageCleared(stageId: string, timeMs?: number, rank?: StageRank): void {
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
    if (rank !== undefined) {
      const ranks = next.bestRank ?? {};
      const prev = ranks[stageId];
      if (prev === undefined || STAGE_RANK_ORDER[rank] > STAGE_RANK_ORDER[prev]) {
        next.bestRank = { ...ranks, [stageId]: rank };
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

  /** 設定を部分更新して保存する。 */
  updateSettings(partial: Partial<GameSettings>): void {
    const next = this.getData();
    next.settings = { ...next.settings, ...partial };
    this.save(next);
  }

  /**
   * 次の周回へ進む。loopCount を+1し、clearedStages をリセットして stage1 から
   * 再開できる状態にする。bestTimeMs / bestRank(過去の記録)は周回に関係しない記録なので保持する。
   */
  advanceLoop(): void {
    const next = this.getData();
    next.loopCount += 1;
    next.clearedStages = [];
    this.save(next);
  }
}
