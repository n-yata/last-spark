import { STAGE, BOSS, FLYING_BOSS, CONTAINMENT_WARDEN, PURIFIER, ENVOY, type BossConfig } from './balance';
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
  /**
   * 開始演出(introCutsceneKey)が開始テキスト(stageIntro + 開始内心)を兼ねるか(任意)。
   * true のステージは、演出の中で開始ストーリーを出し切っているため、演出完了後に
   * 通常の開始テキストを重ねて出さない(stage1: 演出が intro+目覚めの内心そのもの)。
   * 未定義/false のステージは演出と開始テキストが別内容のため、演出 → 開始テキストの順に出す
   * (stage4/5: 演出は TERRA との会話で、開始テキストとは別物)。
   */
  introCutsceneCoversStartText?: boolean;
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
   * ボスの種別(任意)。系統(bossKind)内でさらに見た目・チューニングを出し分ける。
   * - 'purifier': stage4 の環境管理機(接地型・浄化型・扇状の範囲攻撃)。bossKind は 'ground'。
   * - 'envoy': stage5 の ECLIPSE の使者(飛行型・高速ヒット&アウェイ)。bossKind は 'flying'。
   * 未定義なら系統の既定ボス(接地は bossConfig/bossRig、飛行は FLYING_BOSS)。
   */
  bossVariant?: 'purifier' | 'envoy';
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
  /**
   * カメラ背景色(任意・CSS 色文字列)。未定義なら既定の暗色。
   * 環境ストーリーテリングの簡易表現として、ステージごとに空気感を変える(stage4=汚染の淀み)。
   */
  backgroundColor?: string;
  /** クリア後に続けて開始する次ステージ ID(任意)。未定義なら最終ステージ。 */
  nextStageId?: string;
}

const GROUND_TOP = STAGE.groundY;
const GROUND_THICK = STAGE.height - STAGE.groundY;

// 地面は途中に奈落(ギャップ)を 1 箇所設け、落下死を成立させる。
const STAGE1: StageData = {
  id: 'stage1',
  // 開始演出を背景画像つきの専用シーンで再生する(stage3 救出演出と同方式)。
  // この演出は intro+「目覚め」の内心そのもの(stage1-intro)なので、演出完了後に
  // 通常の開始テキストを重ねない(同一文の二重表示を防ぐ)。
  introCutsceneKey: 'stage1-intro',
  introCutsceneCoversStartText: true,
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
  // 収容番人は重装ミサイル型(接地)。本体下端=地面で接地させる。系統 'warden' に対し
  // WardenBoss が固有設定(CONTAINMENT_WARDEN)・リグ('bossWarden')を内包するため、
  // bossConfig/bossRig は指定不要(stage2 の 'flying' と同じ扱い)。
  bossSpawn: { x: 4050, y: GROUND_TOP - CONTAINMENT_WARDEN.height / 2 },
  bossKind: 'warden',
  bossArenaMinX: 4100,
  // 収容ケージはアリーナ右端付近。撃破後にここへ接触して救出演出へ。
  cage: { x: 4480, y: GROUND_TOP - 70 },
  postBossCutsceneKey: 'stage3-rescue',
  width: STAGE3_WIDTH,
  // stage3 救出(TERRA同行)後は stage4(汚染地帯)へ続く。
  nextStageId: 'stage4',
};

// ステージ4「汚染地帯」: 環境破壊の実態を目撃し、ECLIPSE の論理に揺らぐステージ。
// TERRA 同行後の最初のステージで、開始演出に TERRA が登場する(introCutsceneKey)。
// ボスは環境管理機(浄化型・扇状の範囲攻撃=毒霧スプレー)。ボス後演出シーンは持たず、
// 撃破→(ボス後ログ任意接触)→ボス撃破内心→クリアへ直行する(stage1-2 と同じ「演出キーなし」分岐)。
const STAGE4_WIDTH = 4600;
const STAGE4: StageData = {
  id: 'stage4',
  playerStart: { x: 120, y: GROUND_TOP - 20 },
  platforms: [
    // 地面セグメント 1(スタート〜汚染溜まりの奈落手前)
    { x: 0, y: GROUND_TOP, width: 1600, height: GROUND_THICK },
    // 汚染溜まりの奈落: 1600–1668(幅 68px。ジャンプで越える)
    // 地面セグメント 2(奈落の先〜2 つ目の奈落手前)
    { x: 1668, y: GROUND_TOP, width: 1232, height: GROUND_THICK },
    // 2 つ目の奈落: 2900–2968
    // 地面セグメント 3(ボスアリーナ手前まで)
    { x: 2968, y: GROUND_TOP, width: 732, height: GROUND_THICK },
    // 地面セグメント 4(ボスアリーナ。連続した足場)
    { x: 3700, y: GROUND_TOP, width: STAGE4_WIDTH - 3700, height: GROUND_THICK },

    // 朽ちた構造物の足場(任意)
    { x: 540, y: GROUND_TOP - 120, width: 170, height: 24 },
    { x: 1120, y: GROUND_TOP - 160, width: 180, height: 24 },
    { x: 2080, y: GROUND_TOP - 130, width: 200, height: 24 },
    { x: 2480, y: GROUND_TOP - 210, width: 180, height: 24 },
    { x: 3160, y: GROUND_TOP - 140, width: 200, height: 24 },
  ],
  enemies: [
    { pattern: 'walker', x: 780, y: GROUND_TOP - 60 },
    // 足場なし=地面に接地(本体半身=16)。
    { pattern: 'turret', x: 1100, y: GROUND_TOP - 16 },
    { pattern: 'walker', x: 1950, y: GROUND_TOP - 60 },
    // 高台(top=GROUND_TOP-130)の上に接地。
    { pattern: 'turret', x: 2160, y: GROUND_TOP - 146 },
    { pattern: 'walker', x: 2560, y: GROUND_TOP - 250 },
    { pattern: 'walker', x: 3200, y: GROUND_TOP - 180 },
    // 末尾の雑魚はボス出現位置(x=4050)と十分離す(ボスまで約600px)。
    { pattern: 'walker', x: 3360, y: GROUND_TOP - 60 },
    // 足場なし=地面に接地(本体半身=16)。
    { pattern: 'turret', x: 3520, y: GROUND_TOP - 16 },
  ],
  // ボス後演出シーンを持たない(=撃破後フリーロームなし)ため、ログ3本はすべてボス前の
  // 走行区間で拾える位置に置く。postBoss(科学者の最後の気づき)は、ボストリガー(3900)直前に配置する。
  logTriggers: [
    { slot: 'early', x: 360, y: GROUND_TOP - 40 },
    { slot: 'preBoss', x: 2740, y: GROUND_TOP - 40 },
    { slot: 'postBoss', x: 3760, y: GROUND_TOP - 40 },
  ],
  bossTriggerX: 3900,
  // 環境管理機は接地型。本体下端=地面で接地させる。
  bossSpawn: { x: 4050, y: GROUND_TOP - PURIFIER.height / 2 },
  bossKind: 'ground',
  bossVariant: 'purifier',
  bossArenaMinX: 4100,
  width: STAGE4_WIDTH,
  // 汚染の淀みを背景色で表現する(緑がかった暗い土気色。プレースホルダの環境表現)。
  backgroundColor: '#151a0c',
  // ステージ開始演出(TERRA同行)。汚染地帯の空気に TERRA が反応する。
  introCutsceneKey: 'stage4-intro',
  // stage4 クリア後は stage5(ECLIPSE外縁部)へ続く。
  nextStageId: 'stage5',
};

// ステージ5「ECLIPSE外縁部」: 科学者の遺志を完全に受け取り、RAY の迷いが消える決意のステージ。
// ボスは「ECLIPSEの使者(高速型)」。スリムで流線型、高速移動・連続攻撃のヒット&アウェイで戦う
// (飛行型 FlyingBoss を流用し、ENVOY パラメータで速さを表現)。ログ3本はすべて「RAYへ」宛ての
// 直接的なメッセージで、postBoss が遺言(クライマックス)にあたる。ボス後演出シーンは持たず、
// 撃破→(ボス後ログ任意接触)→ボス撃破内心→クリアへ直行する(stage1-2・stage4 と同じ「演出キーなし」分岐)。
const STAGE5_WIDTH = 4800;
const STAGE5: StageData = {
  id: 'stage5',
  playerStart: { x: 120, y: GROUND_TOP - 20 },
  platforms: [
    // 地面セグメント 1(スタート〜外縁部の溝手前)
    { x: 0, y: GROUND_TOP, width: 1500, height: GROUND_THICK },
    // 溝 1: 1500–1572(幅 72px。ジャンプで越える)
    // 地面セグメント 2
    { x: 1572, y: GROUND_TOP, width: 1300, height: GROUND_THICK },
    // 溝 2: 2872–2944
    // 地面セグメント 3(ボスアリーナ手前まで)
    { x: 2944, y: GROUND_TOP, width: 856, height: GROUND_THICK },
    // 地面セグメント 4(ボスアリーナ。連続した足場で空中ボスの急降下をさばく)
    { x: 3800, y: GROUND_TOP, width: STAGE5_WIDTH - 3800, height: GROUND_THICK },

    // 機械の密度が高い外縁部の構造物(任意の足場)
    { x: 560, y: GROUND_TOP - 130, width: 180, height: 24 },
    { x: 1180, y: GROUND_TOP - 180, width: 180, height: 24 },
    { x: 2100, y: GROUND_TOP - 140, width: 200, height: 24 },
    { x: 2520, y: GROUND_TOP - 220, width: 180, height: 24 },
    { x: 3220, y: GROUND_TOP - 150, width: 200, height: 24 },
  ],
  enemies: [
    { pattern: 'walker', x: 800, y: GROUND_TOP - 60 },
    // 足場なし=地面に接地(本体半身=16)。
    { pattern: 'turret', x: 1120, y: GROUND_TOP - 16 },
    { pattern: 'walker', x: 1980, y: GROUND_TOP - 60 },
    // 高台(top=GROUND_TOP-140)の上に接地。
    { pattern: 'turret', x: 2180, y: GROUND_TOP - 156 },
    { pattern: 'walker', x: 2600, y: GROUND_TOP - 260 },
    { pattern: 'walker', x: 3260, y: GROUND_TOP - 190 },
    // 末尾の雑魚はボス出現位置(x=4150)と十分離す(ボスまで約600px)。
    { pattern: 'walker', x: 3460, y: GROUND_TOP - 60 },
    // 足場なし=地面に接地(本体半身=16)。
    { pattern: 'turret', x: 3620, y: GROUND_TOP - 16 },
  ],
  // ボス後演出シーンを持たない(=撃破後フリーロームなし)ため、ログ3本はすべてボス前の
  // 走行区間で拾える位置に置く。postBoss(遺言・クライマックス)はボストリガー(4000)直前に配置する。
  logTriggers: [
    { slot: 'early', x: 360, y: GROUND_TOP - 40 },
    { slot: 'preBoss', x: 2780, y: GROUND_TOP - 40 },
    { slot: 'postBoss', x: 3860, y: GROUND_TOP - 40 },
  ],
  bossTriggerX: 4000,
  // 使者は飛行型。空中の基準滞空高度に出現する(center_y = groundY - hoverAltitude)。
  bossSpawn: { x: 4150, y: GROUND_TOP - ENVOY.hoverAltitude },
  bossKind: 'flying',
  bossVariant: 'envoy',
  bossArenaMinX: 4200,
  width: STAGE5_WIDTH,
  // 外縁部の冷たい金属の空気を背景色で表現する(青みがかった暗い鋼色。プレースホルダの環境表現)。
  backgroundColor: '#0c1119',
  // ステージ開始演出(TERRA同行)。ECLIPSE が近づく緊張に TERRA が怯える。
  introCutsceneKey: 'stage5-intro',
  // stage6(ECLIPSE支配中枢)は後続ブロックで実体追加する。実体ができ次第 nextStageId='stage6' を付ける。
  // 現状は未定義=最終ステージ扱い(未実装の stage6 へ遷移して stage1 にフォールバックするのを防ぐ)。
};

const STAGES: Record<string, StageData> = {
  stage1: STAGE1,
  stage2: STAGE2,
  stage3: STAGE3,
  stage4: STAGE4,
  stage5: STAGE5,
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
