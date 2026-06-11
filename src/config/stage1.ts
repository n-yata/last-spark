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

/**
 * 梯子の矩形領域。x,y は左上、width/height は px。重なり判定にのみ使う(物理衝突なし)。
 * 制約: height は `LADDER.boardDownReach`(降り乗り込みの進入量)より十分大きくすること。
 * 極端に低い梯子は、降り乗り込んだ瞬間に最下部離脱条件へ達して把持できない恐れがある。
 */
export interface LadderRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StageData {
  id: string;
  /** プレイヤー初期位置(中心) */
  playerStart: { x: number; y: number };
  platforms: PlatformRect[];
  /** 梯子(任意)。未定義なら梯子なしステージ。 */
  ladders?: LadderRect[];
  enemies: EnemySpawn[];
  /** このカメラ右端 X を超えるとボス戦に突入する */
  bossTriggerX: number;
  /** ボスの出現位置(中心) */
  bossSpawn: { x: number; y: number };
  /** ボスアリーナ左端(カメラがここで止まる) */
  bossArenaMinX: number;
  /** ステージ全幅 */
  width: number;
  /** クリア後に続けて開始する次ステージ ID(任意)。未定義なら最終ステージ。 */
  nextStageId?: string;
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
  // stage1 クリア後は stage2 へ続く。
  nextStageId: 'stage2',
};

// ステージ2「立坑の街」: 梯子で登る縦の攻略を主役にする。
// ジャンプでは越えられない広い奈落(240px)を、梯子で上の橋へ登り→渡り→梯子で降りる
// 動線で攻略する(梯子が必須)。終端で既存ボストリガーに突入してクリア。
const STAGE2_WIDTH = 4200;
const STAGE2: StageData = {
  id: 'stage2',
  playerStart: { x: 120, y: GROUND_TOP - 60 },
  platforms: [
    // 地面セグメント A(スタート〜大奈落手前)。A は x=2000 で途切れる。
    { x: 0, y: GROUND_TOP, width: 2000, height: GROUND_THICK },
    // 大奈落: 2000–2240(幅240px。ジャンプ飛距離≈165px では越えられない=梯子必須)
    // 地面セグメント B(奈落の先〜ボスアリーナ)
    { x: 2240, y: GROUND_TOP, width: STAGE2_WIDTH - 2240, height: GROUND_THICK },

    // 導入の練習用すり抜け足場(任意)
    { x: 600, y: GROUND_TOP - 110, width: 160, height: 24 },

    // 奈落をまたぐ「橋」(すり抜け足場・top=260)。梯子の上端がこの上端に一致する。
    { x: 1880, y: GROUND_TOP - 220, width: 480, height: 24 },

    // 橋を渡った先の高台(任意・turret を載せて警戒させる)
    { x: 2800, y: GROUND_TOP - 150, width: 200, height: 24 },
  ],
  ladders: [
    // L1: 奈落手前(地面A上)から橋へ登る。上端 y=260 = 橋の上端。
    { x: 1930, y: GROUND_TOP - 220, width: 32, height: 220 },
    // L2: 橋から奈落の先(地面B上)へ降りる。
    { x: 2290, y: GROUND_TOP - 220, width: 32, height: 220 },
  ],
  enemies: [
    { pattern: 'walker', x: 900, y: GROUND_TOP - 60 },
    { pattern: 'turret', x: 1500, y: GROUND_TOP - 120 },
    // 橋の上の砲台(渡る時に警戒。turret は重力なしでこの高さに留まる)
    { pattern: 'turret', x: 2120, y: GROUND_TOP - 236 },
    { pattern: 'walker', x: 2600, y: GROUND_TOP - 60 },
    { pattern: 'turret', x: 2880, y: GROUND_TOP - 180 },
    { pattern: 'walker', x: 3400, y: GROUND_TOP - 60 },
    { pattern: 'turret', x: 3700, y: GROUND_TOP - 120 },
  ],
  bossTriggerX: 3700,
  bossSpawn: { x: 3950, y: GROUND_TOP - BOSS.height / 2 },
  bossArenaMinX: 4000,
  width: STAGE2_WIDTH,
  // stage2 は最終ステージ(nextStageId なし)。
};

const STAGES: Record<string, StageData> = {
  stage1: STAGE1,
  stage2: STAGE2,
};

/** stageId に対応するステージデータを返す。未知の ID は stage1 にフォールバック。 */
export function getStageData(stageId: string): StageData {
  return STAGES[stageId] ?? STAGE1;
}
