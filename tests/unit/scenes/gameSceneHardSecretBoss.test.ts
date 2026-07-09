import { beforeEach, describe, expect, it, vi } from 'vitest';

// 目的: ハードモード×stage6 の ECLIPSE(CoreBoss)撃破後、handleClear の
// コールバックチェーン(bossAfterglow → bossDeathSequence → spawnHardSecretBoss)が
// 実際に spawnHardSecretBoss まで到達し ShadowRayBoss が起動するかを再現・固定する。
//
// PR#129 で裏ボスが出なくなったバグの回帰テスト。判定ロジック自体
// (shouldSpawnHardModeSecretBoss)は無変更のため、コールバックチェーンや
// difficulty 保持の副作用を疑い、handleClear を直接駆動して検証する。

// Phaser 本体は import 時の副作用を避けるため最小モック。
vi.mock('phaser', () => ({
  default: {
    Scenes: { Events: { SHUTDOWN: 'shutdown' } },
    Scene: class MockScene {},
  },
}));

// entity クラスは instanceof 判定だけ効けばよいので軽量クラスに差し替える。
// vi.mock はホイストされるため、共有基底クラスは vi.hoisted で先に用意する。
const { MockBoss } = vi.hoisted(() => {
  class MockBoss {
    x = 640;
    y = 320;
    maxHp = 100;
    hp = 0;
    phase2HpRatio = 0.5;
    destroy = vi.fn();
    getPhase = vi.fn(() => 1);
    setProjectiles = vi.fn();
    setArenaBounds = vi.fn();
  }
  return { MockBoss };
});
vi.mock('../../../src/entities/Boss', () => ({ Boss: MockBoss }));
vi.mock('../../../src/entities/FlyingBoss', () => ({ FlyingBoss: class extends MockBoss {} }));
vi.mock('../../../src/entities/EnvoyBoss', () => ({ EnvoyBoss: class extends MockBoss {} }));
vi.mock('../../../src/entities/WardenBoss', () => ({ WardenBoss: class extends MockBoss {} }));
vi.mock('../../../src/entities/PurifierBoss', () => ({ PurifierBoss: class extends MockBoss {} }));
vi.mock('../../../src/entities/CoreBoss', () => ({ CoreBoss: class CoreBoss extends MockBoss {} }));
vi.mock('../../../src/entities/ShadowRayBoss', () => ({
  ShadowRayBoss: class ShadowRayBoss extends MockBoss {},
}));
vi.mock('../../../src/entities/Player', () => ({ Player: class MockPlayer {} }));
vi.mock('../../../src/entities/Projectile', () => ({ Projectile: class MockProjectile {} }));
vi.mock('../../../src/entities/Hazard', () => ({ Hazard: class MockHazard {} }));

// GameScene が import する Phaser 依存の System 群はモックして、実 Phaser 物理の
// 読み込み(Enemy extends Phaser.Physics.Arcade.Sprite 等)を回避する。
vi.mock('../../../src/systems/InputController', () => ({
  InputController: class MockInputController {},
}));
vi.mock('../../../src/systems/CombatSystem', () => ({
  CombatSystem: class MockCombatSystem {},
}));
vi.mock('../../../src/systems/SpawnSystem', () => ({
  SpawnSystem: class MockSpawnSystem {},
}));
vi.mock('../../../src/systems/EffectsManager', () => ({
  EffectsManager: class MockEffectsManager {},
}));

const soundMock = { stopBgm: vi.fn(), playSe: vi.fn(), playBgm: vi.fn() };
vi.mock('../../../src/systems/SoundManager', () => ({ getSound: () => soundMock }));

const hapticsMock = { vibrateBossDefeat: vi.fn() };
vi.mock('../../../src/systems/haptics', () => ({ getHaptics: () => hapticsMock }));

import { GameScene } from '../../../src/scenes/GameScene';
import { CoreBoss } from '../../../src/entities/CoreBoss';
import { PurifierBoss } from '../../../src/entities/PurifierBoss';
import { ShadowRayBoss } from '../../../src/entities/ShadowRayBoss';

type DifficultyMode = 'normal' | 'hard';

interface Harness {
  scene: GameScene;
  spawnHardSecretBoss: ReturnType<typeof vi.fn>;
  finishStageClear: ReturnType<typeof vi.fn>;
  effects: {
    bossAfterglow: ReturnType<typeof vi.fn>;
    bossDeathSequence: ReturnType<typeof vi.fn>;
  };
}

/**
 * handleClear を駆動できる最小の GameScene を組み立てる。
 * bossAfterglow / bossDeathSequence は本番同様「onComplete で次段を呼ぶ」挙動を
 * 同期実行で再現し、チェーンが最後まで到達するかを検証できるようにする。
 */
function makeScene(opts: {
  difficulty: DifficultyMode;
  stageId: string;
  shadowRaySpawned?: boolean;
  storyEnabled?: boolean;
  postBossCutsceneKey?: string;
}): Harness {
  const scene = Object.create(GameScene.prototype) as GameScene;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = scene as any;

  s.ended = false;
  s.inPostBoss = false;
  s.difficulty = opts.difficulty;
  s.stageId = opts.stageId;
  s.shadowRaySpawned = opts.shadowRaySpawned ?? false;
  s.shadowRayActive = false;
  s.storyEnabled = opts.storyEnabled ?? false;
  s.startTime = 0;
  s.player = { hp: 100, maxHp: 100, setVelocityX: vi.fn() };
  s.stage = { postBossCutsceneKey: opts.postBossCutsceneKey };
  s.time = { now: 1000 };
  s.registry = { set: vi.fn() };
  s.currentBossPresentationColor = vi.fn(() => 0xffffff);

  const bossAfterglow = vi.fn((_x: number, _y: number, _c: number, onComplete: () => void) => {
    onComplete();
  });
  const bossDeathSequence = vi.fn((_x: number, _y: number, onComplete: () => void) => {
    onComplete();
  });
  s.effects = { bossAfterglow, bossDeathSequence };

  const spawnHardSecretBoss = vi.fn();
  const finishStageClear = vi.fn();
  s.spawnHardSecretBoss = spawnHardSecretBoss;
  s.finishStageClear = finishStageClear;
  s.enterRescuePhase = vi.fn();

  return { scene, spawnHardSecretBoss, finishStageClear, effects: { bossAfterglow, bossDeathSequence } };
}

function callHandleClear(scene: GameScene, boss: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (scene as any).handleClear(boss);
}

describe('GameScene hard-mode secret boss (ShadowRayBoss) trigger', () => {
  beforeEach(() => {
    soundMock.stopBgm.mockReset();
    soundMock.playSe.mockReset();
    soundMock.playBgm.mockReset();
    hapticsMock.vibrateBossDefeat.mockReset();
  });

  it('hard×stage6 で ECLIPSE 撃破時、コールバックチェーンを最後まで通り spawnHardSecretBoss へ到達する', () => {
    const h = makeScene({ difficulty: 'hard', stageId: 'stage6' });
    const core = new CoreBoss(scene(h) as never, 0, 0) as unknown;

    callHandleClear(h.scene, core);

    expect(h.effects.bossAfterglow).toHaveBeenCalledTimes(1);
    expect(h.effects.bossDeathSequence).toHaveBeenCalledTimes(1);
    // これが本命: 裏ボス起動に到達しているか。
    expect(h.spawnHardSecretBoss).toHaveBeenCalledTimes(1);
    // 裏ボス分岐ではクリア確定(finishStageClear)へ進まない。
    expect(h.finishStageClear).not.toHaveBeenCalled();
  });

  it('normalモード×stage6 では裏ボスを起動せず通常クリアへ進む', () => {
    const h = makeScene({ difficulty: 'normal', stageId: 'stage6' });
    const core = new CoreBoss(scene(h) as never, 0, 0) as unknown;

    callHandleClear(h.scene, core);

    expect(h.spawnHardSecretBoss).not.toHaveBeenCalled();
    expect(h.finishStageClear).toHaveBeenCalledTimes(1);
  });

  it('hardモードでも stage6 以外(stage5)では裏ボスを起動しない', () => {
    const h = makeScene({ difficulty: 'hard', stageId: 'stage5' });
    const core = new CoreBoss(scene(h) as never, 0, 0) as unknown;

    callHandleClear(h.scene, core);

    expect(h.spawnHardSecretBoss).not.toHaveBeenCalled();
    expect(h.finishStageClear).toHaveBeenCalledTimes(1);
  });

  it('hard×stage6 でも撃破ボスが CoreBoss でなければ(取り違え)裏ボスを起動しない', () => {
    const h = makeScene({ difficulty: 'hard', stageId: 'stage6' });
    const other = new PurifierBoss(scene(h) as never, 0, 0) as unknown;

    callHandleClear(h.scene, other);

    expect(h.spawnHardSecretBoss).not.toHaveBeenCalled();
    expect(h.finishStageClear).toHaveBeenCalledTimes(1);
  });

  it('既に裏ボス起動済み(shadowRaySpawned)なら再起動しない', () => {
    const h = makeScene({ difficulty: 'hard', stageId: 'stage6', shadowRaySpawned: true });
    const core = new CoreBoss(scene(h) as never, 0, 0) as unknown;

    callHandleClear(h.scene, core);

    expect(h.spawnHardSecretBoss).not.toHaveBeenCalled();
    expect(h.finishStageClear).toHaveBeenCalledTimes(1);
  });

  it('ShadowRayBoss 自身の撃破では裏ボスを再起動しない(通常クリアへ)', () => {
    const h = makeScene({ difficulty: 'hard', stageId: 'stage6', shadowRaySpawned: true });
    const shadow = new ShadowRayBoss(scene(h) as never, 0, 0) as unknown;

    callHandleClear(h.scene, shadow);

    expect(h.spawnHardSecretBoss).not.toHaveBeenCalled();
    expect(h.finishStageClear).toHaveBeenCalledTimes(1);
  });

  // 回帰の核心: ECLIPSE 撃破演出(afterglow→death→spawn)は非同期に進む。その進行中に
  // handleClear が再度呼ばれても、通常クリア(finishStageClear=クリア画面遷移)へ落ちて
  // 裏ボスの spawn を横取りしてはいけない。裏ボス分岐が再入ガードを持たないと、
  // 2 回目の handleClear で shadowRaySpawned が既に true のため通常クリアへ流れてしまう。
  it('撃破演出の進行中に handleClear が再入しても、通常クリアへ落ちず裏ボス spawn を守る', () => {
    // afterglow の onComplete を即時実行せず保留し、演出中(spawn 未到達)の状態を作る。
    const h = makeScene({ difficulty: 'hard', stageId: 'stage6' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = h.scene as any;
    let pendingAfterglow: (() => void) | undefined;
    h.effects.bossAfterglow.mockImplementation(
      (_x: number, _y: number, _c: number, onComplete: () => void) => {
        pendingAfterglow = onComplete;
      },
    );
    // spawnHardSecretBoss は本番同様、裏ボス実体化時に再入ガード(inPostBoss)を解除する。
    h.spawnHardSecretBoss.mockImplementation(() => {
      s.inPostBoss = false;
      s.shadowRayActive = true;
    });

    const core = new CoreBoss(scene(h) as never, 0, 0) as unknown;

    // 1 回目: 裏ボス分岐に入り、演出開始(afterglow 保留中)。
    callHandleClear(h.scene, core);
    expect(h.effects.bossAfterglow).toHaveBeenCalledTimes(1);
    expect(pendingAfterglow).toBeTypeOf('function');

    // 2 回目: 演出中に再入。通常クリアへ落ちてはいけない。
    callHandleClear(h.scene, core);
    expect(h.finishStageClear).not.toHaveBeenCalled();
    expect(s.ended).not.toBe(true);

    // 演出完了 → 裏ボス spawn に到達する。
    pendingAfterglow!();
    expect(h.spawnHardSecretBoss).toHaveBeenCalledTimes(1);
    expect(h.finishStageClear).not.toHaveBeenCalled();
  });
});

// new XxxBoss(scene, x, y) の第1引数用のダミー(entity はモック化済みなので中身は不問)。
function scene(_h: Harness): object {
  return {};
}
