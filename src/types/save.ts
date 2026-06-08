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
  /** ステージ1(ボス)をクリア済みか */
  cleared: boolean;
  /** ステージクリア最速タイム(ミリ秒)。未クリアは undefined */
  bestTimeMs?: number;
  /** ユーザー設定 */
  settings: GameSettings;
}
