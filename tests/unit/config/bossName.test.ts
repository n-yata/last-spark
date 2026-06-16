import { describe, it, expect } from 'vitest';
import { getStageData, STAGE_IDS } from '../../../src/config/stages';

// 各ステージのボス固有名を固定する。HP バーのラベルにステージごとの名前を出すための正本。
// 命名方針(docs/story.md ボス設定): 光(RAY)に対する「影・日食・不吉」モチーフのコードネーム。
// 名前を変える場合はこの期待値と story.md を同時に更新する(表示と設定の二重管理を防ぐ)。

const EXPECTED_BOSS_NAMES: Record<string, string> = {
  stage1: 'ウンブラ', // 守護機械(接地型) = 本影
  stage2: 'コロナ', // 哨戒機(飛行型) = 光冠
  stage3: 'ヴェイル', // 収容番人(重装型) = 帳
  stage4: 'ミアズマ', // 環境管理機(浄化型) = 瘴気
  stage5: 'ヘラルド', // 使者(高速型) = 伝令
  stage6: 'ECLIPSE', // 管理AI本体(ラスボス) = 影の核そのもの
};

describe('ボス固有名(stages.bossName)', () => {
  it('各ステージが期待どおりの固有名を持つ', () => {
    for (const [stageId, name] of Object.entries(EXPECTED_BOSS_NAMES)) {
      expect(getStageData(stageId).bossName).toBe(name);
    }
  });

  it('全ステージのボス名が空でない(命名忘れを防ぐ)', () => {
    for (const id of STAGE_IDS) {
      expect(getStageData(id).bossName.trim().length).toBeGreaterThan(0);
    }
  });

  it('ボス名は全ステージで重複しない(各ボスが固有名を持つ)', () => {
    const names = STAGE_IDS.map((id) => getStageData(id).bossName);
    expect(new Set(names).size).toBe(names.length);
  });
});
