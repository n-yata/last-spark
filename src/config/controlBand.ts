import Phaser from 'phaser';

// 下部コントロール帯(レターボックス)の高さ算出とタッチ環境判定。
// タッチ環境でのみ画面下部に仮想ボタン専用の帯を設け、ゲーム描画(プレイ領域)を
// その上側へ収める。これにより「指が乗る帯」と「ボス・弾幕が見えるプレイ領域」を
// 物理的に分離する。非タッチ(デスクトップ)では帯高さ0=フル画面で従来挙動を保つ。

/** 帯の最小高さ(px)。半径44の仮想ボタン(直径88)が余白込みで収まる最小値。 */
export const CONTROL_BAND_MIN_PX = 96;
/** 帯の最大高さ(px)。背の高い画面で帯が過大にならないよう制限する。 */
export const CONTROL_BAND_MAX_PX = 112;
/** 画面高さに対する帯高さの基準比率。プレイ領域を広く保つため控えめにする。 */
export const CONTROL_BAND_RATIO = 0.14;

/**
 * 画面高さとタッチ有効フラグから下部帯の高さ(px)を算出する。
 * 非タッチ(enabled=false)または不正な高さなら 0(帯なし=フル画面)。
 * タッチ時は画面高さ比をとり、[MIN, MAX] にクランプする。
 */
export function controlBandHeight(screenHeight: number, enabled: boolean): number {
  if (!enabled || screenHeight <= 0) return 0;
  const raw = screenHeight * CONTROL_BAND_RATIO;
  return Math.round(Math.min(CONTROL_BAND_MAX_PX, Math.max(CONTROL_BAND_MIN_PX, raw)));
}

/**
 * 下部コントロール帯を出すべき「純タッチ端末」かを判定する。
 * スマホ/タブレットのように指操作が主(coarse ポインタ)で、かつマウス等の精密
 * ポインタ(fine)を持たない端末でのみ true。タッチ対応PCやマウス併用端末では
 * fine ポインタが存在するため false となり、帯を出さずフル画面を維持する。
 * matchMedia が無い環境(テスト等)では Phaser のタッチ判定にフォールバックする。
 */
export function isTouchControlEnabled(game: Phaser.Game): boolean {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const hasFinePointer = window.matchMedia('(any-pointer: fine)').matches;
    return coarse && !hasFinePointer;
  }
  return game.device.input.touch === true;
}

/** シーンから現在の下部帯高さ(px)を解決する。 */
export function resolveControlBand(scene: Phaser.Scene): number {
  return controlBandHeight(scene.scale.height, isTouchControlEnabled(scene.game));
}
