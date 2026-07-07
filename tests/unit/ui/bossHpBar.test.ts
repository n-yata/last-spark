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

interface LineCall {
  width: number;
  color: number;
  alpha: number;
}

function makeGraphics() {
  const lineCalls: LineCall[] = [];
  const lineBetweenCalls: Array<[number, number, number, number]> = [];
  let pendingLine: LineCall | null = null;
  const o = {
    visible: false,
    lineCalls,
    lineBetweenCalls,
    setScrollFactor: () => o,
    setDepth: () => o,
    setVisible: (v: boolean) => {
      o.visible = v;
      return o;
    },
    clear: () => {
      lineCalls.length = 0;
      lineBetweenCalls.length = 0;
      return o;
    },
    fillStyle: () => o,
    fillRect: () => o,
    fillRoundedRect: () => o,
    lineStyle: (width: number, color: number, alpha: number) => {
      pendingLine = { width, color, alpha };
      return o;
    },
    strokeRect: () => o,
    lineBetween: (x1: number, y1: number, x2: number, y2: number) => {
      if (pendingLine) lineCalls.push(pendingLine);
      lineBetweenCalls.push([x1, y1, x2, y2]);
      return o;
    },
    destroy: () => {},
  };
  return o;
}

function makeScene() {
  const texts: MockText[] = [];
  const graphics = makeGraphics();
  const scene = {
    add: {
      graphics: () => graphics,
      text: () => {
        const t = makeText();
        texts.push(t);
        return t;
      },
    },
    time: { now: 1000 },
    scale: { width: 960, height: 540 },
  };
  return { scene, texts, graphics };
}

describe('BossHpBar の表示名', () => {
  it('show(name, phase2Ratio) で渡したボス固有名がラベルに反映される', () => {
    const { scene, texts } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new BossHpBar(scene as any);

    // 初期状態はラベル空・非表示(固有名のハードコードがない)。
    expect(texts[0].text).toBe('');
    expect(texts[0].visible).toBe(false);

    bar.show('ヴェイル', 0.5);
    expect(texts[0].text).toBe('ヴェイル');
    expect(texts[0].visible).toBe(true);
  });

  it('ステージごとに異なる名前へ差し替えられる(全ボス同名の不具合の再発防止)', () => {
    const { scene, texts } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new BossHpBar(scene as any);

    bar.show('ウンブラ', 0.5);
    expect(texts[0].text).toBe('ウンブラ');

    bar.show('ECLIPSE', 0.5);
    expect(texts[0].text).toBe('ECLIPSE');
  });

  it('hide でゲージとラベルが隠れる', () => {
    const { scene, texts } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new BossHpBar(scene as any);

    bar.show('コロナ', 0.5);
    expect(texts[0].visible).toBe(true);

    bar.hide();
    expect(texts[0].visible).toBe(false);
  });
});

describe('BossHpBar のフェーズ2目盛り', () => {
  // render() は目盛りの有無に関わらず、上端の装飾ライン(alpha 0.35)を必ず1本 lineBetween で描く。
  // 目盛りが描かれるとその手前にもう1本 lineBetween が増えるので、本数の差分で判定する。
  const DECORATIVE_LINE_COUNT = 1;

  it('phase2Ratio が 0 以下・1 以上・非有限なら目盛りを描かない', () => {
    for (const bad of [0, -0.1, 1, 1.5, NaN, Infinity]) {
      const { scene, graphics } = makeScene();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bar = new BossHpBar(scene as any);
      bar.show('テスト', bad);
      bar.render(50, 100, 2000); // 出現フィル演出を過ぎた時刻
      expect(graphics.lineBetweenCalls.length).toBe(DECORATIVE_LINE_COUNT);
    }
  });

  it('有効な phase2Ratio なら目盛りが追加で1本描かれる', () => {
    const { scene, graphics } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new BossHpBar(scene as any);
    bar.show('テスト', 0.5);
    bar.render(80, 100, 2000);
    expect(graphics.lineBetweenCalls.length).toBe(DECORATIVE_LINE_COUNT + 1);
  });

  it('フェーズ1中(actualRatio > phase2Ratio)は控えめな明度で描く', () => {
    const { scene, graphics } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new BossHpBar(scene as any);
    bar.show('テスト', 0.5);
    bar.render(80, 100, 2000); // actualRatio = 0.8 > 0.5
    const tickLine = graphics.lineCalls[0]; // 目盛りは装飾ラインより先に描かれる
    expect(tickLine.alpha).toBeCloseTo(0.55);
  });

  it('フェーズ2突入後(actualRatio <= phase2Ratio)は発光色で強調する', () => {
    const { scene, graphics } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = new BossHpBar(scene as any);
    bar.show('テスト', 0.5);
    bar.render(40, 100, 2000); // actualRatio = 0.4 <= 0.5
    const tickLine = graphics.lineCalls[0];
    expect(tickLine.alpha).toBeCloseTo(0.95);
    expect(tickLine.width).toBeGreaterThan(0);
  });
});
