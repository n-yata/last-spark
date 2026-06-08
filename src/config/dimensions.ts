// 論理解像度(横向き 16:9)。Phaser に依存しない定数として切り出し、
// gameConfig(Phaser依存)と touchLayout(Phaser非依存・テスト対象)の両方から参照する。
// Scale.FIT で端末画面にフィットさせる。

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
