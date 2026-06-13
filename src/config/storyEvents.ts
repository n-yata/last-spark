// GameScene → UIScene(StoryOverlay)へ表示要求を渡すための registry キー。
// テキスト表示は離散的だが、cross-scene イベントは UIScene の create タイミングに依存して
// 取りこぼす恐れがある(launch 直後はリスナー未登録)。HUD と同じく registry に積み、
// UIScene が毎フレーム drain することでタイミング非依存にする。

export const STORY = {
  /** 表示待ちの TextRequest[] を貯める配列。UIScene が drain して空にする。 */
  pending: 'story.pending',
} as const;
