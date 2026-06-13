// ゲームのチューニング値(難易度・手触り)の集中管理。
// マジックナンバーをコードに散らさず、ここに集約する。

import type { BossAction } from '../types/boss';

export const PLAYER = {
  maxHp: 16,
  moveSpeed: 160, // px/s
  // 上向き負。押し続けた場合の最高到達点 ≈ jumpVelocity^2 / (2 * gravityY)。
  // -620 / 重力1200 で約160px 上昇し、ステージの段差(最大140px)・奈落の中継足場(120px)に届く。
  jumpVelocity: -620, // px/s(最大ジャンプ初速)
  // 可変ジャンプ: ボタンを離した瞬間に上昇中なら上向き速度をこの倍率にカットする。
  // 短押し=低いジャンプ(約40px)、押し続け=最大(約160px)。押している長さで高さが変わる。
  jumpCutMultiplier: 0.5,
  invincibleMs: 800, // 被弾後の無敵時間
  blinkIntervalMs: 80, // 無敵中の点滅間隔
  width: 28,
  height: 40,
} as const;

export const SHOT = {
  normalDamage: 1,
  chargedDamage: 3,
  chargeThresholdMs: 600, // チャージ開始からこの長さでチャージ弾が成立
  // ショットボタンをこの時間以上押し続けたら「長押し=通常弾の連射」とみなす。
  // チャージ成立しきい値より十分短くし、タップ(チャージ)と長押し(連射)を判別する。
  holdToAutoFireMs: 200,
  // 長押し連射のバースト制御: burstSize 発撃つごとに burstPauseMs の小休止を挟む
  // (撃ち放題にせず、連射にリズムを与える)。
  burstSize: 5,
  burstPauseMs: 450,
  normalSpeed: 420,
  chargedSpeed: 480,
  cooldownMs: 180, // 連射間隔(バースト内の発射間隔)
  normalSize: 8,
  chargedSize: 18,
  // 弾の寿命。射程 = speed × lifespan。ボス戦の間合い(アリーナ幅)で弾が届くよう確保する。
  lifespanMs: 2400,
} as const;

export const ENEMY = {
  walker: {
    hp: 2,
    contactDamage: 1,
    moveSpeed: 60,
    width: 30,
    height: 30,
  },
  turret: {
    hp: 3,
    contactDamage: 1,
    shootIntervalMs: 1600,
    bulletSpeed: 220,
    bulletDamage: 1,
    width: 32,
    height: 32,
  },
} as const;

/**
 * ボス共通のチューニング設定。接地(BOSS)・飛行(FLYING_BOSS)が共有する型。
 * Boss エンティティはこの型を介して設定値を参照し、系統ごとに差し替え可能にする。
 * actionDurationMs は系統で使うアクションのみ持つため Partial とする。
 */
export interface BossConfig {
  maxHp: number;
  /** この HP 比率以下で phase2 へ移行 */
  phase2HpRatio: number;
  contactDamage: number;
  bulletDamage: number;
  bulletSpeed: number;
  /** 移動速度(接地=前後ペース / 飛行=高度を保った左右移動) */
  moveSpeed: number;
  /** 連続被ダメ蓄積でのけぞる量 */
  staggerDamageThreshold: number;
  width: number;
  height: number;
  /** アクション継続時間(ms)。系統で使うアクションのみ定義する。 */
  actionDurationMs: Partial<Record<BossAction, number>>;
  /** phase2 でアクション間隔を短縮する係数 */
  phase2SpeedFactor: number;
  /** ジャンプ初速(接地ボスのみ。上向き負)。飛行ボスは持たない。 */
  jumpVelocity?: number;
  /** リグに常時適用する色合い(乗算)。未設定時はデフォルト色。 */
  tint?: number;
}

/**
 * 飛行/浮遊型ボス固有の設定。BossConfig を継承し、滞空高度・上下バブ・急降下の
 * パラメータを追加する。FlyingBoss はこの型を介して飛行固有値を参照する。
 */
export interface FlyingBossConfig extends BossConfig {
  /** 基準滞空高度(地面上端から本体中心までの px)。center_y = STAGE.groundY - hoverAltitude。 */
  hoverAltitude: number;
  /** 上下バブの振幅(px、+下方向)。 */
  hoverAmplitude: number;
  /** 上下バブの周期(ms)。 */
  hoverPeriodMs: number;
  /** 急降下の鉛直速度(px/s、下向き)。 */
  diveSpeed: number;
  /** 高度復帰・追従の最大鉛直速度(px/s)。 */
  climbSpeed: number;
  /** 急降下の最下点(地面上端から本体下端までの余白 px)。小さいほど地面近くまで降りる。 */
  diveBottomMargin: number;
}

export const BOSS = {
  maxHp: 24,
  phase2HpRatio: 0.5, // この比率以下で phase2 へ移行
  contactDamage: 2,
  bulletDamage: 1,
  bulletSpeed: 260,
  moveSpeed: 55, // 前後にペースする速度(速すぎないよう抑える)
  jumpVelocity: -520, // ジャンプ初速(上向き負)。重力1200 で約112px 上昇
  staggerDamageThreshold: 8, // 連続被ダメ蓄積でのけぞる量
  width: 80,
  height: 88,
  // アクション継続時間(ms)
  actionDurationMs: {
    idle: 700,
    move: 900,
    shoot: 600,
    jump: 900,
    stagger: 700,
  },
  // phase2 ではアクション間隔を短縮する係数
  phase2SpeedFactor: 0.7,
} as const satisfies BossConfig;

/**
 * stage3 専用・収容番人(重装型)の設定。接地型のまま、「遅いが重い単発攻撃」で差別化する。
 * bossAi の GROUND_WEIGHTS をそのまま流用し、行動間隔を長く・攻撃の威力を高く・移動を遅くする
 * ことで威圧感のある重装ボスを表現する(新アクションは追加しない)。
 */
export const CONTAINMENT_WARDEN = {
  maxHp: 30, // 重装甲。stage1/2 ボス(24)より硬い
  phase2HpRatio: 0.5,
  contactDamage: 3, // 重い接触ダメージ
  bulletDamage: 2, // 重い単発弾
  bulletSpeed: 220, // 遅く重い弾(BOSS=260 より遅い)
  moveSpeed: 38, // 遅い前後ペース(威圧感のある重い動き)
  jumpVelocity: -460, // 重く低いジャンプ
  staggerDamageThreshold: 10, // 重装でのけぞりにくい
  width: 92,
  height: 96, // 大柄
  // アクション継続時間を全体に長くして「遅い・溜めてから撃つ」リズムにする。
  actionDurationMs: {
    idle: 1000,
    move: 1200,
    shoot: 900,
    jump: 1000,
    stagger: 800,
  },
  phase2SpeedFactor: 0.75,
  // 暗青鋼色: stage1 ボス(デフォルト色)と視覚的に区別し「重装管理機」の威圧感を表す。
  tint: 0x5588bb,
} as const satisfies BossConfig;

/**
 * stage2 専用・飛行/浮遊型ボスの設定。難易度は接地ボスと「同等〜やや強い」に収める
 * (maxHp は同じ、弾速・移動をやや強化)。飛行固有の高度・急降下パラメータを持つ。
 */
export const FLYING_BOSS = {
  maxHp: 24, // 接地ボスと同等の硬さ
  phase2HpRatio: 0.5,
  contactDamage: 2,
  bulletDamage: 1,
  bulletSpeed: 280, // やや速い弾
  moveSpeed: 90, // 空中で高度を保ったまま左右へ展開する速度
  staggerDamageThreshold: 8,
  width: 76,
  height: 64, // 接地ボスより平たい空中機体
  // アクション継続時間(ms)。飛行は hover/move/shoot/dive/stagger を使う。
  actionDurationMs: {
    hover: 900,
    move: 800,
    shoot: 600,
    dive: 700,
    stagger: 700,
  },
  phase2SpeedFactor: 0.7,
  // --- 飛行固有 ---
  hoverAltitude: 150,
  hoverAmplitude: 24,
  hoverPeriodMs: 1800,
  diveSpeed: 360,
  climbSpeed: 240,
  diveBottomMargin: 16,
} as const satisfies FlyingBossConfig;

/**
 * ステージ別の雑魚敵難易度係数。後半ステージほど敵を強め、難易度カーブを作る。
 * 値は ENEMY の基準値に乗算され、ロジック側へのマジックナンバー埋め込みを避ける。
 */
export interface StageTuning {
  /** walker の移動速度係数(>1 で速い) */
  walkerSpeedFactor: number;
  /** turret の発射間隔係数(<1 で発射が頻繁) */
  turretIntervalFactor: number;
}

/** 中立(stage1 基準)の難易度係数。未知ステージのフォールバックにも使う。 */
export const NEUTRAL_STAGE_TUNING: StageTuning = {
  walkerSpeedFactor: 1,
  turretIntervalFactor: 1,
} as const;

export const STAGE_TUNING: Record<string, StageTuning> = {
  stage1: NEUTRAL_STAGE_TUNING,
  // stage2 は walker をやや速く、turret の発射を頻繁にして stage1 からの上昇を体感させる。
  stage2: {
    walkerSpeedFactor: 1.3,
    turretIntervalFactor: 0.75,
  },
  // stage3 はさらに敵を強め、難易度カーブを継続させる。
  stage3: {
    walkerSpeedFactor: 1.45,
    turretIntervalFactor: 0.65,
  },
} as const;

/** stageId に対応する難易度係数を返す。未知 ID は中立値にフォールバック。 */
export function getStageTuning(stageId: string): StageTuning {
  return STAGE_TUNING[stageId] ?? NEUTRAL_STAGE_TUNING;
}

export const STAGE = {
  width: 5200, // ステージ全長(px)
  height: 540,
  groundY: 480, // 地面の上端 Y
  deathY: 600, // この Y を超えたら落下死
  gravityY: 1200,
} as const;

export const LADDER = {
  // 梯子の昇降速度(px/s)。横移動より遅めにして「登る手応え」を出す。
  climbSpeed: 130,
  // 足場の上から真下の梯子へ「降り乗り込み」する際の、足元下方向の検知距離 兼 進入量(px)。
  // 足場上端と梯子上端が一致していても、これで真下の梯子をつかんで降り始められる。
  boardDownReach: 10,
} as const;
