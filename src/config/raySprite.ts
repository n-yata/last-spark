// プレイヤー RAY のカットアウト・リグ幾何。scripts/cut-ray.mjs が ray-side.png を解析・切り出して
// 出力した records.json の値を、実行時 fetch せずに済むよう定数化したもの(単一の真実)。
// SpriteRig がこの座標で上半身/前脚/後脚を元の立ち絵どおりに組み立て、脚を股関節で振る。
//
// 座標は原画(ray-side.png, 1536x1024)ピクセル。bbox はキャラの不透明範囲。
// hipX/hipY は各脚の股関節ピボット(原画座標)。

export interface RayPartRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface RayLegRect extends RayPartRect {
  /** 股関節ピボット(原画座標)。脚はここを軸に回る。 */
  hipX: number;
  hipY: number;
}

export const RAY_GEOM = {
  bbox: { minX: 544, maxX: 1117, minY: 94, maxY: 903 },
  body: { left: 544, top: 94, width: 574, height: 380 } as RayPartRect,
  legFront: { left: 800, top: 541, width: 262, height: 356, hipX: 845, hipY: 541 } as RayLegRect,
  legBack: { left: 544, top: 458, width: 346, height: 446, hipX: 766, hipY: 458 } as RayLegRect,
} as const;

// 表示チューニング。
export const RAY_RIG = {
  /** 画面上の全身の高さ(px, 論理)。当たり判定(PLAYER)とは独立した見た目サイズ。 */
  targetHeight: 76,
  /** 歩行スイング振幅(rad)。 */
  swingRad: 0.5,
  /** 歩行周期(ms)。 */
  walkCycleMs: 520,
  /** 歩行時の上下バウンス(表示px)。 */
  bobPx: 4,
  /** 発射リコイルで rig 全体を後方へ引く量(表示px)。 */
  recoilPx: 8,
} as const;
