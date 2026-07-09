import { EventEmitter } from 'events';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PLAYER } from '../../../src/config/balance';
import type { InputState } from '../../../src/types/input';

const phaserMocks = vi.hoisted(() => {
  interface MockBody {
    x: number;
    y: number;
    width: number;
    height: number;
    bottom: number;
    velocity: { x: number; y: number };
    blocked: { down: boolean };
    touching: { down: boolean };
    setSize: ReturnType<typeof vi.fn>;
    setCollideWorldBounds: ReturnType<typeof vi.fn>;
    setAllowGravity: ReturnType<typeof vi.fn>;
  }

  interface MockSceneLike {
    add: { existing: (obj: unknown) => void };
    physics: { add: { existing: (obj: unknown) => void } };
  }

  class MockSprite {
    scene: MockSceneLike;
    x: number;
    y: number;
    body: MockBody;

    constructor(scene: MockSceneLike, x: number, y: number) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.body = {
        x,
        y,
        width: PLAYER.width,
        height: PLAYER.height,
        bottom: y + PLAYER.height / 2,
        velocity: { x: 0, y: 0 },
        blocked: { down: false },
        touching: { down: false },
        setSize: vi.fn((width: number, height: number) => {
          this.body.width = width;
          this.body.height = height;
          this.body.bottom = this.body.y + height;
        }),
        setCollideWorldBounds: vi.fn(),
        setAllowGravity: vi.fn(),
      };
    }

    setDepth() {
      return this;
    }

    setVisible() {
      return this;
    }

    setVelocityX(value: number) {
      this.body.velocity.x = value;
      return this;
    }

    setVelocityY(value: number) {
      this.body.velocity.y = value;
      return this;
    }

    setVelocity(x: number, y: number) {
      this.body.velocity.x = x;
      this.body.velocity.y = y;
      return this;
    }

    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      this.body.x = x;
      this.body.y = y;
      this.body.bottom = y + this.body.height;
      return this;
    }
  }

  return {
    MockSprite,
    playSe: vi.fn(),
    vibrateHit: vi.fn(),
  };
});

vi.mock('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Sprite: phaserMocks.MockSprite,
      },
    },
    GameObjects: {
      Rectangle: class MockRectangle {},
    },
  },
}));

vi.mock('../../../src/entities/Beam', () => ({
  Beam: class MockBeam {},
}));

vi.mock('../../../src/entities/Projectile', () => ({
  Projectile: class MockProjectile {},
}));

vi.mock('../../../src/entities/CharacterRig', () => ({
  CharacterRig: class MockCharacterRig {
    syncTo = vi.fn();
    setMotionState = vi.fn();
    update = vi.fn();
    triggerAttack = vi.fn();
    triggerHit = vi.fn();
    setAlpha = vi.fn();
    setTint = vi.fn();
    destroy = vi.fn();
  },
}));

vi.mock('../../../src/systems/SoundManager', () => ({
  getSound: () => ({ playSe: phaserMocks.playSe }),
}));

vi.mock('../../../src/systems/haptics', () => ({
  getHaptics: () => ({ vibrateHit: phaserMocks.vibrateHit }),
}));

import { Player } from '../../../src/entities/Player';

const idleInput: InputState = {
  moveDir: 0,
  climbDir: 0,
  jumpPressed: false,
  jumpHeld: false,
  shootPressed: false,
  shootHeld: false,
  shootReleased: false,
  shootCancel: false,
};

function makeScene() {
  return {
    add: { existing: vi.fn() },
    physics: { add: { existing: vi.fn() } },
    events: new EventEmitter(),
    game: { loop: { delta: 16 } },
    time: { now: 0 },
  };
}

describe('Player landing event', () => {
  beforeEach(() => {
    phaserMocks.playSe.mockReset();
    phaserMocks.vibrateHit.mockReset();
  });

  it('十分な落下速度で着地したとき player-landed を発火する', () => {
    const scene = makeScene();
    const player = new Player(scene as never, 96, 120);
    const body = player.body as {
      blocked: { down: boolean };
      touching: { down: boolean };
      velocity: { y: number };
      bottom: number;
    };
    const landed = vi.fn();
    scene.events.on('player-landed', landed);

    body.blocked.down = false;
    body.touching.down = false;
    body.velocity.y = PLAYER.hardLandingMinSpeed + 40;
    player.applyInput(idleInput, 0);

    body.blocked.down = true;
    body.velocity.y = 0;
    body.bottom = 222;
    player.applyInput(idleInput, 16);

    expect(landed).toHaveBeenCalledTimes(1);
    expect(landed).toHaveBeenCalledWith(player.x, 222, PLAYER.hardLandingMinSpeed + 40, true);
  });

  it('閾値未満の着地では player-landed を発火しない', () => {
    const scene = makeScene();
    const player = new Player(scene as never, 96, 120);
    const body = player.body as {
      blocked: { down: boolean };
      touching: { down: boolean };
      velocity: { y: number };
      bottom: number;
    };
    const landed = vi.fn();
    scene.events.on('player-landed', landed);

    body.blocked.down = false;
    body.touching.down = false;
    body.velocity.y = PLAYER.landingEffectMinSpeed - 1;
    player.applyInput(idleInput, 0);

    body.blocked.down = true;
    body.velocity.y = 0;
    body.bottom = 210;
    player.applyInput(idleInput, 16);

    expect(landed).not.toHaveBeenCalled();
  });
});
