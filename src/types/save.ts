// 永続データの型定義。localStorage に保存される(完全オフライン)。

export interface GameSettings {
  /** サウンドミュート(モバイル自動再生制約に配慮、既定 false) */
  muted: boolean;
  /** BGM 音量 0.0–1.0 */
  bgmVolume: number;
  /** SE 音量 0.0–1.0 */
  seVolume: number;
}

export interface SaveData {
  /** セーブ構造のバージョン(マイグレーション用) */
  version: number;
  /** クリア済みステージ ID の配列(旧 cleared:boolean から移行)。 */
  clearedStages: string[];
  /** ステージ別クリア最速タイム(ミリ秒)。未クリアのステージはキーを持たない。 */
  bestTimeMs?: Record<string, number>;
  /** 取得済みログのキー配列(形式 "stageId:slot" 例: "stage6:early")。LogViewerScene で閲覧する。 */
  collectedLogs: string[];
  /** ユーザー設定 */
  settings: GameSettings;
}
