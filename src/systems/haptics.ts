// 触覚フィードバック(Vibration API)のラッパ(シングルトン)。
//
// 設計方針(SoundManager と同様):
// - import 時は副作用を持たない。
// - navigator.vibrate 非対応環境(iOS Safari / PC / jsdom)では全メソッドが no-op で例外を出さない。
// - GameSettings.vibration を setEnabled で反映する(OFF なら一切振動しない)。
//
// 振動パターンはゲームバランスではなく演出値のため、balance.ts ではなくここで持つ。

/** 被弾時: 短い単発(気づく程度で邪魔しない長さ)。 */
const HIT_VIBRATION_MS = 40;
/** ボス撃破時: 撃破の重みを伝える 2 連パターン([振動, 休止, 振動] ms)。 */
const BOSS_DEFEAT_PATTERN = [60, 40, 90];

export class Haptics {
  private enabled = true;

  /** 設定(GameSettings.vibration)を反映する。 */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** プレイヤー被弾(実ダメージ時)の短い振動。 */
  vibrateHit(): void {
    this.vibrate(HIT_VIBRATION_MS);
  }

  /** ボス撃破の振動パターン。 */
  vibrateBossDefeat(): void {
    this.vibrate(BOSS_DEFEAT_PATTERN);
  }

  /**
   * 振動を発火する。対応判定は呼び出し時に行う(テストでの差し替え容易性と、
   * 実行環境での機能出現/消失に安全に追従するため)。
   */
  private vibrate(pattern: number | number[]): void {
    if (!this.enabled) return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // 一部環境はユーザー操作前の呼び出しを拒否することがあるが、演出のため無視してよい。
    }
  }
}

// 全シーン横断で共有するシングルトン。
let instance: Haptics | undefined;

/** 共有 Haptics を返す(遅延生成)。非対応環境では各メソッドが no-op。 */
export function getHaptics(): Haptics {
  if (!instance) instance = new Haptics();
  return instance;
}
