import { describe, it, expect } from 'vitest';
import {
  isStageUnlocked,
  formatBestTime,
  cardGridLayout,
  buildStageCardModels,
  type CardGridOptions,
} from '../../../src/stageSelect/stageCards';
import { STAGE_IDS } from '../../../src/config/stages';

describe('isStageUnlocked(段階解放 + 周回互換)', () => {
  it('初回起動(進捗なし)は stage1 のみ解放', () => {
    expect(isStageUnlocked(0, [], undefined)).toBe(true);
    for (let i = 1; i < STAGE_IDS.length; i++) {
      expect(isStageUnlocked(i, [], undefined)).toBe(false);
    }
  });

  it('直前ステージを今周回でクリアしていれば解放', () => {
    expect(isStageUnlocked(1, ['stage1'], undefined)).toBe(true);
    expect(isStageUnlocked(2, ['stage1'], undefined)).toBe(false); // stage2 未クリア
    expect(isStageUnlocked(2, ['stage1', 'stage2'], undefined)).toBe(true);
  });

  it('周回リセット後(clearedStages 空)でも bestTimeMs があれば解放を維持する', () => {
    const bestTimes = { stage1: 60_000, stage2: 90_000, stage3: 120_000 };
    // 過去に stage3 までクリア → stage4(index 3)まで解放されたまま
    expect(isStageUnlocked(1, [], bestTimes)).toBe(true);
    expect(isStageUnlocked(2, [], bestTimes)).toBe(true);
    expect(isStageUnlocked(3, [], bestTimes)).toBe(true);
    // stage4 の記録は無いので stage5(index 4)はロック
    expect(isStageUnlocked(4, [], bestTimes)).toBe(false);
  });

  it('最終ステージも直前クリアで解放される(境界)', () => {
    const last = STAGE_IDS.length - 1;
    const allButLast = STAGE_IDS.slice(0, -1);
    expect(isStageUnlocked(last, allButLast, undefined)).toBe(true);
  });
});

describe('formatBestTime(m:ss 形式・既存 TitleScene/ClearScene と同一)', () => {
  it('0ms は 0:00', () => {
    expect(formatBestTime(0)).toBe('0:00');
  });
  it('秒未満は切り捨てて 0:00', () => {
    expect(formatBestTime(999)).toBe('0:00');
  });
  it('分:秒に整形し、秒は2桁ゼロ埋め', () => {
    expect(formatBestTime(61_000)).toBe('1:01');
    expect(formatBestTime(65_500)).toBe('1:05');
    expect(formatBestTime(600_000)).toBe('10:00');
  });
  it('境界: 59秒→0:59、60秒→1:00', () => {
    expect(formatBestTime(59_999)).toBe('0:59');
    expect(formatBestTime(60_000)).toBe('1:00');
  });
  it('負値・非有限値は 0:00 に丸める(表示防御)', () => {
    expect(formatBestTime(-100)).toBe('0:00');
    expect(formatBestTime(Number.NaN)).toBe('0:00');
    expect(formatBestTime(Number.POSITIVE_INFINITY)).toBe('0:00');
  });
});

describe('cardGridLayout(3列グリッド配置)', () => {
  const opts: CardGridOptions = { top: 100, bottom: 460, marginX: 40, gutter: 12 };

  it('6枚が3列2行に配置される', () => {
    const rects = cardGridLayout(960, 6, opts);
    expect(rects).toHaveLength(6);
    // 1行目の y は全て top、2行目は同一の y
    expect(rects[0].y).toBe(100);
    expect(rects[1].y).toBe(100);
    expect(rects[2].y).toBe(100);
    expect(rects[3].y).toBe(rects[4].y);
    expect(rects[3].y).toBeGreaterThan(rects[0].y);
    // 列 x は行内で単調増加
    expect(rects[1].x).toBeGreaterThan(rects[0].x);
    expect(rects[2].x).toBeGreaterThan(rects[1].x);
  });

  it('領域(左右マージン・top/bottom)からはみ出さない', () => {
    const width = 960;
    const rects = cardGridLayout(width, 6, opts);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(opts.marginX);
      expect(r.x + r.width).toBeLessThanOrEqual(width - opts.marginX + 0.001);
      expect(r.y).toBeGreaterThanOrEqual(opts.top);
      expect(r.y + r.height).toBeLessThanOrEqual(opts.bottom + 0.001);
    }
  });

  it('カード同士が重ならない(ガター分の隙間がある)', () => {
    const rects = cardGridLayout(960, 6, opts);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });

  it('モバイル相当の狭い画面でも正の寸法で収まる', () => {
    const narrow: CardGridOptions = { top: 60, bottom: 300, marginX: 24, gutter: 8 };
    const rects = cardGridLayout(667, 6, narrow);
    for (const r of rects) {
      expect(r.width).toBeGreaterThan(0);
      expect(r.height).toBeGreaterThan(0);
    }
  });
});

describe('buildStageCardModels(SaveData → 表示モデル)', () => {
  it('初回起動: 全ステージのモデルが構築され、stage1 のみ解放・進捗表示なし', () => {
    const models = buildStageCardModels({ clearedStages: [], bestTimeMs: undefined });
    expect(models).toHaveLength(STAGE_IDS.length);
    expect(models[0]).toMatchObject({ id: 'stage1', stageNo: 1, name: '崩れた都市', locked: false, cleared: false });
    expect(models[0].bestTimeMs).toBeUndefined();
    expect(models.slice(1).every((m) => m.locked)).toBe(true);
  });

  it('進行状態: cleared / bestTimeMs / 次ステージ解放が反映される', () => {
    const models = buildStageCardModels({
      clearedStages: ['stage1', 'stage2'],
      bestTimeMs: { stage1: 61_000, stage2: 95_000 },
    });
    expect(models[0]).toMatchObject({ cleared: true, bestTimeMs: 61_000, locked: false });
    expect(models[1]).toMatchObject({ cleared: true, bestTimeMs: 95_000, locked: false });
    expect(models[2]).toMatchObject({ id: 'stage3', cleared: false, locked: false }); // stage2 クリアで解放
    expect(models[3].locked).toBe(true);
  });

  it('周回状態: clearedStages 空でも bestTimeMs で解放・CLEAR バッジは消える', () => {
    const models = buildStageCardModels({
      clearedStages: [],
      bestTimeMs: { stage1: 61_000, stage2: 95_000 },
    });
    expect(models[0].cleared).toBe(false); // 今周回は未クリア
    expect(models[0].bestTimeMs).toBe(61_000); // 記録は残る
    expect(models[1].locked).toBe(false);
    expect(models[2].locked).toBe(false); // stage2 の過去記録で解放
    expect(models[3].locked).toBe(true);
  });
});
