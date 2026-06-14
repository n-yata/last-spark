// ダメージ床(汚染床など)の発火タイミング判定。Phaser 非依存の純粋ロジックでテスト可能にする。
// combatRules / shotControl / playerMovement と同じく、副作用を持たず単体テストできるようにする。

/**
 * ダメージ床のクールダウン判定。前回発火時刻 lastHitAt から tickMs 以上経過していれば true。
 * overlap は毎フレーム呼ばれるため、この判定で多重ヒットを間引く(true のとき呼び出し側が
 * lastHitAt を now で更新する)。初回(lastHitAt=-Infinity)は必ず true を返す。
 */
export function shouldHazardTick(lastHitAt: number, now: number, tickMs: number): boolean {
  return now - lastHitAt >= tickMs;
}
