import type { BossPhase } from '../types/boss';

/**
 * phase1 の ECLIPSE コアが「配下掃討待ち」の状態から露出へ入る条件。
 * 配下が 0 になった瞬間だけ true になればよいので、副作用は持たせない。
 */
export function shouldOpenCoreExposure(
  phase: BossPhase,
  awaitingExposure: boolean,
  activeMinions: number,
): boolean {
  return phase === 'phase1' && awaitingExposure && activeMinions <= 0;
}

/**
 * 現在時刻においてコアへ HP ダメージを通してよいか。
 * phase2 は常時ダメージ可、phase1 は露出ウィンドウ中のみ可。
 */
export function isCoreDamageOpen(
  phase: BossPhase,
  exposedUntil: number,
  now: number,
): boolean {
  return phase === 'phase2' || now < exposedUntil;
}
