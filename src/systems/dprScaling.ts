import Phaser from 'phaser';
import { cappedDpr, setUiScale } from '../config/uiScale';

// 高DPI(Retina)対応: canvas のバッキング解像度を物理pxにし、CSS表示は画面いっぱい(等倍)。
//
// Phaser 3.90 は resolution=1 固定でバッキング解像度=論理サイズのため、論理サイズ自体を
// 物理px化することでのみ鮮明化できる(scale.mode=NONE 前提・自前でリサイズ制御)。
//
// 実装は ScaleManager の zoom を使う:
//   - gameSize(=論理=バッキング) を物理px(cssW*dpr) に resize → 描画解像度が DPR 倍
//   - zoom=1/dpr により canvas の CSS 表示サイズ = gameSize*zoom = cssW(画面いっぱい)
// これで ScaleManager が canvas.style と displayScale(=baseSize/canvasBounds=dpr)を一貫管理し、
// pointer 変換(transformX/Y = (page - bounds)*displayScale = 物理px)が layout(物理px)と一致する。
// ※ canvas.style を手動で書き換えると canvasBounds がズレ、タッチ判定が表示とずれるため行わない。
// game.scale.resize() は RESIZE イベントを発火するため、既存シーンの再レイアウト
// (GameScene.applyCameraLayout / InputController.refreshLayout / 縦持ち判定)はそのまま追従する。

/**
 * Game に高DPIスケーリングを配線する。
 * - uiScale は canvas 不要なので即時確定し、全シーンの create より前に保証する。
 * - 解像度反映(zoom + scale.resize)は canvas 準備後(READY)に行い、以降は
 *   ウィンドウのリサイズ・画面回転に追従して再適用する。
 */
export function initHiDpiScaling(game: Phaser.Game): void {
  const apply = (): void => {
    const dpr = cappedDpr();
    setUiScale(dpr);
    // boot 前に window リサイズが来た場合は canvas/scale 未準備のためスキップ(READY で再実行)。
    if (!game.scale || !game.canvas) return;
    // zoom を先に設定してから resize する。resize() が zoom を見て canvas.style を
    // cssW(=物理px*zoom) に設定し、refresh() が displayScale を dpr に揃える。
    game.scale.setZoom(1 / dpr);
    game.scale.resize(window.innerWidth * dpr, window.innerHeight * dpr);
  };

  // uiScale だけは同期的に確定させる(各シーンの create 時点で getUiScale() が正しい値を返す)。
  setUiScale(cappedDpr());

  // canvas/ScaleManager 準備後に解像度を反映し、以降はリサイズ/回転で再適用。
  game.events.once(Phaser.Core.Events.READY, apply);
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
}
