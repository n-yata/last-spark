import Phaser from 'phaser';
import { EFFECTS } from '../config/effects';

// フェード付きシーン遷移の共通ヘルパ。瞬間切替(scene.start 直叩き)をなくし、
// 全シーンで統一した暗転イン/アウトを提供する。

/** 多重遷移ガード用のシーン data キー。 */
const FADING_KEY = 'transition.fading';

/**
 * フェードアウトしてから次のシーンへ遷移する。
 * 連打やコールバックの多重発火では最初の 1 回だけが有効になる。
 */
export function transitionTo(scene: Phaser.Scene, key: string, data?: object): void {
  if (scene.data.get(FADING_KEY) === true) return;
  scene.data.set(FADING_KEY, true);
  const cam = scene.cameras.main;
  cam.fadeOut(EFFECTS.fade.outMs, 0, 0, 0);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(key, data);
  });
}

/** シーン開始時のフェードイン。各シーンの create() 冒頭で呼ぶ。 */
export function fadeIn(scene: Phaser.Scene): void {
  // シーンは再利用される(リトライ/周回)ため、前回のガードを必ずリセットする。
  scene.data.set(FADING_KEY, false);
  scene.cameras.main.fadeIn(EFFECTS.fade.inMs, 0, 0, 0);
}
