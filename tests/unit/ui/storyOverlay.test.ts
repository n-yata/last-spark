import { describe, it, expect } from 'vitest';
import { StoryOverlay } from '../../../src/ui/StoryOverlay';
import type { TextRequest } from '../../../src/types/story';

// StoryOverlay の描画経路を、最小の Phaser モックで検証する。
// 「テキスト本体が表示状態(visible=true)になること」を保証し、
// パネルだけ出て文字が出ない不具合(text.setVisible 忘れ)の再発を防ぐ。

interface MockText {
  visible: boolean;
  text: string;
  alpha: number;
  width: number;
  height: number;
  setOrigin: () => MockText;
  setVisible: (v: boolean) => MockText;
  setStyle: () => MockText;
  setWordWrapWidth: () => MockText;
  setText: (t: string) => MockText;
  setAlpha: (a: number) => MockText;
  setPosition: () => MockText;
}

function makeText(): MockText {
  const o = {
    visible: false,
    text: '',
    alpha: 1,
    width: 120,
    height: 24,
    setOrigin: () => o,
    setVisible: (v: boolean) => {
      o.visible = v;
      return o;
    },
    setStyle: () => o,
    setWordWrapWidth: () => o,
    setText: (t: string) => {
      o.text = t;
      return o;
    },
    setAlpha: (a: number) => {
      o.alpha = a;
      return o;
    },
    setPosition: () => o,
  };
  return o;
}

function makeRect() {
  const o = {
    visible: false,
    setOrigin: () => o,
    setVisible: (v: boolean) => {
      o.visible = v;
      return o;
    },
    setSize: () => o,
  };
  return o;
}

function makeContainer() {
  const o = {
    visible: false,
    alpha: 0,
    setScrollFactor: () => o,
    setDepth: () => o,
    setAlpha: (a: number) => {
      o.alpha = a;
      return o;
    },
    setVisible: (v: boolean) => {
      o.visible = v;
      return o;
    },
    setPosition: () => o,
    destroy: () => {},
  };
  return o;
}

function makeScene() {
  const texts: MockText[] = [];
  const containers: ReturnType<typeof makeContainer>[] = [];
  const scene = {
    add: {
      rectangle: () => makeRect(),
      text: () => {
        const t = makeText();
        texts.push(t);
        return t;
      },
      container: () => {
        const c = makeContainer();
        containers.push(c);
        return c;
      },
    },
    tweens: {
      add: (cfg: { targets?: { alpha: number }; alpha?: number }) => {
        // フェードは即座に適用(onComplete は呼ばない=このテストでは dismiss を起こさない)。
        if (cfg.targets && typeof cfg.alpha === 'number') cfg.targets.alpha = cfg.alpha;
      },
    },
    time: { delayedCall: () => ({ remove: () => {} }) },
    input: { once: () => {}, off: () => {} },
    scale: { width: 960, height: 540 },
    scene: {
      isActive: () => true,
      isPaused: () => false,
      pause: () => {},
      resume: () => {},
    },
    game: { device: { input: { touch: false } } },
  };
  return { scene, texts, containers };
}

describe('StoryOverlay', () => {
  it('一時停止テキスト(開始テキスト)で本文が表示状態になる', () => {
    const { scene, texts, containers } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overlay = new StoryOverlay(scene as any);
    const req: TextRequest = { kind: 'stageIntro', text: 'はじまりの言葉', pauseGame: true };
    overlay.enqueue([req]);

    expect(texts[0].visible).toBe(true);
    expect(texts[0].text).toBe('はじまりの言葉');
    expect(containers[0].visible).toBe(true);
  });

  it('非停止テキスト(RAY内心)でも本文が表示状態になる', () => {
    const { scene, texts, containers } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overlay = new StoryOverlay(scene as any);
    overlay.enqueue([{ kind: 'rayInner', text: '……俺は、起きた', pauseGame: false }]);

    expect(texts[0].visible).toBe(true);
    expect(texts[0].text).toBe('……俺は、起きた');
    expect(containers[0].visible).toBe(true);
  });

  it('空配列の enqueue では何も表示しない', () => {
    const { scene, texts, containers } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overlay = new StoryOverlay(scene as any);
    overlay.enqueue([]);
    expect(texts[0].visible).toBe(false);
    expect(containers[0].visible).toBe(false);
  });
});
