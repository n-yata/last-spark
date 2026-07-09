import { PLAYER } from '../config/balance';
import type { InputState, MoveDir } from '../types/input';

// プレイヤー移動の純粋ロジック(Phaser 非依存)。
// 入力 → 速度/ジャンプ/向きの決定をテスト可能に切り出す。

/** 水平方向の目標速度(px/s)を返す。 */
export function resolveHorizontalVelocity(moveDir: MoveDir): number {
  return moveDir * PLAYER.moveSpeed;
}

export interface HorizontalMotionParams {
  currentVx: number;
  moveDir: MoveDir;
  onGround: boolean;
  deltaMs: number;
}

/**
 * 目標速度(moveDir * moveSpeed)へ、地上/空中別の加減速で近づける。
 * 即時反応より少しだけ溜めを持たせつつ、逆方向入力では素早く切り返して
 * 「重すぎないが気持ちよく伸びる」横移動へ寄せる。
 */
export function resolveHorizontalMotion(p: HorizontalMotionParams): number {
  const targetVx = resolveHorizontalVelocity(p.moveDir);
  const dt = Math.max(0, p.deltaMs) / 1000;
  if (dt === 0) return p.currentVx;

  const accelerating = p.moveDir !== 0;
  const baseRate = accelerating
    ? p.onGround
      ? PLAYER.groundAccel
      : PLAYER.airAccel
    : p.onGround
      ? PLAYER.groundDecel
      : PLAYER.airDecel;
  const turning =
    p.moveDir !== 0 &&
    p.currentVx !== 0 &&
    Math.sign(p.currentVx) !== Math.sign(targetVx);
  const rate = turning ? baseRate * PLAYER.turnAccelMultiplier : baseRate;
  const maxDelta = rate * dt;
  const delta = Math.min(Math.max(targetVx - p.currentVx, -maxDelta), maxDelta);
  const nextVx = p.currentVx + delta;
  if (!accelerating && Math.abs(nextVx) < maxDelta) return 0;
  return Math.min(Math.max(nextVx, -PLAYER.moveSpeed), PLAYER.moveSpeed);
}

/** ジャンプすべきか(接地中の立ち上がり入力のみ)。 */
export function shouldJump(input: InputState, onGround: boolean): boolean {
  return input.jumpPressed && onGround;
}

/** resolveJumpStart の入力。タイムスタンプは未成立状態を -Infinity で表す。 */
export interface JumpStartParams {
  /** このフレームのジャンプ立ち上がり入力 */
  jumpPressed: boolean;
  /** 接地中か */
  onGround: boolean;
  /** ジャンプ離陸済みか(上昇フェーズ中)。true の間は再ジャンプ不可 */
  isJumping: boolean;
  /** 現在時刻(ms) */
  now: number;
  /** 最後に接地していた時刻(ms)。ジャンプ発動時に呼び出し側で -Infinity へリセットする */
  lastGroundedAt: number;
  /** コヨーテタイム猶予(ms) */
  coyoteMs: number;
  /** 空中でジャンプ入力があった時刻(ms)。ジャンプ発動時に呼び出し側で -Infinity へリセットする */
  jumpBufferedAt: number;
  /** 先行入力バッファ猶予(ms) */
  jumpBufferMs: number;
}

/**
 * 今フレームでジャンプを開始すべきか(コヨーテタイム + 先行入力バッファ対応)。
 * - 立ち上がり入力があり、接地中またはコヨーテ猶予内(足場を離れた直後)なら発動。
 * - 接地した瞬間に、バッファ猶予内の先行入力(空中で押されたジャンプ)があれば発動。
 * - isJumping(ジャンプ離陸済み)の間は発動しない(空中二段ジャンプ防止)。
 *
 * 二重消費の防止は呼び出し側の責務: 発動したら lastGroundedAt / jumpBufferedAt を
 * -Infinity へリセットすること。
 */
export function resolveJumpStart(p: JumpStartParams): boolean {
  if (p.isJumping) return false;
  const withinCoyote = p.onGround || p.now - p.lastGroundedAt <= p.coyoteMs;
  if (p.jumpPressed && withinCoyote) return true;
  return p.onGround && p.now - p.jumpBufferedAt <= p.jumpBufferMs;
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

export interface AirVelocityParams {
  velocityY: number;
  onGround: boolean;
  jumpHeld: boolean;
  deltaMs: number;
  gravityY: number;
}

/**
 * 既定重力に対して追加補正だけを返す。Arcade Physics が毎フレーム base gravity を適用する前提で、
 * ここでは「頂点付近は少し軽く」「落下は少し重く」なる差分を velocityY に先に乗せる。
 */
export function applyAirGravityTuning(p: AirVelocityParams): number {
  if (p.onGround) return p.velocityY;
  const dt = Math.max(0, p.deltaMs) / 1000;
  if (dt === 0) return p.velocityY;

  const nearApex = p.jumpHeld && p.velocityY < 0 && Math.abs(p.velocityY) <= PLAYER.apexHangVy;
  const gravityMul = nearApex
    ? PLAYER.apexGravityMultiplier
    : p.velocityY >= 0
      ? PLAYER.fallGravityMultiplier
      : 1;
  const extraGravity = p.gravityY * (gravityMul - 1) * dt;
  const nextVy = p.velocityY + extraGravity;
  return Math.min(nextVy, PLAYER.maxFallSpeed);
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
