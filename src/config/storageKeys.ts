// localStorage のキー定数(名前空間付き)。

export const STORAGE_KEYS = {
  save: 'lastspark:save',
} as const;

/** 現在のセーブ構造バージョン。構造変更時にインクリメントする。 */
// v1: cleared:boolean / bestTimeMs:number(単一ステージ)
// v2: clearedStages:string[] / bestTimeMs:Record<string,number>(全6ステージ対応)
// v3: collectedLogs:string[] を一時導入したが撤去。現行構造は v2 と同一だが、当時の v3 セーブ
//     との互換のため version 番号は据え置いた(余分な collectedLogs フィールドは読み込み時に無視)。
// v4: settings.difficulty を追加。旧セーブは normal を補完して移行する。
export const SAVE_VERSION = 4;
