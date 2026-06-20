import { describe, it, expect } from 'vitest';
import { shouldEmpowerPlayer } from '../../../src/systems/empowerment';

describe('shouldEmpowerPlayer', () => {
  it('stage6 はバスターモード OFF でも常に強化する(物語上の固有属性)', () => {
    expect(shouldEmpowerPlayer('stage6', false)).toBe(true);
  });

  it('stage6 はバスターモード ON でも当然強化する', () => {
    expect(shouldEmpowerPlayer('stage6', true)).toBe(true);
  });

  it('stage6 以外はバスターモード OFF なら強化しない', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']) {
      expect(shouldEmpowerPlayer(stageId, false)).toBe(false);
    }
  });

  it('stage6 以外でもバスターモード ON なら全ステージで強化する', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']) {
      expect(shouldEmpowerPlayer(stageId, true)).toBe(true);
    }
  });
});
