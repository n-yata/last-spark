import { describe, it, expect } from 'vitest';
import { loopRayTint } from '../../../src/config/balance';

describe('loopRayTint', () => {
  it('1周目は無着色(白)を返す', () => {
    expect(loopRayTint(1)).toBe(0xffffff);
  });

  it('周回数が増えるごとに異なる配色を返す', () => {
    const loop1 = loopRayTint(1);
    const loop2 = loopRayTint(2);
    const loop3 = loopRayTint(3);
    expect(loop2).not.toBe(loop1);
    expect(loop3).not.toBe(loop2);
  });

  it('3周目で上限に達し、4周目以降は同じ配色のまま頭打ちになる', () => {
    const loop3 = loopRayTint(3);
    expect(loopRayTint(4)).toBe(loop3);
    expect(loopRayTint(10)).toBe(loop3);
  });
});
