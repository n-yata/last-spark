import { describe, it, expect } from 'vitest';
import { shouldResumeGame } from '../../../src/systems/orientationGuard';

// 縦持ち判定とポーズの二重 pause 競合解消ロジック。
// resume してよいのは「横持ち(非縦持ち) かつ 非ポーズ」のときだけ。

describe('shouldResumeGame', () => {
  it('横持ち かつ 非ポーズ → resume する(true)', () => {
    expect(shouldResumeGame(false, false)).toBe(true);
  });

  it('縦持ち かつ 非ポーズ → resume しない(回転待ち)', () => {
    expect(shouldResumeGame(true, false)).toBe(false);
  });

  it('横持ち かつ ポーズ中 → resume しない(ポーズ維持)', () => {
    expect(shouldResumeGame(false, true)).toBe(false);
  });

  it('縦持ち かつ ポーズ中 → resume しない', () => {
    expect(shouldResumeGame(true, true)).toBe(false);
  });
});
