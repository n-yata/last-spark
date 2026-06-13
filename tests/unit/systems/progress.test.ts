import { describe, it, expect } from 'vitest';
import { isAllStagesCleared } from '../../../src/systems/progress';
import { STAGE_IDS } from '../../../src/config/stage1';

// 全クリア判定の純粋ロジック検証。タイトルの「ALL CLEAR」表示はこの判定に依存するため、
// 「必要なステージが揃ったときだけ true」をデータ起点で守る。

describe('isAllStagesCleared', () => {
  it('全ステージが揃えば true', () => {
    expect(isAllStagesCleared([...STAGE_IDS], STAGE_IDS)).toBe(true);
  });

  it('1つでも欠けると false', () => {
    const missingLast = STAGE_IDS.slice(0, -1);
    expect(isAllStagesCleared(missingLast, STAGE_IDS)).toBe(false);
  });

  it('順不同・余分なクリア記録があっても、必要なステージが揃えば true', () => {
    const shuffledWithExtra = ['stageX', ...[...STAGE_IDS].reverse(), 'stageY'];
    expect(isAllStagesCleared(shuffledWithExtra, STAGE_IDS)).toBe(true);
  });

  it('クリアが空なら false', () => {
    expect(isAllStagesCleared([], STAGE_IDS)).toBe(false);
  });

  it('未クリアの単独ステージ(例: 開発モードで stage6 のみ)は全クリアではない', () => {
    expect(isAllStagesCleared(['stage6'], STAGE_IDS)).toBe(false);
  });

  it('全ステージ集合が空なら false(ステージ未定義を全クリア扱いしない)', () => {
    expect(isAllStagesCleared(['stage1'], [])).toBe(false);
  });
});
