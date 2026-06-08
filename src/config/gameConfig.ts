import Phaser from 'phaser';
import { STAGE } from './balance';

/** 論理解像度(横向き 16:9)。Scale.FIT で端末画面にフィットさせる。 */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/**
 * Phaser.Game の基本設定。シーン配列は main.ts で注入する。
 * 物理は Arcade のみ(モバイルで 60fps を狙う)。
 */
export function createGameConfig(
  scenes: Phaser.Types.Scenes.SceneType[],
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game-root',
    backgroundColor: '#0a0e14',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: STAGE.gravityY },
        debug: false,
      },
    },
    input: {
      activePointers: 3, // マルチタッチ(移動 + ジャンプ/ショット同時)
    },
    render: {
      pixelArt: false,
      antialias: true,
    },
    scene: scenes,
  };
}
