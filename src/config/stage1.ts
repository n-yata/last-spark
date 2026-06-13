import { STAGE, BOSS, FLYING_BOSS, CONTAINMENT_WARDEN, type BossConfig } from './balance';
import type { EnemyPattern } from '../types/enemy';
import type { BossKind } from '../types/boss';
import type { RigFamily } from './characterRig';

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
 * ログトリガー(科学者の遺品・旧式端末)の配置。x,y は中心。
 * slot はログ断片のスロット(序盤/ボス前/ボス後)で、確定テキストの引き当てに使う。
 * 実体テキストは config/story/stageN.ts が持つ(ジオメトリとテキストを分離する)。
 */
export interface LogTriggerSpawn {
  slot: 'early' | 'preBoss' | 'postBoss';
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
  /**
   * ステージ開始時に再生する演出スクリプトキー(任意。config/story/cutscenes.ts)。
   * 定義があるステージは GameScene 開始時に背景画像つきの専用シーン(CutsceneScene)で開始
   * ストーリーを再生し、送り終えるとゲーム本編が始まる。未定義のステージは従来どおり
   * StoryOverlay の中央テキスト(stageIntro)で開始する(stage2-3)。
   */
  introCutsceneKey?: string;
  /** プレイヤー初期位置(中心) */
  playerStart: { x: number; y: number };
  platforms: PlatformRect[];
  /** 梯子(任意)。未定義なら梯子なしステージ。 */
  ladders?: LadderRect[];
  enemies: EnemySpawn[];
  /** ログトリガー(任意)。未定義ならログなしステージ。 */
  logTriggers?: LogTriggerSpawn[];
  /**
   * このカメラ右端 X を超えるとボス戦に突入する(最短地点)。
   * 実際の発火は SpawnSystem が「ボス全身が画面内に見える位置」まで遅らせるため、
   * bossSpawn が画面外ならこの値より後ろで発火する。
   */
  bossTriggerX: number;
  /** ボスの出現位置(中心) */
  bossSpawn: { x: number; y: number };
  /** ボス系統。未定義なら接地型('ground')。stage2 は飛行型('flying')。 */
  bossKind?: BossKind;
  /**
   * ボス固有チューニング(任意)。未定義なら接地型の既定 BOSS。
   * stage3 は重装型 CONTAINMENT_WARDEN を差す。
   */
  bossConfig?: BossConfig;
  /**
   * ボスの描画リグ系統(任意)。未定義なら接地型 'boss'。
   * stage3 は専用シルエットの 'bossWarden' を差し、見た目を stage1 ボスと明確に分ける。
   */
  bossRig?: RigFamily;
  /** ボスアリーナ左端(カメラがここで止まる) */
  bossArenaMinX: number;
  /**
   * 収容ケージ(任意・中心座標)。撃破後に解錠し、接触で救出演出を開始する。
   * stage3 のみ持つ。未定義ならケージなし。
   */
  cage?: { x: number; y: number };
  /**
   * ボス撃破後に再生する演出スクリプトキー(任意。config/story/cutscenes.ts)。
   * 定義があるステージはボス撃破→(ボス後ログ任意接触)→ケージ接触で演出→クリアの順に流れる。
   * 未定義(stage1-2)は従来どおりボス撃破→即クリアへ。
   */
  postBossCutsceneKey?: string;
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
  // 開始演出を背景画像つきの専用シーンで再生する(stage3 救出演出と同方式)。
  introCutsceneKey: 'stage1-intro',
  // 地面に接した状態で開始する(本体半身=PLAYER.height/2=20)。これより高く置くと
  // 開始時に落下して着地するため、ステージ開始テキストで一時停止した瞬間に
  // 「上から落ちてくる」不自然な演出になる。接地位置に置いて落下をなくす。
  playerStart: { x: 120, y: GROUND_TOP - 20 },
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
    // 足場なし=地面に接地(本体半身=16)。
    { pattern: 'turret', x: 980, y: GROUND_TOP - 16 },
    { pattern: 'walker', x: 1800, y: GROUND_TOP - 60 },
    { pattern: 'walker', x: 2080, y: GROUND_TOP - 160 },
    // 高台(top=GROUND_TOP-220)の上に接地。
    { pattern: 'turret', x: 2440, y: GROUND_TOP - 236 },
    { pattern: 'walker', x: 2860, y: GROUND_TOP - 170 },
    { pattern: 'walker', x: 3200, y: GROUND_TOP - 60 },
    // 高台(top=GROUND_TOP-120)の上に接地。
    { pattern: 'turret', x: 3380, y: GROUND_TOP - 136 },
  ],
  // 序盤=導入区間、ボス前=ボストリガー(4200)手前に配置。
  // postBoss はボス撃破後エリアの動線が必要なため block 2(ボス後フロー)で追加する。
  logTriggers: [
    { slot: 'early', x: 360, y: GROUND_TOP - 40 },
    { slot: 'preBoss', x: 4060, y: GROUND_TOP - 40 },
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
  // 地面に接した状態で開始する(本体半身=PLAYER.height/2=20)。これより高く置くと
  // 開始時に落下して着地するため、ステージ開始テキストで一時停止した瞬間に
  // 「上から落ちてくる」不自然な演出になる。接地位置に置いて落下をなくす。
  playerStart: { x: 120, y: GROUND_TOP - 20 },
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
    // 足場なし=地面に接地(本体半身=16)。
    { pattern: 'turret', x: 1500, y: GROUND_TOP - 16 },
    // 橋(top=GROUND_TOP-220)の上に接地。渡る時に警戒させる。
    { pattern: 'turret', x: 2120, y: GROUND_TOP - 236 },
    { pattern: 'walker', x: 2600, y: GROUND_TOP - 60 },
    // 高台(top=GROUND_TOP-150)の上に接地。
    { pattern: 'turret', x: 2880, y: GROUND_TOP - 166 },
    // 末尾の雑魚はボス出現位置(x=3950)と十分離す。ボス戦エリアに雑魚が
    // 残って重ならないよう、最後の敵を x=3350 までに収める(ボスまで約600px)。
    { pattern: 'walker', x: 3150, y: GROUND_TOP - 60 },
    // 足場なし=地面に接地(本体半身=16)。
    { pattern: 'turret', x: 3350, y: GROUND_TOP - 16 },
  ],
  logTriggers: [
    { slot: 'early', x: 360, y: GROUND_TOP - 40 },
    { slot: 'preBoss', x: 3560, y: GROUND_TOP - 40 },
  ],
  bossTriggerX: 3700,
  // 飛行ボスは空中の基準滞空高度に出現する(center_y = groundY - hoverAltitude)。
  bossSpawn: { x: 3950, y: GROUND_TOP - FLYING_BOSS.hoverAltitude },
  bossKind: 'flying',
  bossArenaMinX: 4000,
  width: STAGE2_WIDTH,
  // stage2 クリア後は stage3(収容施設)へ続く。
  nextStageId: 'stage3',
};

// ステージ3「収容施設」: ECLIPSE に管理された人間が収容される施設。終端のアリーナに
// 収容ケージ(TERRA)があり、重装型ボス「収容番人」を倒すと解錠される。撃破後はその場で
// 自由に動け、任意でボス後ログを拾い、ケージへ接触すると救出後演出シーンが再生される。
const STAGE3_WIDTH = 4600;
const STAGE3: StageData = {
  id: 'stage3',
  playerStart: { x: 120, y: GROUND_TOP - 20 },
  platforms: [
    // 地面セグメント 1(スタート〜小奈落手前)
    { x: 0, y: GROUND_TOP, width: 1700, height: GROUND_THICK },
    // 小奈落: 1700–1768(幅 68px。ジャンプで越える)
    // 地面セグメント 2(奈落の先〜ボスアリーナ手前)
    { x: 1768, y: GROUND_TOP, width: 1932, height: GROUND_THICK },
    // 地面セグメント 3(ボスアリーナ。ケージまで連続した足場)
    { x: 3700, y: GROUND_TOP, width: STAGE3_WIDTH - 3700, height: GROUND_THICK },

    // 収容区画の足場(任意・監視台のイメージ)
    { x: 520, y: GROUND_TOP - 120, width: 170, height: 24 },
    { x: 1180, y: GROUND_TOP - 150, width: 180, height: 24 },
    { x: 2150, y: GROUND_TOP - 130, width: 200, height: 24 },
    { x: 2560, y: GROUND_TOP - 210, width: 180, height: 24 },
    { x: 3000, y: GROUND_TOP - 140, width: 200, height: 24 },
  ],
  enemies: [
    { pattern: 'walker', x: 760, y: GROUND_TOP - 60 },
    // 足場なし=地面に接地(本体半身=16)。
    { pattern: 'turret', x: 1080, y: GROUND_TOP - 16 },
    { pattern: 'walker', x: 1900, y: GROUND_TOP - 60 },
    // 高台(top=GROUND_TOP-130)の上に接地。
    { pattern: 'turret', x: 2240, y: GROUND_TOP - 146 },
    { pattern: 'walker', x: 2640, y: GROUND_TOP - 250 },
    { pattern: 'walker', x: 3060, y: GROUND_TOP - 180 },
    // 末尾の雑魚はボス出現位置(x=4050)と十分離す(ボスまで約600px)。
    { pattern: 'walker', x: 3300, y: GROUND_TOP - 60 },
    // 足場なし=地面に接地(本体半身=16)。
    { pattern: 'turret', x: 3480, y: GROUND_TOP - 16 },
  ],
  // 序盤=収容区画入口、ボス前=ボストリガー(3900)手前、ボス後=アリーナ内(ケージ手前・任意接触)。
  logTriggers: [
    { slot: 'early', x: 360, y: GROUND_TOP - 40 },
    { slot: 'preBoss', x: 3760, y: GROUND_TOP - 40 },
    { slot: 'postBoss', x: 4300, y: GROUND_TOP - 40 },
  ],
  bossTriggerX: 3900,
  // 収容番人は重装の接地型。本体下端=地面で接地させる。
  bossSpawn: { x: 4050, y: GROUND_TOP - CONTAINMENT_WARDEN.height / 2 },
  bossKind: 'ground',
  bossConfig: CONTAINMENT_WARDEN,
  bossRig: 'bossWarden',
  bossArenaMinX: 4100,
  // 収容ケージはアリーナ右端付近。撃破後にここへ接触して救出演出へ。
  cage: { x: 4480, y: GROUND_TOP - 70 },
  postBossCutsceneKey: 'stage3-rescue',
  width: STAGE3_WIDTH,
  // stage3 は現状の最終ステージ(stage4 はブロック3で実体追加。実体ができ次第 nextStageId を付ける)。
};

const STAGES: Record<string, StageData> = {
  stage1: STAGE1,
  stage2: STAGE2,
  stage3: STAGE3,
};

/** stageId に対応するステージデータを返す。未知の ID は stage1 にフォールバック。 */
export function getStageData(stageId: string): StageData {
  return STAGES[stageId] ?? STAGE1;
}

/**
 * プレイ可能なステージ ID の一覧(STAGES 登録順)。開発モードのステージ選択などで参照する。
 * STAGES から導出するため、ステージを追加・削除しても自動で追従する(定義の二重管理を避ける)。
 * 表示ラベル等は参照側(開発モードモジュール)が持ち、本番バンドルへ持ち込まない。
 */
export const STAGE_IDS: readonly string[] = Object.keys(STAGES);
