import { PLAYER } from '../config/balance';
import type { InputState, MoveDir } from '../types/input';

// プレイヤー移動の純粋ロジック(Phaser 非依存)。
// 入力 → 速度/ジャンプ/向きの決定をテスト可能に切り出す。

/** 水平方向の目標速度(px/s)を返す。 */
export function resolveHorizontalVelocity(moveDir: MoveDir): number {
  return moveDir * PLAYER.moveSpeed;
}

/** ジャンプすべきか(接地中の立ち上がり入力のみ)。 */
export function shouldJump(input: InputState, onGround: boolean): boolean {
  return input.jumpPressed && onGround;
}

/**
 * 向きを決定する。移動入力がある時のみ更新し、停止時は直前の向きを維持する
 * (ショット方向の安定のため)。
 */
export function resolveFacing(current: 'left' | 'right', moveDir: MoveDir): 'left' | 'right' {
  if (moveDir < 0) return 'left';
  if (moveDir > 0) return 'right';
  return current;
}

/** 向きから弾の進行方向符号(-1/1)を返す。 */
export function facingSign(facing: 'left' | 'right'): -1 | 1 {
  return facing === 'left' ? -1 : 1;
}

/**
 * 可変ジャンプ: 上昇中(vy<0)にジャンプボタンを離したら上向き速度をカットすべきか。
 * 押し続けるほど高く飛び、早く離すほど低くなる(押した長さで高さが変わる)。
 * @param jumpHeld ジャンプボタン押下中か
 * @param isJumping ジャンプ上昇フェーズ中か
 * @param vy 現在の鉛直速度(上向き負)
 */
export function shouldCutJump(jumpHeld: boolean, isJumping: boolean, vy: number): boolean {
  return isJumping && !jumpHeld && vy < 0;
}

/** カット後の鉛直速度を返す(上昇を弱める)。 */
export function cutJumpVelocity(vy: number, multiplier: number): number {
  return vy * multiplier;
}

// ── すり抜け床(ワンウェイ床) ──────────────────────────────

/**
 * ワンウェイ床に着地(衝突)を有効化すべきか。
 * 下降中(velY>=0)かつ「前フレームの足元(prevBottom)」が床上端(platformTop)付近より上にある時だけ true。
 * 上昇中・前フレームに床より深く潜っていた時は false(=下から通り抜けられる)。
 *
 * 現在足元ではなく前フレーム足元で判定するのは、高速落下(大ジャンプの戻り等)で1フレームの移動量が
 * 床上端の許容窓(tolerance)を超え、現在足元だけ見ると窓を飛び越して(トンネリング)すり抜ける不具合を
 * 防ぐため。前フレームに床上にいて下降中なら、今フレームで深くめり込んでいても着地させる。
 * @param prevBottom  前フレームのプレイヤー足元 Y(Arcade Body.prev 由来)
 * @param playerVelY  鉛直速度(下向き正)
 * @param platformTop 床上端の Y
 * @param tolerance   上端からの許容めり込み(px)
 */
export function shouldLandOnOneWay(
  prevBottom: number,
  playerVelY: number,
  platformTop: number,
  tolerance = 6,
): boolean {
  return playerVelY >= 0 && prevBottom <= platformTop + tolerance;
}

// ── 梯子ギミック ──────────────────────────────────────────

/** AABB 矩形(左上 left/top、右下 right/bottom)。 */
export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** 2 つの矩形が重なっているか(辺の接触のみは非重複)。 */
export function boxesOverlap(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** プレイヤー矩形がいずれかの梯子矩形に重なっているか。 */
export function overlapsAnyLadder(player: Box, ladders: Box[]): boolean {
  return ladders.some((ladder) => boxesOverlap(player, ladder));
}

/**
 * 梯子の把持状態を決定する(純粋)。
 * - ジャンプ入力があれば離脱(梯子から飛び降りる)。
 * - 梯子に重なっていなければ離脱。
 * - 把持中は重なっている限り継続(静止含む)。
 * - 未把持: 上下入力(climbDir≠0)があれば把持開始。
 *
 * ※ 梯子最下部で地面に着いた時の離脱は、足元直下に梯子が残っているかという幾何判定が
 *   必要なため、呼び出し側(Player)で行う(ここでは扱わない)。
 * @param prevOnLadder 直前フレームの把持状態
 * @param overlapping  梯子に重なっているか(降り乗り込み判定を含めた実効値)
 * @param climbDir     上下入力(-1=上, 0=なし, 1=下)
 * @param jumpPressed  このフレームのジャンプ立ち上がり
 */
export function resolveLadderState(
  prevOnLadder: boolean,
  overlapping: boolean,
  climbDir: -1 | 0 | 1,
  jumpPressed: boolean,
): boolean {
  if (jumpPressed) return false;
  if (!overlapping) return false;
  if (prevOnLadder) return true;
  return climbDir !== 0;
}

/** 梯子昇降の鉛直速度。climbDir: -1=上(負=上向き), 1=下(正=下向き), 0=静止。 */
export function climbVelocity(climbDir: -1 | 0 | 1, speed: number): number {
  return climbDir * speed;
}
