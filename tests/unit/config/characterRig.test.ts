import { describe, it, expect } from 'vitest';
import { RIGS } from '../../../src/config/characterRig';

// リグ構成の回帰テスト。②ボス手当て(S2 哨戒機=単眼サーチライト)で、見た目の変更が
// 雑魚敵(walker)へ波及しないこと(隔離)と、哨戒機の頭が専用形状になっていることを守る。

describe('characterRig(リグ構成)', () => {
  it('哨戒機(bossFlying)の頭は単眼サーチライト形状 cyclops を使う', () => {
    const head = RIGS.bossFlying.parts.find((p) => p.role === 'head');
    expect(head).toBeDefined();
    expect(head!.shape).toBe('cyclops');
  });

  it('哨戒機の頭は主/副2色の発光を持つ(サーチライトのコントラスト)', () => {
    const head = RIGS.bossFlying.parts.find((p) => p.role === 'head')!;
    expect(head.accent2).toBeDefined();
    expect(head.accent2).not.toBe(head.accent);
  });

  it('雑魚 walker の頭は従来の sensor のまま(哨戒機の手当てが波及しない)', () => {
    const head = RIGS.walker.parts.find((p) => p.role === 'head');
    expect(head).toBeDefined();
    expect(head!.shape).toBe('sensor');
  });

  it('cyclops 形状を使うのは哨戒機の頭だけ(意図しない流用がない)', () => {
    const cyclopsParts = Object.values(RIGS)
      .flatMap((rig) => rig.parts)
      .filter((p) => p.shape === 'cyclops');
    expect(cyclopsParts).toHaveLength(1);
    expect(cyclopsParts[0].key).toBe(
      RIGS.bossFlying.parts.find((p) => p.role === 'head')!.key,
    );
  });
});
