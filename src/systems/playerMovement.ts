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
