import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene';
import { ClearScene } from './scenes/ClearScene';
import { CutsceneScene } from './scenes/CutsceneScene';
import { OrientationScene } from './scenes/OrientationScene';

// エントリポイント。Phaser.Game を生成し全シーンを登録する。
// シーン遷移: Boot → Preload → Title → Game(+UI 並行) → Clear / GameOver。

const game = new Phaser.Game(
  createGameConfig([
    BootScene,
    PreloadScene,
    TitleScene,
    GameScene,
    UIScene,
    GameOverScene,
    ClearScene,
    CutsceneScene,
    OrientationScene,
  ]),
);

// 実行時イントロスペクション用にゲームインスタンスを公開する(常時有効)。
// デバッグ・E2E でのアクティブシーン確認などに用いる。テスト専用分岐ではない。
declare global {
  interface Window {
    lastSpark?: Phaser.Game;
  }
}
window.lastSpark = game;

export default game;
