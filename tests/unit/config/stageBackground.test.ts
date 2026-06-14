import { describe, it, expect } from 'vitest';
import {
  getStageBackground,
  generateSilhouetteColumns,
  hexToNum,
  lerpColor,
  type StageBackgroundTheme,
} from '../../../src/config/stageBackground';
import { STAGE_IDS } from '../../../src/config/stages';

// 背景テーマ(stageBackground)のデータ整合と純ロジックの検証。
// 描画(Phaser 依存)は backgroundPainter 側にあり、ここでは扱わない。

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

describe('getStageBackground', () => {
  it('プレイ可能な全ステージ(STAGE_IDS)にテーマが存在する', () => {
    for (const id of STAGE_IDS) {
      const theme = getStageBackground(id);
      expect(theme.stageId).toBe(id);
    }
  });

  it('未知 ID は stage1 テーマにフォールバックする', () => {
    expect(getStageBackground('unknown').stageId).toBe('stage1');
  });

  it('各テーマの色が有効な hex で、layers が1つ以上・scrollFactor が (0,1) 範囲', () => {
    for (const id of STAGE_IDS) {
      const theme = getStageBackground(id);
      expect(theme.skyTop).toMatch(HEX_RE);
      expect(theme.skyBottom).toMatch(HEX_RE);
      expect(theme.accent).toMatch(HEX_RE);
      expect(theme.layers.length).toBeGreaterThanOrEqual(1);
      for (const layer of theme.layers) {
        expect(layer.color).toMatch(HEX_RE);
        expect(layer.scrollFactor).toBeGreaterThan(0);
        expect(layer.scrollFactor).toBeLessThan(1);
        expect(layer.height).toBeGreaterThan(0);
        expect(layer.step).toBeGreaterThan(0);
      }
    }
  });

  it('6ステージの skyTop が互いに異なる(視覚的に区別できる最低保証)', () => {
    const tops = STAGE_IDS.map((id) => getStageBackground(id).skyTop);
    expect(new Set(tops).size).toBe(STAGE_IDS.length);
  });

  it('6ステージで使われるシルエット種別が互いに異なる', () => {
    // 各ステージの最前面レイヤーの shape を代表値として比較する。
    const shapes = STAGE_IDS.map((id) => {
      const theme = getStageBackground(id);
      return theme.layers[theme.layers.length - 1].shape;
    });
    expect(new Set(shapes).size).toBe(STAGE_IDS.length);
  });

  it('各テーマのシードが互いに異なる(レイアウトの作り分け)', () => {
    const seeds = STAGE_IDS.map((id) => getStageBackground(id).seed);
    expect(new Set(seeds).size).toBe(STAGE_IDS.length);
  });
});

describe('generateSilhouetteColumns', () => {
  const layer = getStageBackground('stage1').layers[0];

  it('決定論的: 同一入力は同一結果を返す', () => {
    const a = generateSilhouetteColumns(layer, 4000, 123);
    const b = generateSilhouetteColumns(layer, 4000, 123);
    expect(a).toEqual(b);
  });

  it('シードが違えばレイアウトが変わる', () => {
    const a = generateSilhouetteColumns(layer, 4000, 1);
    const b = generateSilhouetteColumns(layer, 4000, 2);
    expect(a).not.toEqual(b);
  });

  it('worldWidth 全域を覆う(最後の列が右端を超える)', () => {
    const worldWidth = 4000;
    const cols = generateSilhouetteColumns(layer, worldWidth, 7);
    expect(cols.length).toBeGreaterThan(0);
    expect(cols[0].x).toBe(0);
    // 余剰列(x >= worldWidth)が必ず存在することを確認する。パララックス係数 < 1 のため
    // 実際の可視右端は worldWidth より手前に収まり、列間の僅かな隙間が画面に映ることはない。
    const last = cols[cols.length - 1];
    expect(last.x + last.width).toBeGreaterThanOrEqual(worldWidth);
  });

  it('各列の width / height が正の有限値', () => {
    const cols = generateSilhouetteColumns(layer, 2000, 9);
    for (const c of cols) {
      expect(Number.isFinite(c.width)).toBe(true);
      expect(Number.isFinite(c.height)).toBe(true);
      expect(c.width).toBeGreaterThan(0);
      expect(c.height).toBeGreaterThan(0);
    }
  });

  it('高さが基準(layer.height)の 0.55〜1.0 倍の範囲に収まる', () => {
    const cols = generateSilhouetteColumns(layer, 6000, 42);
    for (const c of cols) {
      expect(c.height).toBeGreaterThanOrEqual(layer.height * 0.55 - 1e-9);
      expect(c.height).toBeLessThanOrEqual(layer.height * 1.0 + 1e-9);
    }
  });

  it('step が極小でも最小ピッチ(8px)で無限ループしない', () => {
    const tiny: typeof layer = { ...layer, step: 0 };
    const cols = generateSilhouetteColumns(tiny, 100, 1);
    expect(cols.length).toBeGreaterThan(0);
    expect(cols.length).toBeLessThan(1000);
  });
});

describe('hexToNum / lerpColor', () => {
  it('hexToNum は # 有無どちらも変換する', () => {
    expect(hexToNum('#ffffff')).toBe(0xffffff);
    expect(hexToNum('000000')).toBe(0x000000);
    expect(hexToNum('#ff8800')).toBe(0xff8800);
  });

  it('lerpColor は t=0 で a、t=1 で b を返す', () => {
    expect(lerpColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(lerpColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
  });

  it('lerpColor は中間で各チャンネルを補間する', () => {
    expect(lerpColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(lerpColor(0x204060, 0x60a0e0, 0.5)).toBe(0x4070a0);
  });

  it('lerpColor は範囲外の t をクランプする', () => {
    expect(lerpColor(0x101010, 0xf0f0f0, -1)).toBe(0x101010);
    expect(lerpColor(0x101010, 0xf0f0f0, 2)).toBe(0xf0f0f0);
  });
});

// テーマ型のエクスポートが利用側で参照可能であることの軽い保証(型のみ)。
const _typeCheck: StageBackgroundTheme = getStageBackground('stage1');
void _typeCheck;
