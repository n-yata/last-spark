import Phaser from 'phaser';
import { STAGE } from './balance';
import { GAME_WIDTH, GAME_HEIGHT } from './dimensions';

// 画面サイズ定数は dimensions.ts(Phaser非依存)に定義。既存 import 互換のため再エクスポートする。
export { GAME_WIDTH, GAME_HEIGHT };

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
      // RESIZE でキャンバスを常に画面いっぱいに広げ、レターボックス(左右の黒帯)を
      // 作らない。これによりタッチ操作ゾーンが物理画面の端まで届く。
      // ワールドの見え方は GameScene でカメラズーム(高さ基準)を合わせて一定に保つ。
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
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
