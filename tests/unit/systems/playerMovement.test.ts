import { describe, it, expect } from 'vitest';
import {
  resolveHorizontalVelocity,
  shouldJump,
  resolveFacing,
  facingSign,
  shouldCutJump,
  cutJumpVelocity,
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

describe('shouldLandOnOneWay(すり抜け床の着地判定)', () => {
  const platformTop = 300;
  it('下降中(velY>=0)かつ足元が床上端付近なら着地する(true)', () => {
    expect(shouldLandOnOneWay(302, 120, platformTop)).toBe(true);
    expect(shouldLandOnOneWay(300, 0, platformTop)).toBe(true);
  });
  it('上昇中(velY<0)は床上端付近でも着地しない(下から通過)', () => {
    expect(shouldLandOnOneWay(300, -200, platformTop)).toBe(false);
  });
  it('床より十分下に潜っている時は着地しない(下から通過中)', () => {
    expect(shouldLandOnOneWay(360, 120, platformTop)).toBe(false);
  });
  it('境界: 許容(tolerance)ちょうどは着地、超過は非着地', () => {
    expect(shouldLandOnOneWay(platformTop + 6, 50, platformTop, 6)).toBe(true);
    expect(shouldLandOnOneWay(platformTop + 7, 50, platformTop, 6)).toBe(false);
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
