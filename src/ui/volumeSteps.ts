// 音量の段階調整ロジック(Phaser 非依存・純関数)。
// オプションメニューの音量UIは連続スライダーではなく離散段階で扱うため、
// 0.0–1.0 の連続値と段階インデックスの相互変換・増減・表示文字列をここに集約する。
// 純関数に切り出すことで量子化の丸めや上下限クランプをユニットテストで担保する。

/**
 * 音量段階の最大インデックス。段階は 0..VOLUME_STEPS の (VOLUME_STEPS+1) 値。
 * 既定 4 → 0%, 25%, 50%, 75%, 100% の 5 段階。
 */
export const VOLUME_STEPS = 4;

/** 値を [0, VOLUME_STEPS] の整数段階にクランプする。非有限値は 0(無音)へ倒す。 */
function clampStep(step: number): number {
  if (!Number.isFinite(step)) return 0;
  return Math.max(0, Math.min(VOLUME_STEPS, Math.round(step)));
}

/**
 * 0.0–1.0 の連続音量を最も近い段階インデックス(0..VOLUME_STEPS)へ量子化する。
 * 範囲外・非有限値は安全側でクランプする。
 */
export function volumeToStep(volume: number): number {
  if (!Number.isFinite(volume)) return 0;
  const clamped = Math.max(0, Math.min(1, volume));
  return clampStep(clamped * VOLUME_STEPS);
}

/** 段階インデックスを 0.0–1.0 の音量値へ変換する。 */
export function stepToVolume(step: number): number {
  return clampStep(step) / VOLUME_STEPS;
}

/** 現在段階に delta(+1/-1 など)を加え、[0, VOLUME_STEPS] にクランプして返す。 */
export function adjustStep(step: number, delta: number): number {
  return clampStep(clampStep(step) + delta);
}

/** 段階インジケータ文字列(例: step=2 → "■■□□")を生成する。塗り=現在段階、空き=残り。 */
export function volumeBar(step: number): string {
  const filled = clampStep(step);
  return '■'.repeat(filled) + '□'.repeat(VOLUME_STEPS - filled);
}

/** 表示用パーセント(0–100 の整数。例: step=2 → 50)を返す。 */
export function volumePercent(step: number): number {
  return Math.round((clampStep(step) / VOLUME_STEPS) * 100);
}
