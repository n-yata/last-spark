// シーンキー定数(文字列の重複を防ぐ)。

export const SCENE_KEYS = {
  boot: 'BootScene',
  preload: 'PreloadScene',
  title: 'TitleScene',
  game: 'GameScene',
  ui: 'UIScene',
  gameOver: 'GameOverScene',
  clear: 'ClearScene',
  cutscene: 'CutsceneScene',
  orientation: 'OrientationScene',
} as const;

export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];
