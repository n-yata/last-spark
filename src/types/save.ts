// 永続データの型定義。localStorage に保存される(完全オフライン)。

export interface GameSettings {
  /** サウンドミュート(モバイル自動再生制約に配慮、既定 false) */
  muted: boolean;
  /** BGM 音量 0.0–1.0 */
  bgmVolume: number;
  /** SE 音量 0.0–1.0 */
  seVolume: number;
  /** 難易度。normal は従来バランス、hard は被ダメージ・敵係数を強化する。 */
  difficulty: DifficultyMode;
  /**
   * バスターモード。ON のとき stage6 の強化バスター(通常弾2発化 + チャージビーム)を
   * 全ステージで使えるようにする。難易度とは独立したトグル(既定 false)。
   */
  busterMode: boolean;
  /**
   * 触覚フィードバック(Vibration API)。ON のとき被弾・ボス撃破時に振動する(既定 true)。
   * 非対応環境(iOS Safari / PC)では設定に関わらず何も起きない。
   */
  vibration: boolean;
}

export type DifficultyMode = 'normal' | 'hard';

export interface SaveData {
  /** セーブ構造のバージョン(マイグレーション用) */
  version: number;
  /** クリア済みステージ ID の配列(旧 cleared:boolean から移行)。 */
  clearedStages: string[];
  /** ステージ別クリア最速タイム(ミリ秒)。未クリアのステージはキーを持たない。 */
  bestTimeMs?: Record<string, number>;
  /**
   * 周回数(New Game+)。初期値1。全ステージクリア後に次の周回へ進むたびに+1され、
   * clearedStages はリセットされるが bestTimeMs は保持される(進捗データ、settings外)。
   */
  loopCount: number;
  /** ユーザー設定 */
  settings: GameSettings;
}
