// GameScene → UIScene(StoryOverlay)へ表示要求を渡すためのイベント名。
// HUD 状態は registry 経由で毎フレーム共有するが、テキスト表示は離散的なので
// game レベルのイベントエミッタで一回ずつ送る(Scene 間の直接参照を避ける)。

export const STORY_EVENT = {
  /** payload: TextRequest[] を表示キューへ積む。 */
  show: 'story.show',
} as const;
