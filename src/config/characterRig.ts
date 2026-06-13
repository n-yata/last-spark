// キャラ系統別のリグ(関節)構成定義。単一の真実(single source of truth)。
// この定義を PreloadScene(パーツテクスチャの手続き生成)と CharacterRig(Container 組み立て)の
// 双方が参照する。マジックナンバーを本番ロジックに散らさず、見た目調整の窓口をここに集約する。
//
// 座標系: 各パーツのオフセット(x,y)はエンティティのボディ中心(0,0)を原点とし、+y を下とする。
// 寸法は balance.ts の width/height から比率で導出している(はみ出しすぎない範囲)。

import { PART } from './assetKeys';
import { PLAYER, ENEMY, BOSS, FLYING_BOSS, CONTAINMENT_WARDEN } from './balance';

/** パーツの描画形状。PreloadScene がこの種別に応じて Graphics で描き分ける。 */
export type PartShape =
  | 'roundedBox' // 胴・腕などの角丸ボックス
  | 'helmet' // 丸みのあるヘルメット頭(発光バイザー)
  | 'cannon' // アームキャノン(銃口リング付き)
  | 'leg' // 脚(先細りの脚部)
  | 'sensor' // センサー頭(walker 用の小さな箱+目)
  | 'barrel' // 砲身(turret 用)
  | 'base' // 台座(turret 用の据置ベース)
  | 'dome'; // ドーム(turret 用の旋回部)

/** アニメーション上の役割。CharacterRig が役割ごとに変位の与え方を切り替える。 */
export type PartRole =
  | 'head'
  | 'torso'
  | 'armBack'
  | 'armFront'
  | 'legBack'
  | 'legFront'
  | 'base'
  | 'dome'
  | 'barrel';

/** 1 パーツの仕様。 */
export interface RigPartSpec {
  /** テクスチャキー(assetKeys.PART 由来)。 */
  key: string;
  /** 描画形状。 */
  shape: PartShape;
  /** テクスチャの幅(px)。 */
  w: number;
  /** テクスチャの高さ(px)。 */
  h: number;
  /** 本体色。 */
  fill: number;
  /** ネオンアクセント色(主)。 */
  accent: number;
  /** 第2アクセント色(副)。コントラスト用。省略時は accent を流用。 */
  accent2?: number;
  /** ボディ中心からの X オフセット。 */
  x: number;
  /** ボディ中心からの Y オフセット(+下)。 */
  y: number;
  /** 原点 X(0=左, 0.5=中央, 1=右)。関節ピボットを表す。 */
  originX: number;
  /** 原点 Y(0=上, 0.5=中央, 1=下)。脚は 0(股関節)で振る。 */
  originY: number;
  /** アニメ役割。 */
  role: PartRole;
}

/** 1 系統のリグ仕様。parts は背面→前面(描画順 = z 順)で並べる。 */
export interface RigSpec {
  family: 'player' | 'walker' | 'turret' | 'boss' | 'bossFlying' | 'bossWarden';
  /** 歩行スイングの基準振幅(rad)。系統ごとの脚の振り幅。 */
  swingRad: number;
  /** 歩行周期(ms)。小さいほど速く脚を動かす。 */
  walkCycleMs: number;
  parts: RigPartSpec[];
}

// 系統別パレット。役割ごとに色を変えて色数を増やし、主/副の2発光色で
// コントラストを付ける(暗め基調 + ネオンの world 観は維持)。
// metal=暗いメタル(腕脚) / base=胴の中間色 / light=頭の明るいパネル /
// accent=主発光 / accent2=副発光(対比色)。
const PALETTE = {
  // プレイヤー: シアン主 × アンバー副。
  player: { metal: 0x141c22, base: 0x24414e, light: 0x396d7e, accent: 0x37f7d8, accent2: 0xffb454 },
  // walker: ピンク主 × イエロー副。
  walker: { metal: 0x231019, base: 0x4a2636, light: 0x6e3850, accent: 0xff5d7a, accent2: 0xffd166 },
  // turret: パープル主 × ティール副。
  turret: { metal: 0x1c1727, base: 0x382c50, light: 0x564178, accent: 0xc77dff, accent2: 0x5de2c0 },
  // ボス: レッド主 × アンバー副(威圧感)。
  boss: { metal: 0x1a0b0f, base: 0x44181f, light: 0x6e2630, accent: 0xff2d55, accent2: 0xffb13b },
  // 飛行ボス: シアン主 × バイオレット副(冷たい空中機。赤い接地ボスと対比)。
  bossFlying: { metal: 0x0e1a24, base: 0x1d3a52, light: 0x2f5f82, accent: 0x37c8ff, accent2: 0xb78cff },
  // 収容番人: 明るい鋼鉄 × ハザードアンバー(重装の管理機。赤いボス/冷たい飛行ボスと対比し、暗くなりすぎない)。
  bossWarden: { metal: 0x3a4654, base: 0x55636f, light: 0x8a98a6, accent: 0xffc233, accent2: 0x46e0c0 },
} as const;

// プレイヤー(28x40): ヘルメット頭 + 胴 + 片腕アームキャノン + 二脚。
const P = PALETTE.player;
const playerRig: RigSpec = {
  family: 'player',
  swingRad: 0.6,
  walkCycleMs: 480,
  parts: [
    { key: PART.player.legBack, shape: 'leg', w: 8, h: 16, fill: P.metal, accent: P.accent, x: -3, y: 7, originX: 0.5, originY: 0, role: 'legBack' },
    { key: PART.player.armBack, shape: 'roundedBox', w: 7, h: 15, fill: P.metal, accent: P.accent, x: -8, y: -5, originX: 0.5, originY: 0.12, role: 'armBack' },
    { key: PART.player.torso, shape: 'roundedBox', w: 18, h: 18, fill: P.base, accent: P.accent, accent2: P.accent2, x: 0, y: 0, originX: 0.5, originY: 0.5, role: 'torso' },
    { key: PART.player.legFront, shape: 'leg', w: 8, h: 16, fill: P.metal, accent: P.accent, x: 4, y: 7, originX: 0.5, originY: 0, role: 'legFront' },
    { key: PART.player.head, shape: 'helmet', w: 18, h: 15, fill: P.light, accent: P.accent, accent2: P.accent2, x: 1, y: -15, originX: 0.5, originY: 0.5, role: 'head' },
    { key: PART.player.armFront, shape: 'cannon', w: 16, h: 10, fill: P.base, accent: P.accent2, x: 7, y: -3, originX: 0.2, originY: 0.5, role: 'armFront' },
  ],
};

// walker(30x30): 二足歩行のパトロール機。腕なし、センサー頭。
const W = PALETTE.walker;
const walkerRig: RigSpec = {
  family: 'walker',
  swingRad: 0.7,
  walkCycleMs: 420,
  parts: [
    { key: PART.walker.legBack, shape: 'leg', w: 7, h: 15, fill: W.metal, accent: W.accent, x: -6, y: 5, originX: 0.5, originY: 0, role: 'legBack' },
    { key: PART.walker.torso, shape: 'roundedBox', w: 22, h: 15, fill: W.base, accent: W.accent, accent2: W.accent2, x: 0, y: -2, originX: 0.5, originY: 0.5, role: 'torso' },
    { key: PART.walker.legFront, shape: 'leg', w: 7, h: 15, fill: W.metal, accent: W.accent, x: 6, y: 5, originX: 0.5, originY: 0, role: 'legFront' },
    { key: PART.walker.head, shape: 'sensor', w: 13, h: 10, fill: W.light, accent: W.accent2, x: 4, y: -12, originX: 0.5, originY: 0.5, role: 'head' },
  ],
};

// turret(32x32): 脚なし据置砲台。台座 + 旋回ドーム + 砲身(発射時に反動)。
const T = PALETTE.turret;
const turretRig: RigSpec = {
  family: 'turret',
  swingRad: 0, // 脚なし(歩行スイングなし)
  walkCycleMs: 0,
  parts: [
    { key: PART.turret.base, shape: 'base', w: 28, h: 13, fill: T.metal, accent: T.accent, x: 0, y: 9, originX: 0.5, originY: 0.5, role: 'base' },
    { key: PART.turret.dome, shape: 'dome', w: 20, h: 17, fill: T.base, accent: T.accent2, x: 0, y: -2, originX: 0.5, originY: 0.6, role: 'dome' },
    { key: PART.turret.barrel, shape: 'barrel', w: 18, h: 9, fill: T.light, accent: T.accent, accent2: T.accent2, x: 6, y: -4, originX: 0.1, originY: 0.5, role: 'barrel' },
  ],
};

// ボス(80x88): 重量級の大型警備機。重い胴 + ヘルメット頭 + 大型アームキャノン + 二脚。
const B = PALETTE.boss;
const bossRig: RigSpec = {
  family: 'boss',
  swingRad: 0.4,
  walkCycleMs: 620,
  parts: [
    { key: PART.boss.legBack, shape: 'leg', w: 18, h: 30, fill: B.metal, accent: B.accent, x: -12, y: 16, originX: 0.5, originY: 0, role: 'legBack' },
    { key: PART.boss.armBack, shape: 'roundedBox', w: 15, h: 32, fill: B.metal, accent: B.accent, x: -26, y: -8, originX: 0.5, originY: 0.12, role: 'armBack' },
    { key: PART.boss.torso, shape: 'roundedBox', w: 52, h: 46, fill: B.base, accent: B.accent, accent2: B.accent2, x: 0, y: -2, originX: 0.5, originY: 0.5, role: 'torso' },
    { key: PART.boss.legFront, shape: 'leg', w: 18, h: 30, fill: B.metal, accent: B.accent, x: 12, y: 16, originX: 0.5, originY: 0, role: 'legFront' },
    { key: PART.boss.head, shape: 'helmet', w: 32, h: 23, fill: B.light, accent: B.accent, accent2: B.accent2, x: 2, y: -30, originX: 0.5, originY: 0.5, role: 'head' },
    { key: PART.boss.armFront, shape: 'cannon', w: 36, h: 22, fill: B.light, accent: B.accent2, x: 22, y: -6, originX: 0.2, originY: 0.5, role: 'armFront' },
  ],
};

// 飛行ボス(76x64): 脚なしの空中機。中央コア + 単眼センサー頭 + 左右ウィング + 下部キャノン。
// swingRad/walkCycleMs=0 で歩行スイングを止め、shoot 時のみキャノンがリコイルする。
const BF = PALETTE.bossFlying;
const bossFlyingRig: RigSpec = {
  family: 'bossFlying',
  swingRad: 0, // 脚なし(歩行スイングなし)
  walkCycleMs: 0,
  parts: [
    { key: PART.bossFlying.wingBack, shape: 'roundedBox', w: 34, h: 14, fill: BF.metal, accent: BF.accent, x: -30, y: -2, originX: 0.5, originY: 0.5, role: 'torso' },
    { key: PART.bossFlying.wingFront, shape: 'roundedBox', w: 34, h: 14, fill: BF.metal, accent: BF.accent2, x: 30, y: -2, originX: 0.5, originY: 0.5, role: 'torso' },
    { key: PART.bossFlying.core, shape: 'roundedBox', w: 46, h: 38, fill: BF.base, accent: BF.accent, accent2: BF.accent2, x: 0, y: 0, originX: 0.5, originY: 0.5, role: 'torso' },
    { key: PART.bossFlying.cannon, shape: 'cannon', w: 28, h: 16, fill: BF.light, accent: BF.accent, x: 14, y: 10, originX: 0.2, originY: 0.5, role: 'armFront' },
    { key: PART.bossFlying.head, shape: 'sensor', w: 24, h: 14, fill: BF.light, accent: BF.accent2, x: 0, y: -22, originX: 0.5, originY: 0.5, role: 'head' },
  ],
};

// 収容番人(92x96): 重装の大型管理機。stage1 ボスと別シルエットで「重い・広い・装甲」を表す。
// 幅広の胴 + 肩の装甲バー(パールドロン) + 短く太い二脚 + 大型の拘束クランプ腕。
// 歩行スイングは小さめ(重量級でのっそり動く)。色はハザードアンバー基調で視認性を確保する。
const WD = PALETTE.bossWarden;
const bossWardenRig: RigSpec = {
  family: 'bossWarden',
  swingRad: 0.3,
  walkCycleMs: 720,
  parts: [
    { key: PART.bossWarden.legBack, shape: 'leg', w: 24, h: 26, fill: WD.metal, accent: WD.accent, x: -15, y: 20, originX: 0.5, originY: 0, role: 'legBack' },
    { key: PART.bossWarden.legFront, shape: 'leg', w: 24, h: 26, fill: WD.metal, accent: WD.accent, x: 15, y: 20, originX: 0.5, originY: 0, role: 'legFront' },
    { key: PART.bossWarden.armBack, shape: 'roundedBox', w: 20, h: 42, fill: WD.metal, accent: WD.accent, x: -36, y: -6, originX: 0.5, originY: 0.12, role: 'armBack' },
    { key: PART.bossWarden.torso, shape: 'roundedBox', w: 62, h: 52, fill: WD.base, accent: WD.accent, accent2: WD.accent2, x: 0, y: 0, originX: 0.5, originY: 0.5, role: 'torso' },
    { key: PART.bossWarden.pauldron, shape: 'roundedBox', w: 70, h: 16, fill: WD.light, accent: WD.accent2, x: 0, y: -26, originX: 0.5, originY: 0.5, role: 'torso' },
    { key: PART.bossWarden.head, shape: 'helmet', w: 34, h: 26, fill: WD.light, accent: WD.accent, accent2: WD.accent2, x: 0, y: -38, originX: 0.5, originY: 0.5, role: 'head' },
    { key: PART.bossWarden.armFront, shape: 'cannon', w: 42, h: 30, fill: WD.light, accent: WD.accent2, x: 26, y: -2, originX: 0.2, originY: 0.5, role: 'armFront' },
  ],
};

/** 系統名 → リグ仕様。CharacterRig / PreloadScene が参照する。 */
export const RIGS = {
  player: playerRig,
  walker: walkerRig,
  turret: turretRig,
  boss: bossRig,
  bossFlying: bossFlyingRig,
  bossWarden: bossWardenRig,
} as const;

export type RigFamily = keyof typeof RIGS;

/** 全リグのパーツを列挙(PreloadScene のテクスチャ生成で全件走査するため)。 */
export function allRigParts(): RigPartSpec[] {
  return Object.values(RIGS).flatMap((rig) => rig.parts);
}

/** balance.ts の寸法とリグ系統の対応(将来の寸法変更時の参照用)。 */
export const RIG_BODY_SIZE = {
  player: { width: PLAYER.width, height: PLAYER.height },
  walker: { width: ENEMY.walker.width, height: ENEMY.walker.height },
  turret: { width: ENEMY.turret.width, height: ENEMY.turret.height },
  boss: { width: BOSS.width, height: BOSS.height },
  bossFlying: { width: FLYING_BOSS.width, height: FLYING_BOSS.height },
  bossWarden: { width: CONTAINMENT_WARDEN.width, height: CONTAINMENT_WARDEN.height },
} as const;
