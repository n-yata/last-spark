import { describe, it, expect } from 'vitest';
import { getControlEntries } from '../../../src/ui/controlsData';

// 操作説明データ。基本操作を網羅し、キーボード表記が InputController のキーマップ
// (移動=矢印 / ジャンプ=SPACE / ショット=J / 梯子=上下)と一致することを検証する。

describe('controlsData', () => {
  const entries = getControlEntries();

  it('移動/ジャンプ/ショット/梯子の4操作を含む', () => {
    const actions = entries.map((e) => e.action);
    expect(actions).toContain('移動');
    expect(actions).toContain('ジャンプ');
    expect(actions).toContain('ショット');
    expect(actions).toContain('梯子の昇降');
  });

  it('全項目に action / keyboard / touch が埋まっている', () => {
    for (const e of entries) {
      expect(e.action.length).toBeGreaterThan(0);
      expect(e.keyboard.length).toBeGreaterThan(0);
      expect(e.touch.length).toBeGreaterThan(0);
    }
  });

  it('キーボード表記が InputController のキーマップと一致する', () => {
    const byAction = Object.fromEntries(entries.map((e) => [e.action, e.keyboard]));
    // InputController: jump=SPACE, shoot=J, move=LEFT/RIGHT, climb=UP/DOWN
    expect(byAction['ジャンプ']).toContain('SPACE');
    expect(byAction['ショット']).toContain('J');
    expect(byAction['移動']).toContain('←');
    expect(byAction['移動']).toContain('→');
    expect(byAction['梯子の昇降']).toContain('↑');
    expect(byAction['梯子の昇降']).toContain('↓');
  });
});
