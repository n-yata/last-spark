// 画面向き(縦持ち)とポーズの二重 pause 競合を解消する純関数(Phaser 非依存)。
//
// GameScene は縦持ち時に OrientationScene を起動して自身を pause する。一方ポーズ機能も
// 自身を pause する。両者が無秩序に resume すると「ポーズ中に横持ち復帰で勝手に再開」
// 「縦持ちのままポーズ解除で動く」といった不整合が起きる。
// resume してよいのは「横持ち かつ 非ポーズ」のときだけ、という判定をここに集約する。

/**
 * OrientationScene のハンドリングでゲームを resume してよいかを返す。
 * @param portrait 縦持ち(回転を促す向き)なら true。
 * @param paused   オプションメニューによるポーズ中なら true。
 * @returns 横持ち かつ 非ポーズ のときだけ true。
 */
export function shouldResumeGame(portrait: boolean, paused: boolean): boolean {
  return !portrait && !paused;
}
