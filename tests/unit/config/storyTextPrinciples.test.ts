import { describe, it, expect } from 'vitest';
import { getStageStory } from '../../../src/config/story';
import { getCutscene } from '../../../src/config/story/cutscenes';

// ③確定テキストの「書き方の原則」を横断的に守る回帰テスト。
// 特に「敵名（ECLIPSE）を物語テキストに出さない」を全ステージ・全カットシーンで保証する。

const STAGE_IDS = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6'];
const CUTSCENE_KEYS = ['stage1-intro', 'stage3-rescue', 'stage4-intro', 'stage5-intro', 'stage6-ending'];

/** 全ステージの確定テキスト（intro / eclipseVoice / inner の各本文）を集める。 */
function allStageTexts(): string[] {
  const out: string[] = [];
  for (const id of STAGE_IDS) {
    const s = getStageStory(id);
    if (!s) continue;
    out.push(s.intro, s.eclipseVoice, ...Object.values(s.inner));
  }
  return out;
}

/** 全カットシーンの各行テキストを集める。 */
function allCutsceneTexts(): string[] {
  const out: string[] = [];
  for (const key of CUTSCENE_KEYS) {
    const cs = getCutscene(key);
    if (!cs) continue;
    out.push(...cs.lines.map((l) => l.text));
  }
  return out;
}

describe('確定テキストの原則ガード', () => {
  it('物語テキスト（ステージ）に敵名 ECLIPSE が出てこない', () => {
    for (const text of allStageTexts()) {
      expect(text).not.toContain('ECLIPSE');
    }
  });

  it('物語テキスト（カットシーン）に敵名 ECLIPSE が出てこない', () => {
    for (const text of allCutsceneTexts()) {
      expect(text).not.toContain('ECLIPSE');
    }
  });

  it('RAYの一人称が「私」で確定している（旧「おれ」を使わない）', () => {
    // inner はRAYの内心。旧版の一人称「おれ」が残っていないことを保証する。
    for (const id of STAGE_IDS) {
      const s = getStageStory(id);
      if (!s) continue;
      for (const inner of Object.values(s.inner)) {
        expect(inner).not.toContain('おれ');
      }
    }
  });
});
