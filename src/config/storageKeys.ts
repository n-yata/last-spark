// localStorage のキー定数(名前空間付き)。

export const STORAGE_KEYS = {
  save: 'lastspark:save',
} as const;

/** 現在のセーブ構造バージョン。構造変更時にインクリメントする。 */
// v1: cleared:boolean / bestTimeMs:number(単一ステージ)
// v2: clearedStages:string[] / bestTimeMs:Record<string,number>(全6ステージ対応)
// v3: collectedLogs:string[] 追加(取得済みログの閲覧用)。v2 からは collectedLogs:[] を補完して移行。
export const SAVE_VERSION = 3;
