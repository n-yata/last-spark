// localStorage のキー定数(名前空間付き)。

export const STORAGE_KEYS = {
  save: 'lastspark:save',
} as const;

/** 現在のセーブ構造バージョン。構造変更時にインクリメントする。 */
export const SAVE_VERSION = 1;
