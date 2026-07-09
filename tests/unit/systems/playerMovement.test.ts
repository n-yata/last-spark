import { describe, it, expect } from 'vitest';
import {
  resolveHorizontalVelocity,
  resolveHorizontalMotion,
  shouldJump,
  resolveJumpStart,
  type JumpStartParams,
  resolveFacing,
  facingSign,
  shouldCutJump,
  cutJumpVelocity,
  applyAirGravityTuning,
  shouldLandOnOneWay,
  boxesOverlap,
  overlapsAnyLadder,
  resolveLadderState,
  climbVelocity,
  type Box,
} from '../../../src/systems/playerMovement';
import { PLAYER } from '../../../src/config/balance';
import type { InputState } from '../../../src/types/input';

const baseInput: InputState = {
  moveDir: 0,
  climbDir: 0,
  jumpPressed: false,
  jumpHeld: false,
  shootPressed: false,
  shootHeld: false,
  shootReleased: false,
  shootCancel: false,
};

describe('resolveHorizontalVelocity', () => {
  it('moveDir に moveSpeed を掛けた速度を返す', () => {
    expect(resolveHorizontalVelocity(-1)).toBe(-PLAYER.moveSpeed);
    expect(resolveHorizontalVelocity(0)).toBe(0);
    expect(resolveHorizontalVelocity(1)).toBe(PLAYER.moveSpeed);
  });
});

describe('resolveHorizontalMotion', () => {
  it('地上では即時固定ではなく、加速で目標速度へ近づく', () => {
    expect(
      resolveHorizontalMotion({
        currentVx: 0,
        moveDir: 1,
        onGround: true,
        deltaMs: 16,
      }),
    ).toBeCloseTo(38.4, 4);
  });

  it('入力を離した地上では減速し、十分遅ければ 0 に吸着する', () => {
    expect(
      resolveHorizontalMotion({
        currentVx: 20,
        moveDir: 0,
        onGround: true,
        deltaMs: 16,
      }),
    ).toBe(0);
  });

  it('逆方向入力では切り返し倍率が掛かり、空中より素早く向きを変える', () => {
    const groundTurn = resolveHorizontalMotion({
      currentVx: 120,
      moveDir: -1,
      onGround: true,
      deltaMs: 16,
    });
    const airTurn = resolveHorizontalMotion({
      currentVx: 120,
      moveDir: -1,
      onGround: false,
      deltaMs: 16,
    });
    expect(Math.abs(groundTurn)).toBeLessThan(Math.abs(airTurn));
  });

  it('空中減速は地上より緩く、慣性が少し残る', () => {
    const groundBrake = resolveHorizontalMotion({
      currentVx: 100,
      moveDir: 0,
      onGround: true,
      deltaMs: 16,
    });
    const airBrake = resolveHorizontalMotion({
      currentVx: 100,
      moveDir: 0,
      onGround: false,
      deltaMs: 16,
    });
    expect(Math.abs(airBrake)).toBeGreaterThan(Math.abs(groundBrake));
  });
});

describe('shouldJump', () => {
  it('接地中の立ち上がり入力でのみ真', () => {
    expect(shouldJump({ ...baseInput, jumpPressed: true }, true)).toBe(true);
  });
  it('空中では発動しない', () => {
    expect(shouldJump({ ...baseInput, jumpPressed: true }, false)).toBe(false);
  });
  it('入力が無ければ発動しない', () => {
    expect(shouldJump(baseInput, true)).toBe(false);
  });
});

describe('resolveJumpStart(コヨーテタイム + 先行入力バッファ)', () => {
  // 未成立状態(リセット済み)のタイムスタンプは -Infinity。
  const base: JumpStartParams = {
    jumpPressed: false,
    onGround: false,
    isJumping: false,
    now: 1000,
    lastGroundedAt: Number.NEGATIVE_INFINITY,
    coyoteMs: PLAYER.coyoteMs,
    jumpBufferedAt: Number.NEGATIVE_INFINITY,
    jumpBufferMs: PLAYER.jumpBufferMs,
  };

  it('接地中の立ち上がり入力で発動する(従来挙動の回帰)', () => {
    expect(resolveJumpStart({ ...base, jumpPressed: true, onGround: true })).toBe(true);
  });

  it('入力が無ければ接地中でも発動しない', () => {
    expect(resolveJumpStart({ ...base, onGround: true })).toBe(false);
  });

  it('コヨーテ: 足場を離れて猶予内の入力なら発動する(境界: coyoteMs ちょうどは有効)', () => {
    // 100ms 前まで接地していた(coyoteMs=100 ちょうど)
    expect(
      resolveJumpStart({ ...base, jumpPressed: true, lastGroundedAt: 1000 - PLAYER.coyoteMs }),
    ).toBe(true);
  });

  it('コヨーテ: 猶予を1msでも超えたら発動しない', () => {
    expect(
      resolveJumpStart({ ...base, jumpPressed: true, lastGroundedAt: 1000 - PLAYER.coyoteMs - 1 }),
    ).toBe(false);
  });

  it('コヨーテ: リセット済み(-Infinity)の空中入力では発動しない', () => {
    expect(resolveJumpStart({ ...base, jumpPressed: true })).toBe(false);
  });

  it('コヨーテ: ジャンプ離陸済み(isJumping)なら猶予内でも発動しない(二段ジャンプ防止)', () => {
    expect(
      resolveJumpStart({ ...base, jumpPressed: true, isJumping: true, lastGroundedAt: 990 }),
    ).toBe(false);
  });

  it('バッファ: 猶予内の先行入力があれば着地した瞬間に発動する(境界: jumpBufferMs ちょうどは有効)', () => {
    expect(
      resolveJumpStart({ ...base, onGround: true, jumpBufferedAt: 1000 - PLAYER.jumpBufferMs }),
    ).toBe(true);
  });

  it('バッファ: 猶予を1msでも超えたら着地しても発動しない', () => {
    expect(
      resolveJumpStart({
        ...base,
        onGround: true,
        jumpBufferedAt: 1000 - PLAYER.jumpBufferMs - 1,
      }),
    ).toBe(false);
  });

  it('バッファ: 空中では先行入力が残っていても発動しない(着地まで待つ)', () => {
    expect(resolveJumpStart({ ...base, jumpBufferedAt: 950 })).toBe(false);
  });

  it('バッファ: リセット済み(-Infinity)なら着地しても発動しない(二重消費防止の前提)', () => {
    expect(resolveJumpStart({ ...base, onGround: true })).toBe(false);
  });

  it('バッファ: 接地中でも isJumping なら発動しない', () => {
    expect(
      resolveJumpStart({ ...base, onGround: true, isJumping: true, jumpBufferedAt: 990 }),
    ).toBe(false);
  });
});

describe('resolveFacing', () => {
  it('移動入力がある時は向きを更新、停止時は維持', () => {
    expect(resolveFacing('right', -1)).toBe('left');
    expect(resolveFacing('left', 1)).toBe('right');
    expect(resolveFacing('left', 0)).toBe('left');
  });
});

describe('facingSign', () => {
  it('left=-1, right=1', () => {
    expect(facingSign('left')).toBe(-1);
    expect(facingSign('right')).toBe(1);
  });
});

describe('shouldCutJump(可変ジャンプ)', () => {
  it('上昇中(vy<0)にボタンを離したらカットする', () => {
    expect(shouldCutJump(false, true, -300)).toBe(true);
  });
  it('押し続けている間はカットしない(最大まで上昇)', () => {
    expect(shouldCutJump(true, true, -300)).toBe(false);
  });
  it('下降中(vy>=0)はカットしない', () => {
    expect(shouldCutJump(false, true, 0)).toBe(false);
    expect(shouldCutJump(false, true, 100)).toBe(false);
  });
  it('ジャンプ上昇フェーズでなければカットしない', () => {
    expect(shouldCutJump(false, false, -300)).toBe(false);
  });
});

describe('cutJumpVelocity', () => {
  it('上向き速度を倍率で弱める(短押し=低いジャンプ)', () => {
    expect(cutJumpVelocity(-620, 0.5)).toBe(-310);
  });

  it('短押しの最高到達点は最大ジャンプより低くなる', () => {
    const g = 1200;
    const maxHeight = PLAYER.jumpVelocity ** 2 / (2 * g);
    const cutVy = cutJumpVelocity(PLAYER.jumpVelocity, PLAYER.jumpCutMultiplier);
    const cutHeight = cutVy ** 2 / (2 * g);
    expect(cutHeight).toBeLessThan(maxHeight);
  });
});

describe('applyAirGravityTuning', () => {
  it('接地中は速度を変えない', () => {
    expect(
      applyAirGravityTuning({
        velocityY: 0,
        onGround: true,
        jumpHeld: false,
        deltaMs: 16,
        gravityY: 1200,
      }),
    ).toBe(0);
  });

  it('頂点付近で押し続けている間は重力を弱め、少しだけハングする', () => {
    const next = applyAirGravityTuning({
      velocityY: -80,
      onGround: false,
      jumpHeld: true,
      deltaMs: 16,
      gravityY: 1200,
    });
    expect(next).toBeLessThan(-80);
  });

  it('落下中は追加重力を掛けて下降をきびきびさせる', () => {
    const next = applyAirGravityTuning({
      velocityY: 200,
      onGround: false,
      jumpHeld: false,
      deltaMs: 16,
      gravityY: 1200,
    });
    expect(next).toBeGreaterThan(200);
  });

  it('最大落下速度を超えない', () => {
    const next = applyAirGravityTuning({
      velocityY: PLAYER.maxFallSpeed + 120,
      onGround: false,
      jumpHeld: false,
      deltaMs: 16,
      gravityY: 1200,
    });
    expect(next).toBe(PLAYER.maxFallSpeed);
  });
});

describe('shouldLandOnOneWay(すり抜け床の着地判定 / 前フレーム足元基準)', () => {
  const platformTop = 300;
  it('下降中(velY>=0)かつ前フレーム足元が床上端付近なら着地する(true)', () => {
    expect(shouldLandOnOneWay(302, 120, platformTop)).toBe(true);
    expect(shouldLandOnOneWay(300, 0, platformTop)).toBe(true);
  });
  it('上昇中(velY<0)は床上端付近でも着地しない(下から通過)', () => {
    expect(shouldLandOnOneWay(300, -200, platformTop)).toBe(false);
  });
  it('前フレームに床より十分下に潜っていた時は着地しない(下から通過中)', () => {
    expect(shouldLandOnOneWay(360, 120, platformTop)).toBe(false);
  });
  it('境界: 許容(tolerance)ちょうどは着地、超過は非着地', () => {
    expect(shouldLandOnOneWay(platformTop + 6, 50, platformTop, 6)).toBe(true);
    expect(shouldLandOnOneWay(platformTop + 7, 50, platformTop, 6)).toBe(false);
  });
  it('高速落下でも前フレーム足元が床上なら着地する(トンネリング回帰: 大ジャンプの戻り)', () => {
    // 前フレーム足元(298)は床上端(300)より上。下向き高速(620px/s ≒ 10px/frame)でも、
    // 前フレーム基準なので深くめり込む前に着地が有効化される。
    // 旧実装(現在足元基準)なら今フレーム足元が許容窓(306)を飛び越し false=すり抜けになっていた。
    expect(shouldLandOnOneWay(298, 620, platformTop)).toBe(true);
  });
});

describe('boxesOverlap / overlapsAnyLadder', () => {
  const ladder: Box = { left: 100, right: 140, top: 200, bottom: 320 };
  it('重なっていれば true', () => {
    const player: Box = { left: 110, right: 138, top: 280, bottom: 320 };
    expect(boxesOverlap(player, ladder)).toBe(true);
  });
  it('辺が接するだけ(隣接)は重複としない', () => {
    const touching: Box = { left: 140, right: 168, top: 200, bottom: 240 };
    expect(boxesOverlap(touching, ladder)).toBe(false);
  });
  it('完全に離れていれば false', () => {
    const far: Box = { left: 300, right: 330, top: 200, bottom: 240 };
    expect(boxesOverlap(far, ladder)).toBe(false);
  });
  it('overlapsAnyLadder は複数のうち1つでも重なれば true', () => {
    const player: Box = { left: 110, right: 138, top: 280, bottom: 320 };
    const ladders: Box[] = [
      { left: 0, right: 20, top: 0, bottom: 20 },
      ladder,
    ];
    expect(overlapsAnyLadder(player, ladders)).toBe(true);
    expect(overlapsAnyLadder(player, [{ left: 0, right: 20, top: 0, bottom: 20 }])).toBe(false);
  });
});

describe('resolveLadderState(梯子の把持/離脱)', () => {
  it('未把持: 梯子に重なり上下入力で把持開始', () => {
    expect(resolveLadderState(false, true, -1, false)).toBe(true);
    expect(resolveLadderState(false, true, 1, false)).toBe(true);
  });
  it('未把持: 重なっていても上下入力が無ければ把持しない', () => {
    expect(resolveLadderState(false, true, 0, false)).toBe(false);
  });
  it('把持中: 梯子に重なっていれば入力ゼロでも把持継続(静止)', () => {
    expect(resolveLadderState(true, true, 0, false)).toBe(true);
  });
  it('把持中: 上入力でも下入力でも、重なっている限り継続(最下部離脱は呼び出し側の幾何判定)', () => {
    expect(resolveLadderState(true, true, -1, false)).toBe(true);
    expect(resolveLadderState(true, true, 1, false)).toBe(true);
  });
  it('ジャンプ入力で離脱', () => {
    expect(resolveLadderState(true, true, -1, true)).toBe(false);
  });
  it('梯子から外れたら離脱', () => {
    expect(resolveLadderState(true, false, -1, false)).toBe(false);
  });
});

describe('climbVelocity', () => {
  it('上(-1)は負の速度(上向き)、下(1)は正、0は静止', () => {
    expect(climbVelocity(-1, 120)).toBe(-120);
    expect(climbVelocity(1, 120)).toBe(120);
    expect(climbVelocity(0, 120)).toBe(0);
  });
});
