import { describe, it, expect } from 'vitest';
import { getStageData } from '../../../src/config/stage1';
import { PLAYABLE_STAGES } from '../../../src/stageSelect/stages';

// タイトルのステージ選択が参照する PLAYABLE_STAGES の整合性を検証する。
// このリストが実際に起動可能なステージと食い違うと、選択しても stage1 に
// フォールバックして「選んだのに最初から始まる」不具合になるため、データ起点で守る。

describe('PLAYABLE_STAGES', () => {
  it('少なくとも1ステージは選択肢として存在する', () => {
    expect(PLAYABLE_STAGES.length).toBeGreaterThan(0);
  });

  it('各エントリは実在するステージを指す(getStageData が同一 id を返す)', () => {
    for (const stage of PLAYABLE_STAGES) {
      // 未登録 id は getStageData が stage1 にフォールバックするため、
      // 返却データの id が要求 id と一致することで「実在」を保証する。
      expect(getStageData(stage.id).id).toBe(stage.id);
    }
  });

  it('id に重複がない', () => {
    const ids = PLAYABLE_STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('各エントリは表示用ラベルを持つ(空でない)', () => {
    for (const stage of PLAYABLE_STAGES) {
      expect(stage.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('先頭は stage1(タイトルの通常開始と同じ起点)である', () => {
    expect(PLAYABLE_STAGES[0]?.id).toBe('stage1');
  });
});
