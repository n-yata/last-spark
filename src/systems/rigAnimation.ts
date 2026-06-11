// キャラリグのアニメーション計算(純粋関数群)。
// Phaser 非依存(数値 in / 数値 out)にしてユニットテスト可能にする。
// CharacterRig がこれらを用いて各パーツの角度/スケールを毎フレーム算出する。

/** リグの基本モーション状態。攻撃リコイルは別レイヤー(triggerAttack)で重畳する。 */
export type MotionState =
  | 'idle'
  | 'walk'
  | 'climb'
  | 'jump'
  | 'fall'
  | 'hit'
  | 'stagger'
  | 'dead';

/** 値を [min, max] に丸める。 */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * 歩行位相を時刻から算出する(0..2π を cycleMs 周期で巡回)。
 * 状態を持たず時刻のみから決まるため決定的。負の時刻も正しく折り返す。
 */
export function walkPhase(timeMs: number, cycleMs: number): number {
  if (cycleMs <= 0) return 0;
  const t = ((timeMs % cycleMs) + cycleMs) % cycleMs;
  return (t / cycleMs) * Math.PI * 2;
}

/** 脚/腕の振り角(ラジアン)。位相 0=中立, π/2=最大前, 3π/2=最大後。 */
export function legSwing(phase: number, amplitudeRad: number): number {
  return Math.sin(phase) * amplitudeRad;
}

/** スクワッシュ&ストレッチ結果(縦横スケール)。 */
export interface SquashStretch {
  scaleX: number;
  scaleY: number;
}

/**
 * 鉛直速度から縦横スケールを算出する。
 * - 上昇(vy<0): 縦に伸び・横に細る(scaleY>1, scaleX<1)
 * - 下降(vy>0): 縦に縮み・横に広がる(scaleY<1, scaleX>1)
 * - vy=0: 中立(1,1)
 */
export function squashStretch(
  vy: number,
  maxAbsVy = 560,
  intensity = 0.18,
): SquashStretch {
  const k = clamp(vy / maxAbsVy, -1, 1); // -1=上昇最大, +1=下降最大
  const scaleY = 1 - k * intensity;
  const scaleX = 1 + k * intensity * 0.6;
  return { scaleX, scaleY };
}

/**
 * 発射後の腕リコイル量(0..1)。elapsed=0 で 1、duration 経過で 0、範囲内は単調減少。
 * duration 以降・負 elapsed の境界も安全に扱う。
 */
export function armRecoil(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  if (elapsedMs <= 0) return 1;
  if (elapsedMs >= durationMs) return 0;
  return 1 - elapsedMs / durationMs;
}

/** 被弾/けぞり角(ラジアン)。active 中のみ leanRad、非 active は 0。 */
export function hitLean(active: boolean, leanRad = 0.35): number {
  return active ? leanRad : 0;
}
