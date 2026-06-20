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

  it('cyclops 形状を使うのは飛行系ボス(哨戒機・使者)の頭だけ(地上系へ流用しない)', () => {
    const cyclopsParts = Object.values(RIGS)
      .flatMap((rig) => rig.parts)
      .filter((p) => p.shape === 'cyclops');
    // 単眼は「空から狙う/見張る眼」を持つ飛行系ボス(bossFlying/bossEnvoy)の頭に限る。
    const keys = cyclopsParts.map((p) => p.key).sort();
    const expected = [
      RIGS.bossFlying.parts.find((p) => p.role === 'head')!.key,
      RIGS.bossEnvoy.parts.find((p) => p.role === 'head')!.key,
    ].sort();
    expect(keys).toEqual(expected);
    // すべて head 役割(胴や腕に紛れていない)。
    expect(cyclopsParts.every((p) => p.role === 'head')).toBe(true);
  });

  it('使者(bossEnvoy)は専用リグで、飛行ボス(bossFlying)流用ではない', () => {
    const envoy = RIGS.bossEnvoy;
    // 頭は鋭い単眼(cyclops)。
    expect(envoy.parts.find((p) => p.role === 'head')!.shape).toBe('cyclops');
    // 前方へ突き出た槍は barrel(攻撃時にリコイル=突き)。
    const spear = envoy.parts.find((p) => p.shape === 'barrel');
    expect(spear).toBeDefined();
    expect(spear!.role).toBe('armFront');
    expect(spear!.x).toBeGreaterThan(0); // 前方(機体の進行方向)へ突き出る
    // 脚なしの飛行機体(歩行スイングなし)。
    expect(envoy.swingRad).toBe(0);
    expect(envoy.parts.some((p) => p.role === 'legBack' || p.role === 'legFront')).toBe(false);
    // bossFlying とはパーツキーを共有しない(独立リグ)。
    const flyingKeys = new Set(RIGS.bossFlying.parts.map((p) => p.key));
    expect(envoy.parts.every((p) => !flyingKeys.has(p.key))).toBe(true);
  });

  it('環境管理機(bossPurifier)は専用リグで、stage1 ボス(boss)流用ではない', () => {
    const pu = RIGS.bossPurifier;
    // 接地機なので二脚を持ち、歩行スイングがある(飛行系と違う)。
    expect(pu.parts.some((p) => p.role === 'legBack')).toBe(true);
    expect(pu.parts.some((p) => p.role === 'legFront')).toBe(true);
    expect(pu.swingRad).toBeGreaterThan(0);
    // 頭は戦闘用ヘルメットではなく低い作業頭(sensor)。
    expect(pu.parts.find((p) => p.role === 'head')!.shape).toBe('sensor');
    expect(pu.parts.some((p) => p.shape === 'helmet')).toBe(false);
    // 背面に汚染タンク(最背面=parts 先頭、本体より後方=負の x、縦長)を背負う。
    const tank = pu.parts[0];
    expect(tank.key).toBe(RIGS.bossPurifier.parts.find((p) => p.key.includes('tank'))!.key);
    expect(tank.x).toBeLessThan(0);
    expect(tank.h).toBeGreaterThan(tank.w);
    // stage1 ボス(boss)とはパーツキーを共有しない(独立リグ=placeholder 解消)。
    const bossKeys = new Set(RIGS.boss.parts.map((p) => p.key));
    expect(pu.parts.every((p) => !bossKeys.has(p.key))).toBe(true);
  });

  it('Shadow RAY はプレイヤーと同じ人型構成だが、パーツキーは共有しない', () => {
    const shadow = RIGS.bossShadowRay;
    expect(shadow.swingRad).toBe(RIGS.player.swingRad);
    expect(shadow.walkCycleMs).toBe(RIGS.player.walkCycleMs);
    expect(shadow.parts.map((p) => p.shape)).toEqual(RIGS.player.parts.map((p) => p.shape));
    expect(shadow.parts.map((p) => p.role)).toEqual(RIGS.player.parts.map((p) => p.role));
    const playerKeys = new Set(RIGS.player.parts.map((p) => p.key));
    expect(shadow.parts.every((p) => !playerKeys.has(p.key))).toBe(true);
  });
});
