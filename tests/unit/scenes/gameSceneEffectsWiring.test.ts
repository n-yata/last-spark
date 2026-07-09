import { EventEmitter } from 'events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type CombatCallbacks = {
  onHit: (x: number, y: number, target: 'enemy' | 'boss') => void;
  onPlayerDamaged: () => void;
};

type EffectInstance = {
  impactSpark: ReturnType<typeof vi.fn>;
  enemyKilled: ReturnType<typeof vi.fn>;
  playerDamaged: ReturnType<typeof vi.fn>;
  absorbSpark: ReturnType<typeof vi.fn>;
  muzzleFlash: ReturnType<typeof vi.fn>;
  beamFire: ReturnType<typeof vi.fn>;
  landingDust: ReturnType<typeof vi.fn>;
};

const mocks = vi.hoisted(() => ({
  attachTouchZones: vi.fn(),
  registerColliders: vi.fn(),
  spawnLoadStage: vi.fn(),
  spawnOnBossTrigger: vi.fn(),
  playSe: vi.fn(),
  combatCallbacks: undefined as CombatCallbacks | undefined,
  effectInstances: [] as EffectInstance[],
}));

vi.mock('phaser', () => ({
  default: {
    Scenes: {
      Events: {
        SHUTDOWN: 'shutdown',
      },
    },
    Scene: class MockScene {},
  },
}));

vi.mock('../../../src/systems/InputController', () => ({
  InputController: class MockInputController {
    attachTouchZones = mocks.attachTouchZones;
  },
}));

vi.mock('../../../src/systems/EffectsManager', () => ({
  EffectsManager: class MockEffectsManager {
    impactSpark = vi.fn();
    enemyKilled = vi.fn();
    playerDamaged = vi.fn();
    absorbSpark = vi.fn();
    muzzleFlash = vi.fn();
    beamFire = vi.fn();
    landingDust = vi.fn();

    constructor() {
      mocks.effectInstances.push(this);
    }
  },
}));

vi.mock('../../../src/systems/CombatSystem', () => ({
  CombatSystem: class MockCombatSystem {
    registerColliders = mocks.registerColliders;

    constructor(_scene: unknown, callbacks: CombatCallbacks) {
      mocks.combatCallbacks = callbacks;
    }
  },
}));

vi.mock('../../../src/systems/SpawnSystem', () => ({
  SpawnSystem: class MockSpawnSystem {
    loadStage = mocks.spawnLoadStage;
    onBossTrigger = mocks.spawnOnBossTrigger;
  },
}));

vi.mock('../../../src/systems/SoundManager', () => ({
  getSound: () => ({ playSe: mocks.playSe }),
}));

vi.mock('../../../src/entities/Player', () => ({ Player: class MockPlayer {} }));
vi.mock('../../../src/entities/Boss', () => ({ Boss: class MockBoss {} }));
vi.mock('../../../src/entities/FlyingBoss', () => ({ FlyingBoss: class MockFlyingBoss {} }));
vi.mock('../../../src/entities/EnvoyBoss', () => ({ EnvoyBoss: class MockEnvoyBoss {} }));
vi.mock('../../../src/entities/WardenBoss', () => ({ WardenBoss: class MockWardenBoss {} }));
vi.mock('../../../src/entities/PurifierBoss', () => ({ PurifierBoss: class MockPurifierBoss {} }));
vi.mock('../../../src/entities/CoreBoss', () => ({ CoreBoss: class MockCoreBoss {} }));
vi.mock('../../../src/entities/ShadowRayBoss', () => ({ ShadowRayBoss: class MockShadowRayBoss {} }));
vi.mock('../../../src/entities/Projectile', () => ({ Projectile: class MockProjectile {} }));
vi.mock('../../../src/entities/Hazard', () => ({ Hazard: class MockHazard {} }));

import { GameScene } from '../../../src/scenes/GameScene';

type SceneState = {
  events: EventEmitter;
  player: { x: number };
  enemies: object;
  playerShots: object;
  enemyShots: object;
  playerBeams: object;
  stageId: string;
  difficulty: 'normal';
  loopCount: number;
  kills: number;
  firstEnemyInnerDone: boolean;
  spawnHitEffect: ReturnType<typeof vi.fn>;
  emitStory: ReturnType<typeof vi.fn>;
  handleClear: ReturnType<typeof vi.fn>;
  handleGameOver: ReturnType<typeof vi.fn>;
};

function makeScene(): { scene: GameScene; state: SceneState } {
  const scene = Object.create(GameScene.prototype) as GameScene;
  const state = scene as unknown as SceneState;
  state.events = new EventEmitter();
  state.player = { x: 144 };
  state.enemies = {};
  state.playerShots = {};
  state.enemyShots = {};
  state.playerBeams = {};
  state.stageId = 'stage1';
  state.difficulty = 'normal';
  state.loopCount = 1;
  state.kills = 0;
  state.firstEnemyInnerDone = false;
  state.spawnHitEffect = vi.fn();
  state.emitStory = vi.fn();
  state.handleClear = vi.fn();
  state.handleGameOver = vi.fn();
  return { scene, state };
}

describe('GameScene effect wiring', () => {
  beforeEach(() => {
    mocks.attachTouchZones.mockReset();
    mocks.registerColliders.mockReset();
    mocks.spawnLoadStage.mockReset();
    mocks.spawnOnBossTrigger.mockReset();
    mocks.playSe.mockReset();
    mocks.effectInstances.length = 0;
    mocks.combatCallbacks = undefined;
  });

  it('forwards boss hit callbacks into the effect layer with the target intact', () => {
    const { scene, state } = makeScene();
    (scene as unknown as { createSystems: () => void }).createSystems();
    const effects = mocks.effectInstances[0];

    expect(mocks.combatCallbacks).toBeDefined();
    mocks.combatCallbacks?.onHit(32, 48, 'boss');

    expect(state.spawnHitEffect).toHaveBeenCalledWith(32, 48);
    expect(effects.impactSpark).toHaveBeenCalledWith(32, 48, 'boss');
    expect(mocks.playSe).toHaveBeenCalledWith('bossHit');
  });

  it('connects player-landed to landing dust and removes the listener on shutdown', () => {
    const { scene, state } = makeScene();
    (scene as unknown as { createSystems: () => void }).createSystems();
    const effects = mocks.effectInstances[0];

    state.events.emit('player-landed', 30, 220, 700, true);
    expect(effects.landingDust).toHaveBeenCalledWith(144, 220, true);

    state.events.emit('shutdown');
    state.events.emit('player-landed', 30, 240, 700, false);
    expect(effects.landingDust).toHaveBeenCalledTimes(1);
  });

  it('connects player damage callbacks to effect and sound feedback', () => {
    const { scene } = makeScene();
    (scene as unknown as { createSystems: () => void }).createSystems();
    const effects = mocks.effectInstances[0];

    expect(mocks.combatCallbacks).toBeDefined();
    mocks.combatCallbacks?.onPlayerDamaged();

    expect(effects.playerDamaged).toHaveBeenCalledTimes(1);
    expect(mocks.playSe).toHaveBeenCalledWith('playerDamaged');
  });
});
