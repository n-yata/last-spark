// プレイヤー RAY のカットアウト・リグ幾何。scripts/cut-ray.mjs が art-src/ray-side.png を解析・
// 切り出して出力した records を、実行時 fetch せず定数化したもの(単一の真実)。SpriteRig がこの座標で
// 上半身/前腕/前脚/後脚を元の立ち絵どおりに組み立て、脚を股関節・腕を肩で振る。
//
// 【現在は休眠中】RAY だけイラスト品質だと敵/世界(手続き画風)から浮くため、プレイヤーは手続きの
//   CharacterRig に戻している(この raySprite/SpriteRig/art-src/cut-ray.mjs は将来の再利用のため温存)。
//   再有効化手順: ①`node scripts/cut-ray.mjs` でパーツ webp を再生成 →
//   ②PreloadScene で RAY_SPRITE の load.image を復活 → ③Player の rig を SpriteRig + RAY_MUZZLE に戻す。
//   敵/ボス/地形/背景も同画風へ上げてから有効化するのが望ましい(単体だと浮く)。
//
// 座標は原画(ray-side.png, 1536x1024)ピクセル。bbox はキャラの不透明範囲。
// hipX/hipY=脚の股関節ピボット、shoulderX/Y=腕の肩ピボット、muzzle=キャノン先端(発射位置)。

export interface RayPartRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface RayJointRect extends RayPartRect {
  /** 関節ピボット(原画座標)。脚は股関節、腕は肩。 */
  pivotX: number;
  pivotY: number;
}

export const RAY_GEOM = {
  bbox: { minX: 544, maxX: 1117, minY: 94, maxY: 903 },
  body: { left: 671, top: 94, width: 184, height: 381 } as RayPartRect,
  armFront: { left: 835, top: 216, width: 283, height: 73, pivotX: 853, pivotY: 252 } as RayJointRect,
  legFront: { left: 800, top: 541, width: 262, height: 356, pivotX: 845, pivotY: 541 } as RayJointRect,
  legBack: { left: 544, top: 458, width: 346, height: 446, pivotX: 766, pivotY: 458 } as RayJointRect,
  /** キャノン先端(原画座標)。発射位置の基準。 */
  muzzle: { x: 1117, y: 252 },
} as const;

// 表示チューニング。
export const RAY_RIG = {
  /** 画面上の全身の高さ(px, 論理)。当たり判定(PLAYER)とは独立した見た目サイズ。
   *  大きいほどキャノンが弾の高さより上にズレる。弾位置に程よく近づく大きさに抑える。 */
  targetHeight: 44,
  /** 輪郭を際立たせる発光リム(暗い背景でRAYの位置が分かるように)。絵のディテールを潰さない控えめさ。 */
  rimColor: 0x37f7d8,
  rimStrength: 1,
  rimDistance: 4,
  /** 歩行の脚スイング振幅(rad)。跳ねて見えないよう控えめに。 */
  swingRad: 0.38,
  /** 歩行の腕スイング振幅(rad)。脚と逆位相で控えめに(キャノンを持つ腕なので振りすぎない)。 */
  armSwingRad: 0.16,
  /** 歩行周期(ms)。 */
  walkCycleMs: 540,
  /** 歩行時の上下バウンス(表示px)。小さくして「スキップ」感を消す。 */
  bobPx: 2,
  /** 発射時に腕(キャノン)を跳ね上げる量(rad)。 */
  armRecoilRad: 0.5,
} as const;

const SCALE = RAY_RIG.targetHeight / (RAY_GEOM.bbox.maxY - RAY_GEOM.bbox.minY);
const CX = (RAY_GEOM.bbox.minX + RAY_GEOM.bbox.maxX) / 2;

// 発射位置オフセット(エンティティ中心からの表示px)。
// dx(前方リーチ)はリグ実寸から導出。dy は「視覚のキャノン位置」ではなく
// 「接地する敵に当たる高さ」を優先し、エンティティ中心のすぐ上に固定する(ゲーム性優先)。
// 大柄なRAYのキャノン(胸の高さ)から撃つと短い敵を弾が飛び越すため、両者を意図的に分離する。
export const RAY_MUZZLE = {
  dx: (RAY_GEOM.muzzle.x - CX) * SCALE,
  dy: -6,
} as const;
