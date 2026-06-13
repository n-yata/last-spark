import type { StageStory } from '../../types/story';
import { STAGE1_STORY } from './stage1';
import { STAGE2_STORY } from './stage2';

// ステージID → 確定テキスト(StageStory)の引き当て。
// 将来ステージ(stage3〜)はここに追加するだけで StoryDirector から参照できる。

const STAGE_STORIES: Record<string, StageStory> = {
  stage1: STAGE1_STORY,
  stage2: STAGE2_STORY,
};

/** stageId に対応するストーリーテキストを返す。未登録なら undefined。 */
export function getStageStory(stageId: string): StageStory | undefined {
  return STAGE_STORIES[stageId];
}
