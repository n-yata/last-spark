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
      // NONE: リサイズは systems/dprScaling が自前で制御する。高DPI(Retina)で滲まないよう
      // バッキング解像度を物理px化(論理サイズ=CSS px×cappedDpr)し、canvas の CSS 表示サイズは
      // 画面いっぱい(CSS px)に保つ。レターボックスを作らずタッチ操作ゾーンが画面端まで届く。
      // ワールドの見え方は GameScene でカメラズーム(高さ基準)を合わせて一定に保つ。
      // 初期 width/height は起動直後に dprScaling が物理pxへ上書きする暫定値。
      mode: Phaser.Scale.NONE,
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
