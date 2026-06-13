import Phaser from 'phaser';
import { cappedDpr, setUiScale } from '../config/uiScale';

// 高DPI(Retina)対応: canvas のバッキング解像度を物理pxにし、CSS表示は画面いっぱい(等倍)。
//
// Phaser 3.90 は resolution=1 固定でバッキング解像度=論理サイズのため、論理サイズ自体を
// 物理px化することでのみ鮮明化できる(scale.mode=NONE 前提・自前でリサイズ制御)。
// game.scale.resize() は RESIZE イベントを発火するため、既存シーンの再レイアウト
// (GameScene.applyCameraLayout / InputController.refreshLayout / 縦持ち判定)はそのまま追従する。

/**
 * Game に高DPIスケーリングを配線する。
 * - uiScale は canvas 不要なので即時確定し、全シーンの create より前に保証する。
 * - 解像度反映(scale.resize / canvas.style)は canvas 準備後(READY)に行い、以降は
 *   ウィンドウのリサイズ・画面回転に追従して再適用する。
 */
export function initHiDpiScaling(game: Phaser.Game): void {
  const apply = (): void => {
    const dpr = cappedDpr();
    setUiScale(dpr);
    // boot 前に window リサイズが来た場合は canvas/scale 未準備のためスキップ(READY で再実行)。
    if (!game.scale || !game.canvas) return;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    // 論理(=バッキング)サイズを物理pxへ。これで描画解像度が DPR 倍に上がる。
    game.scale.resize(cssW * dpr, cssH * dpr);
    // CSS表示サイズは CSS px のまま=画面いっぱい(レターボックスなし・現挙動維持)。
    game.canvas.style.width = `${cssW}px`;
    game.canvas.style.height = `${cssH}px`;
  };

  // uiScale だけは同期的に確定させる(各シーンの create 時点で getUiScale() が正しい値を返す)。
  setUiScale(cappedDpr());

  // canvas/ScaleManager 準備後に解像度を反映し、以降はリサイズ/回転で再適用。
  game.events.once(Phaser.Core.Events.READY, apply);
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
}
