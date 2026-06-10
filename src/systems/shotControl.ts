import { SHOT } from '../config/balance';
import { isChargedShot } from './shot';

// ショット操作の状態機械(Phaser 非依存の純粋ロジック)。
//
// 操作仕様:
// - 1回目タップ(短押し→離す): チャージ開始。指を離してもゲージは溜まり続ける(armed)。
// - 2回目タップ: チャージ弾を発射(チャージ未成立なら通常弾)。
// - 長押し(holdToAutoFireMs 以上): チャージせず通常弾を連射し続ける。離すと停止。
//
// フレームごとに stepShot(prev, frame) を呼び、次状態と発火アクションを得る。
// アクションは「発射の意図」だけを返し、実際の発射可否(クールダウン)や音・弾生成は
// 呼び出し側(Player)が担う。

export type ShotMode =
  | 'idle' // 未操作
  | 'pending' // 押下中・タップ/長押し未確定
  | 'charging' // チャージ armed(指を離した状態でゲージ蓄積)
  | 'holding' // 長押し連射中
  | 'postFire'; // チャージ弾を撃った直後(継続押下なら連射へ移行)

export type ShotAction = 'none' | 'fireNormal' | 'fireCharged';

export interface ShotState {
  mode: ShotMode;
  /** 現在の押下が始まった時刻(ms)。タップ/長押し判定に使う。 */
  pressStartAt: number;
  /** チャージ開始時刻(ms)。mode==='charging' の間だけ有効。 */
  chargeStartAt: number;
  /** 直近の連射発火時刻(ms)。mode==='holding' のクールダウン管理。 */
  lastFireAt: number;
}

/** 1 フレーム分のショットボタン入力。 */
export interface ShotFrame {
  /** このフレームで押下が立ち上がったか。 */
  pressed: boolean;
  /** このフレームで離されたか。 */
  released: boolean;
  /** 現在押下中か。 */
  held: boolean;
  /** 現在時刻(ms)。 */
  now: number;
}

/** 初期状態(未操作)。 */
export function initialShotState(): ShotState {
  return { mode: 'idle', pressStartAt: 0, chargeStartAt: 0, lastFireAt: 0 };
}

/** チャージ経過時間(ms)。charging 中のみ正、それ以外は 0(UI ゲージ表示用)。 */
export function chargingElapsed(state: ShotState, now: number): number {
  return state.mode === 'charging' ? Math.max(0, now - state.chargeStartAt) : 0;
}

/**
 * 1 フレーム評価して次状態と発火アクションを返す。1 フレーム最大 1 アクション。
 */
export function stepShot(
  prev: ShotState,
  frame: ShotFrame,
): { state: ShotState; action: ShotAction } {
  const { pressed, released, held, now } = frame;
  let state: ShotState = { ...prev };
  let action: ShotAction = 'none';

  if (pressed) {
    if (state.mode === 'charging') {
      // 2回目タップ: チャージ弾(不足なら通常弾)を発射。継続押下なら連射へ。
      const elapsed = now - state.chargeStartAt;
      action = isChargedShot(elapsed) ? 'fireCharged' : 'fireNormal';
      state = { mode: 'postFire', pressStartAt: now, chargeStartAt: 0, lastFireAt: now };
    } else {
      // 1回目の押下開始。タップ/長押しは離すまで未確定。
      state = { ...state, mode: 'pending', pressStartAt: now };
    }
  } else if (held) {
    if (state.mode === 'pending' && now - state.pressStartAt >= SHOT.holdToAutoFireMs) {
      // 長押し確定: チャージせず連射開始(1 発目を即発火)。
      action = 'fireNormal';
      state = { ...state, mode: 'holding', lastFireAt: now };
    } else if (state.mode === 'postFire' && now - state.pressStartAt >= SHOT.holdToAutoFireMs) {
      // チャージ弾発射後も押し続けた: 連射へ移行。
      action = 'fireNormal';
      state = { ...state, mode: 'holding', lastFireAt: now };
    } else if (state.mode === 'holding' && now - state.lastFireAt >= SHOT.cooldownMs) {
      // 連射中: クールダウンごとに発火。
      action = 'fireNormal';
      state = { ...state, lastFireAt: now };
    }
  } else if (released) {
    if (state.mode === 'pending') {
      if (now - state.pressStartAt < SHOT.holdToAutoFireMs) {
        // クイックタップ → チャージ開始(指を離してもゲージ蓄積)。
        state = { ...state, mode: 'charging', chargeStartAt: now };
      } else {
        state = { ...state, mode: 'idle' };
      }
    } else if (state.mode === 'holding' || state.mode === 'postFire') {
      // 連射終了 / チャージ弾後の押下解放 → 待機へ。
      state = { ...state, mode: 'idle' };
    }
    // charging 中は指が離れている前提のため released は来ない。
  }

  return { state, action };
}
