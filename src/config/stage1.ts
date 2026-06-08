import { STAGE, BOSS } from './balance';
import type { EnemyPattern } from '../types/enemy';

// ステージ1「崩れた都市」のコード定義データ。
// MVP は 1 ステージのため Tiled JSON ではなくここで地形/敵配置を定義する。
// SpawnSystem は stageId からこのデータを引く。将来 Tiled ローダへ差し替え可能。

/** 矩形の足場/地面。x,y は左上、width/height は px。 */
export interface PlatformRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 敵の配置。x,y は出現位置(中心)。 */
export interface EnemySpawn {
  pattern: EnemyPattern;
  x: number;
  y: number;
}

export interface StageData {
  id: string;
  /** プレイヤー初期位置(中心) */
  playerStart: { x: number; y: number };
  platforms: PlatformRect[];
  enemies: EnemySpawn[];
  /** このカメラ右端 X を超えるとボス戦に突入する */
  bossTriggerX: number;
  /** ボスの出現位置(中心) */
  bossSpawn: { x: number; y: number };
  /** ボスアリーナ左端(カメラがここで止まる) */
  bossArenaMinX: number;
  /** ステージ全幅 */
  width: number;
}

const GROUND_TOP = STAGE.groundY;
const GROUND_THICK = STAGE.height - STAGE.groundY;

// 地面は途中に奈落(ギャップ)を 1 箇所設け、落下死を成立させる。
const STAGE1: StageData = {
  id: 'stage1',
  playerStart: { x: 120, y: GROUND_TOP - 60 },
  platforms: [
    // 地面セグメント 1(スタート〜奈落手前)
    { x: 0, y: GROUND_TOP, width: 1400, height: GROUND_THICK },
    // 奈落: 1400–1464(幅 64px のギャップ。ジャンプ飛距離 ≈165px で余裕を持って越えられる)
    // 地面セグメント 2
    { x: 1464, y: GROUND_TOP, width: 2136, height: GROUND_THICK },
    // 地面セグメント 3(ボスアリーナまで)
    { x: 3600, y: GROUND_TOP, width: 1600, height: GROUND_THICK },

    // 導入区間: 任意で登れる高台(地上ルートは平坦なので必須ではない、操作練習用)
    { x: 460, y: GROUND_TOP - 110, width: 160, height: 24 },
    { x: 740, y: GROUND_TOP - 170, width: 160, height: 24 },

    // 中盤の高台(任意)
    { x: 2000, y: GROUND_TOP - 130, width: 200, height: 24 },
    { x: 2360, y: GROUND_TOP - 220, width: 180, height: 24 },
    { x: 2760, y: GROUND_TOP - 140, width: 200, height: 24 },

    // 終盤の高台(任意)
    { x: 3300, y: GROUND_TOP - 120, width: 180, height: 24 },
  ],
  enemies: [
    { pattern: 'walker', x: 820, y: GROUND_TOP - 60 },
    { pattern: 'turret', x: 980, y: GROUND_TOP - 200 },
    { pattern: 'walker', x: 1800, y: GROUND_TOP - 60 },
    { pattern: 'walker', x: 2080, y: GROUND_TOP - 160 },
    { pattern: 'turret', x: 2440, y: GROUND_TOP - 250 },
    { pattern: 'walker', x: 2860, y: GROUND_TOP - 170 },
    { pattern: 'walker', x: 3200, y: GROUND_TOP - 60 },
    { pattern: 'turret', x: 3380, y: GROUND_TOP - 150 },
  ],
  bossTriggerX: 4200,
  // ボスはトリガー地点(プレイヤー x≈3720, カメラ右端4200)のすぐ先に出現させ、
  // 間合いが開きすぎて戦闘が成立しないのを防ぐ。本体下端=地面で接地させ、
  // 地上ショット(プレイヤー中心の高さ)が当たり判定に重なるようにする。
  bossSpawn: { x: 4350, y: GROUND_TOP - BOSS.height / 2 },
  bossArenaMinX: 4400,
  width: STAGE.width,
};

const STAGES: Record<string, StageData> = {
  stage1: STAGE1,
};

/** stageId に対応するステージデータを返す。未知の ID は stage1 にフォールバック。 */
export function getStageData(stageId: string): StageData {
  return STAGES[stageId] ?? STAGE1;
}
