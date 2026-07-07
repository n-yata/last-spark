// HUD 演出の進行計算(Phaser 非依存の純粋関数)。
// BossHpBar の出現フィル、LifeBar の被ダメ点滅、チャージ完了パルスの位相を扱う。

/**
 * ボス HP バー出現時のフィル進行率(0..1)を返す。easeOutQuad で立ち上がりを速くし、
 * 満タン手前で減速して「ゲージが満ちる」溜めを作る。
 *
 * @param elapsedMs - show() からの経過時間
 * @param fillMs - フィル完了までの時間(0 以下なら常に 1)
 */
export function entranceFillRatio(elapsedMs: number, fillMs: number): number {
  if (fillMs <= 0) return 1;
  const t = Math.max(0, Math.min(1, elapsedMs / fillMs));
  return 1 - (1 - t) * (1 - t);
}

/**
 * 被ダメフラッシュの表示窓内かを返す。
 *
 * @param nowMs - 現在時刻
 * @param damagedAtMs - 被ダメ発生時刻(負なら未発生)
 * @param flashMs - フラッシュ継続時間
 */
export function damageFlashActive(nowMs: number, damagedAtMs: number, flashMs: number): boolean {
  if (damagedAtMs < 0) return false;
  const elapsed = nowMs - damagedAtMs;
  return elapsed >= 0 && elapsed < flashMs;
}

/**
 * フラッシュ中の明滅位相。経過時間を intervalMs で刻み、偶数区間で true(明)を返す。
 * 区間開始(elapsed=0)は必ず明から始まり、被ダメの瞬間が視覚的に立つ。
 *
 * @param nowMs - 現在時刻
 * @param damagedAtMs - 被ダメ発生時刻
 * @param intervalMs - 明滅の切替間隔(0 以下なら常に明)
 */
export function flashBlinkOn(nowMs: number, damagedAtMs: number, intervalMs: number): boolean {
  if (intervalMs <= 0) return true;
  const elapsed = Math.max(0, nowMs - damagedAtMs);
  return Math.floor(elapsed / intervalMs) % 2 === 0;
}

/**
 * 残像ゲージ(実値より遅れて減る琥珀バー)の次フレーム値を返す。
 * 実値が残像より小さい間は drainPerFrame ずつ縮み、実値までで止まる(下回らない)。
 * 実値が残像以上(回復・リセット・初期化)なら即座に実値へ追従する。
 * BossHpBar / LifeBar が共有する(被弾量を残像の長さで読ませる共通の視覚言語)。
 */
export function nextLagRatio(lag: number, actual: number, drainPerFrame: number): number {
  if (actual < lag) {
    return Math.max(actual, lag - drainPerFrame);
  }
  return actual;
}

/**
 * チャージ完了時の発光パルスのアルファ値を返す。
 * sin 波でゆっくり明滅させ、満タン状態が静止表示に埋もれないようにする。
 * (危機時のライフバー枠パルスにも再利用する汎用の sin パルス)
 */
export function chargePulseAlpha(
  nowMs: number,
  periodMs: number,
  minAlpha: number,
  maxAlpha: number,
): number {
  if (periodMs <= 0) return maxAlpha;
  const lo = Math.max(0, Math.min(1, minAlpha));
  const hi = Math.max(lo, Math.min(1, maxAlpha));
  const phase = ((nowMs % periodMs) / periodMs) * Math.PI * 2;
  const t = (Math.sin(phase) + 1) / 2;
  return lo + (hi - lo) * t;
}
