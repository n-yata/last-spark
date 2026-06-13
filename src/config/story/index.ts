import type { StageStory } from '../../types/story';
import { STAGE1_STORY } from './stage1';
import { STAGE2_STORY } from './stage2';
import { STAGE3_STORY } from './stage3';
import { STAGE4_STORY } from './stage4';
import { STAGE5_STORY } from './stage5';
import { STAGE6_STORY } from './stage6';

// ステージID → 確定テキスト(StageStory)の引き当て。
// 全6ステージ登録済み。新ステージはここに追加するだけで StoryDirector から参照できる。

const STAGE_STORIES: Record<string, StageStory> = {
  stage1: STAGE1_STORY,
  stage2: STAGE2_STORY,
  stage3: STAGE3_STORY,
  stage4: STAGE4_STORY,
  stage5: STAGE5_STORY,
  stage6: STAGE6_STORY,
};

/** stageId に対応するストーリーテキストを返す。未登録なら undefined。 */
export function getStageStory(stageId: string): StageStory | undefined {
  return STAGE_STORIES[stageId];
}
