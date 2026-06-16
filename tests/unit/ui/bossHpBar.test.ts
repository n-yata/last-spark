import { describe, it, expect } from 'vitest';
import { BossHpBar } from '../../../src/ui/BossHpBar';

// BossHpBar の表示名(ラベル)を最小の Phaser モックで検証する。
// 旧実装はラベルが 'まもりのきかい' にハードコードされ、全ボスが同名で出る不具合があった。
// show(name) で渡したボス固有名がラベルへ反映され、hide でゲージが隠れることを保証する。

interface MockText {
  text: string;
  visible: boolean;
  setOrigin: () => MockText;
  setScrollFactor: () => MockText;
  setDepth: () => MockText;
  setVisible: (v: boolean) => MockText;
  setText: (t: string) => MockText;
  setPosition: () => MockText;
  destroy: () => void;
}

function makeText(): MockText {
  const o: MockText = {
    text: '',
    visible: false,
    setOrigin: () => o,
    setScrollFactor: () => o,
    setDepth: () => o,
    setVisible: (v: boolean) => {
      o.visible = v;
      return o;
    },
    setText: (t: string) => {
      o.text = t;
      return o;
    },
    setPosition: () => o,
    destroy: () => {},
  };
  return o;
}

function makeGraphics() {
  const o = {
    visible: false,
    setScrollFactor: () => o,
    setDepth: () => o,
    setVisible: (v: boolean) => {
      o.visible = v;
      return o;
    },
    clear: () => o,
    fillStyle: () => o,
    fillRect: () => o,
    lineStyle: () => o,
    strokeRect: () => o,
    destroy: () => {},
  };
  return o;
}

function makeScene() {
  const texts: MockText[] = [];
  const scene = {
    add: {
      graphics: () => makeGraphics(),
      text: () => {
        const t = makeText();
        texts.push(t);
        return t;
      },
    },
    time: { now: 1000 },
    scale: { width: 960, height: 540 },
  };
  return { scene, texts };
}

describe('BossHpBar の表示名', () => {
  it('show(name) で渡したボス固有名がラベルに反映される', () => {
    const { scene, texts } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new BossHpBar(scene as any);

    // 初期状態はラベル空・非表示(固有名のハードコードがない)。
    expect(texts[0].text).toBe('');
    expect(texts[0].visible).toBe(false);

    bar.show('ヴェイル');
    expect(texts[0].text).toBe('ヴェイル');
    expect(texts[0].visible).toBe(true);
  });

  it('ステージごとに異なる名前へ差し替えられる(全ボス同名の不具合の再発防止)', () => {
    const { scene, texts } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new BossHpBar(scene as any);

    bar.show('ウンブラ');
    expect(texts[0].text).toBe('ウンブラ');

    bar.show('ECLIPSE');
    expect(texts[0].text).toBe('ECLIPSE');
  });

  it('hide でゲージとラベルが隠れる', () => {
    const { scene, texts } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new BossHpBar(scene as any);

    bar.show('コロナ');
    expect(texts[0].visible).toBe(true);

    bar.hide();
    expect(texts[0].visible).toBe(false);
  });
});
