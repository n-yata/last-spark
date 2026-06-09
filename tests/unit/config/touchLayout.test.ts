import { describe, it, expect } from 'vitest';
import {
  createTouchLayout,
  moveDirFromDelta,
  clampStick,
  isInMoveZone,
  isInsideButton,
  isJumpSwipeHeld,
  initialJumpSwipe,
  stepJumpSwipe,
  MOVE_DEADZONE_PX,
  MOVE_PAD_MAX_RADIUS,
  JUMP_SWIPE_PX,
} from '../../../src/config/touchLayout';

describe('createTouchLayout(実画面サイズ基準のレイアウト)', () => {
  it('移動ゾーンは画面左半分を占め、左端は x=0(物理画面端まで届く)', () => {
    const layout = createTouchLayout(1200, 540);
    expect(layout.moveZone.x).toBe(0);
    expect(layout.moveZone.width).toBe(600);
    expect(layout.moveZone.height).toBe(540);
  });

  it('画面が広い端末では移動ゾーンもその分広がる', () => {
    const wide = createTouchLayout(1600, 540);
    expect(wide.moveZone.width).toBe(800);
  });

  it('ショットボタンは画面右下に配置される(ジャンプは左パッドの上スワイプへ移行)', () => {
    const layout = createTouchLayout(1200, 540);
    expect(layout.shootButton.x).toBe(1200 - 84);
    expect(layout.shootButton.y).toBe(540 - 72);
    expect(layout.shootButton.radius).toBe(44); // 親指で押しやすい控えめサイズ
  });

  it('JUMP ボタンはレイアウトから廃止されている', () => {
    const layout = createTouchLayout(1200, 540);
    expect('jumpButton' in layout).toBe(false);
  });
});

describe('moveDirFromDelta(追従式パッドの方向判定)', () => {
  it('原点から左へ不感帯を超えて動かすと左(-1)', () => {
    expect(moveDirFromDelta(-(MOVE_DEADZONE_PX + 1))).toBe(-1);
  });

  it('原点から右へ不感帯を超えて動かすと右(1)', () => {
    expect(moveDirFromDelta(MOVE_DEADZONE_PX + 1)).toBe(1);
  });

  it('不感帯内(原点付近)は停止(0)', () => {
    expect(moveDirFromDelta(0)).toBe(0);
    expect(moveDirFromDelta(-MOVE_DEADZONE_PX)).toBe(0);
    expect(moveDirFromDelta(MOVE_DEADZONE_PX)).toBe(0);
  });

  it('原点相対なので画面位置に依存せず左右どちらにも入力できる(後退できないバグの回帰防止)', () => {
    expect(moveDirFromDelta(-30)).toBe(-1);
    expect(moveDirFromDelta(30)).toBe(1);
  });
});

describe('clampStick(スティック表示位置のクランプ)', () => {
  it('最大半径内なら現在位置をそのまま返す', () => {
    expect(clampStick(100, 100, 120, 100)).toEqual({ x: 120, y: 100 });
  });

  it('最大半径を超えたら原点から最大半径上に丸める', () => {
    const r = clampStick(100, 100, 100 + MOVE_PAD_MAX_RADIUS * 3, 100);
    expect(r.x).toBeCloseTo(100 + MOVE_PAD_MAX_RADIUS, 5);
    expect(r.y).toBeCloseTo(100, 5);
  });

  it('原点と同一点でも例外なく原点を返す', () => {
    expect(clampStick(50, 50, 50, 50)).toEqual({ x: 50, y: 50 });
  });
});

describe('isInMoveZone', () => {
  it('ゾーン内(左端0含む)は true、ゾーン外(右半分)は false', () => {
    const { moveZone } = createTouchLayout(1200, 540);
    expect(isInMoveZone(moveZone, 0)).toBe(true);
    expect(isInMoveZone(moveZone, moveZone.width - 1)).toBe(true);
    expect(isInMoveZone(moveZone, moveZone.width + 1)).toBe(false);
  });
});

describe('isInsideButton', () => {
  it('ボタン中心はヒット、半径外は非ヒット', () => {
    const { shootButton } = createTouchLayout(1200, 540);
    expect(isInsideButton(shootButton, shootButton.x, shootButton.y)).toBe(true);
    expect(isInsideButton(shootButton, shootButton.x + shootButton.radius + 5, shootButton.y)).toBe(
      false,
    );
  });
});

describe('上スワイプ・ジャンプ判定', () => {
  it('上スワイプしきい値は横移動の不感帯より大きい(横移動の誤発火を防ぐ)', () => {
    expect(JUMP_SWIPE_PX).toBeGreaterThan(MOVE_DEADZONE_PX);
  });

  it('initialJumpSwipe: 初期状態は未保持・発火可能(armed)', () => {
    expect(initialJumpSwipe()).toEqual({ held: false, armed: true });
  });

  it('isJumpSwipeHeld: しきい値以上で保持、未満では非保持', () => {
    expect(isJumpSwipeHeld(JUMP_SWIPE_PX)).toBe(true);
    expect(isJumpSwipeHeld(JUMP_SWIPE_PX + 10)).toBe(true);
    expect(isJumpSwipeHeld(JUMP_SWIPE_PX - 1)).toBe(false);
    expect(isJumpSwipeHeld(0)).toBe(false);
  });

  it('しきい値未満→以上の立ち上がりで発火し、保持中は再発火しない', () => {
    let s = initialJumpSwipe();
    // しきい値未満: 発火しない・非保持
    let r = stepJumpSwipe(s, MOVE_DEADZONE_PX);
    s = r.state;
    expect(r.pressed).toBe(false);
    expect(s.held).toBe(false);

    // しきい値以上にクロス: 発火・保持
    r = stepJumpSwipe(s, JUMP_SWIPE_PX + 20);
    s = r.state;
    expect(r.pressed).toBe(true);
    expect(s.held).toBe(true);

    // 上に留め続ける: 保持継続・再発火なし(指保持で可変ジャンプ)
    r = stepJumpSwipe(s, JUMP_SWIPE_PX + 40);
    s = r.state;
    expect(r.pressed).toBe(false);
    expect(s.held).toBe(true);
  });

  it('原点側に戻すと再アームされ、再度上へ動かすと再ジャンプできる', () => {
    let s = initialJumpSwipe();
    s = stepJumpSwipe(s, JUMP_SWIPE_PX + 10).state; // 1回目発火
    // 原点側に戻す: 保持解除・再アーム
    const back = stepJumpSwipe(s, 0);
    s = back.state;
    expect(back.pressed).toBe(false);
    expect(s.held).toBe(false);
    // 再度上へ: 再ジャンプ発火
    const again = stepJumpSwipe(s, JUMP_SWIPE_PX + 10);
    expect(again.pressed).toBe(true);
    expect(again.state.held).toBe(true);
  });
});
