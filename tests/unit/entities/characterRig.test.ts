import { describe, it, expect, vi } from 'vitest';

// Phaser は Canvas/WebGL 前提で jsdom では直接動かせないため、CharacterRig が使う
// scene.add.image / scene.add.container の最小スタブに差し替える。
// 関心は「setTint で設定した基準色が、被弾フラッシュの立ち下がりでも保持されるか」の
// 回帰検証のみなので、パーツの見た目(座標・回転)は検証対象にしない。

interface MockImage {
  setOrigin: ReturnType<typeof vi.fn>;
  setPosition: ReturnType<typeof vi.fn>;
  setRotation: ReturnType<typeof vi.fn>;
  setTint: ReturnType<typeof vi.fn>;
  setTintFill: ReturnType<typeof vi.fn>;
  clearTint: ReturnType<typeof vi.fn>;
}

function makeMockImage(): MockImage {
  const image: MockImage = {
    setOrigin: vi.fn(() => image),
    setPosition: vi.fn(() => image),
    setRotation: vi.fn(() => image),
    setTint: vi.fn(() => image),
    setTintFill: vi.fn(() => image),
    clearTint: vi.fn(() => image),
  };
  return image;
}

function makeMockScene(images: MockImage[]) {
  return {
    add: {
      image: vi.fn(() => {
        const img = makeMockImage();
        images.push(img);
        return img;
      }),
      container: vi.fn(() => ({
        setPosition: vi.fn(),
        setVisible: vi.fn(),
        setScale: vi.fn(),
        setRotation: vi.fn(),
        setAlpha: vi.fn(),
        setDepth: vi.fn(),
        destroy: vi.fn(),
      })),
    },
  };
}

vi.mock('phaser', () => ({ default: {} }));

import { CharacterRig } from '../../../src/entities/CharacterRig';

describe('CharacterRig baseTint', () => {
  it('setTint で付けた基準色は、被弾フラッシュの立ち下がりでも維持される(clearTint されない)', () => {
    const images: MockImage[] = [];
    const scene = makeMockScene(images);
    const rig = new CharacterRig(scene as never, 'player', 10);

    // 周回報酬などで恒常的な配色(基準ティント)を適用する。
    rig.setTint(0xff9a6c);
    for (const img of images) {
      expect(img.setTint).toHaveBeenCalledWith(0xff9a6c);
    }

    // 被弾: フラッシュ開始 → 経過時間0msでフラッシュ中の setTintFill を経由。
    rig.triggerHit(0);
    rig.update(0, 0);
    for (const img of images) {
      expect(img.setTintFill).toHaveBeenCalled();
    }

    // フラッシュ時間(90ms)経過後: clearTint() ではなく setTint(baseTint) で復帰すること。
    rig.update(200, 0);
    for (const img of images) {
      expect(img.clearTint).not.toHaveBeenCalled();
      // 直近の setTint 呼び出しが基準色であること(初回の setTint(0xff9a6c) 呼び出し後、
      // フラッシュ立ち下がりで再度同じ色が呼ばれる)。
      const calls = img.setTint.mock.calls.map((c) => c[0]);
      expect(calls[calls.length - 1]).toBe(0xff9a6c);
    }
  });

  it('clearTint() を呼ぶと基準色が無着色(0xffffff)に戻り、以後のフラッシュ復帰も無着色になる', () => {
    const images: MockImage[] = [];
    const scene = makeMockScene(images);
    const rig = new CharacterRig(scene as never, 'player', 10);

    rig.setTint(0x9a7cff);
    rig.clearTint();
    for (const img of images) {
      expect(img.clearTint).toHaveBeenCalled();
    }

    rig.triggerHit(0);
    rig.update(0, 0);
    rig.update(200, 0);
    for (const img of images) {
      const calls = img.setTint.mock.calls.map((c) => c[0]);
      expect(calls[calls.length - 1]).toBe(0xffffff);
    }
  });
});
