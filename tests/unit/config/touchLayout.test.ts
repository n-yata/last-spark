import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTouchLayout,
  moveDirFromDelta,
  climbDirFromDelta,
  clampStick,
  isInMoveZone,
  isInsideButton,
  MOVE_DEADZONE_PX,
  CLIMB_DEADZONE_PX,
  MOVE_PAD_MAX_RADIUS,
} from '../../../src/config/touchLayout';
import { CONTROL_BAND_MIN_PX, CONTROL_BAND_MAX_PX } from '../../../src/config/controlBand';
import { EFFECTS } from '../../../src/config/effects';
import { setUiScale } from '../../../src/config/uiScale';

// touchLayout の絶対px定数は scaled()=uiScale 倍される。uiScale はモジュール変数で
// 状態を持つため、各テストの前後で必ず 1 に戻し、既存(uiScale=1)ケースへの
// 状態リークを防ぐ。uiScale=2 を使うのは専用 describe 内だけに限定する。
beforeEach(() => setUiScale(1));
afterEach(() => setUiScale(1));

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

  it('ジャンプボタンは画面右上に配置される', () => {
    const layout = createTouchLayout(1200, 540);
    expect(layout.jumpButton.x).toBe(1200 - 84);
    expect(layout.jumpButton.y).toBe(540 - 112);
    expect(layout.jumpButton.radius).toBe(44);
  });

  it('ショットボタンは左下に配置され、ジャンプと重ならない(対角配置)', () => {
    const layout = createTouchLayout(1200, 540);
    expect(layout.shootButton.x).toBe(1200 - 188);
    expect(layout.shootButton.y).toBe(540 - 72);
    expect(layout.shootButton.radius).toBe(44);
    // 2 ボタンの中心間距離が両半径の和より大きい(=円が重ならない)
    const dx = layout.shootButton.x - layout.jumpButton.x;
    const dy = layout.shootButton.y - layout.jumpButton.y;
    const dist = Math.hypot(dx, dy);
    expect(dist).toBeGreaterThan(layout.shootButton.radius + layout.jumpButton.radius);
  });

  it('両ボタンとも画面右側(移動ゾーン外)にある', () => {
    const layout = createTouchLayout(1200, 540);
    expect(isInMoveZone(layout.moveZone, layout.jumpButton.x)).toBe(false);
    expect(isInMoveZone(layout.moveZone, layout.shootButton.x)).toBe(false);
  });

  it('bandHeight 省略時は従来の対角配置(後方互換)', () => {
    const layout = createTouchLayout(1200, 540);
    expect(layout.jumpButton.y).toBe(540 - 112);
    expect(layout.shootButton.y).toBe(540 - 72);
  });
});

describe('createTouchLayout(下部コントロール帯ありの配置)', () => {
  const W = 1200;
  const H = 540;
  const BAND = 120;

  it('両ボタンが帯の縦範囲(height-band〜height)内に収まる', () => {
    const layout = createTouchLayout(W, H, BAND);
    const bandTop = H - BAND;
    for (const btn of [layout.jumpButton, layout.shootButton]) {
      expect(btn.y - btn.radius).toBeGreaterThanOrEqual(bandTop);
      expect(btn.y + btn.radius).toBeLessThanOrEqual(H);
    }
  });

  it('両ボタンが帯の縦中央に揃う', () => {
    const layout = createTouchLayout(W, H, BAND);
    const bandCenterY = H - BAND / 2;
    expect(layout.jumpButton.y).toBe(bandCenterY);
    expect(layout.shootButton.y).toBe(bandCenterY);
  });

  it('帯ありでも両ボタンは画面右側(移動ゾーン外)にある', () => {
    const layout = createTouchLayout(W, H, BAND);
    expect(isInMoveZone(layout.moveZone, layout.jumpButton.x)).toBe(false);
    expect(isInMoveZone(layout.moveZone, layout.shootButton.x)).toBe(false);
  });

  it('帯ありでも2ボタンは重ならない(中心間距離 > 両半径の和)', () => {
    const layout = createTouchLayout(W, H, BAND);
    const dx = layout.shootButton.x - layout.jumpButton.x;
    const dy = layout.shootButton.y - layout.jumpButton.y;
    const dist = Math.hypot(dx, dy);
    expect(dist).toBeGreaterThan(layout.shootButton.radius + layout.jumpButton.radius);
  });

  it('移動ゾーンの高さは帯を除いたプレイ領域に切り詰められる(枠が帯へ食い込まない)', () => {
    const layout = createTouchLayout(W, H, BAND);
    expect(layout.moveZone.height).toBe(H - BAND);
  });

  it('最小帯高さ(112)でもボタンが帯内に完全に収まる', () => {
    const layout = createTouchLayout(W, H, CONTROL_BAND_MIN_PX);
    const bandTop = H - CONTROL_BAND_MIN_PX;
    for (const btn of [layout.jumpButton, layout.shootButton]) {
      expect(btn.y - btn.radius).toBeGreaterThanOrEqual(bandTop);
      expect(btn.y + btn.radius).toBeLessThanOrEqual(H);
    }
  });

  it('押下拡大(pressedRadiusScale)込みでも最小帯でボタンが画面下端から切れない', () => {
    const layout = createTouchLayout(W, H, CONTROL_BAND_MIN_PX);
    const bandTop = H - CONTROL_BAND_MIN_PX;
    for (const btn of [layout.jumpButton, layout.shootButton]) {
      const pressedRadius = btn.radius * EFFECTS.touch.pressedRadiusScale;
      expect(btn.y - pressedRadius).toBeGreaterThanOrEqual(bandTop);
      expect(btn.y + pressedRadius).toBeLessThanOrEqual(H);
    }
  });

  it('帯が十分高い(最大帯)場合は通常半径44を維持する(不必要に縮めない)', () => {
    const layout = createTouchLayout(W, H, CONTROL_BAND_MAX_PX);
    expect(layout.jumpButton.radius).toBe(44);
    expect(layout.shootButton.radius).toBe(44);
  });

  it('最小帯では半径が44より小さく切り詰められる(切れの原因だった44のままでない)', () => {
    const layout = createTouchLayout(W, H, CONTROL_BAND_MIN_PX);
    expect(layout.jumpButton.radius).toBeLessThan(44);
    expect(layout.jumpButton.radius).toBeGreaterThan(0);
    expect(layout.shootButton.radius).toBe(layout.jumpButton.radius);
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

describe('climbDirFromDelta(梯子昇降の上下判定)', () => {
  it('原点から上へ不感帯を超えて動かすと登る(-1)', () => {
    expect(climbDirFromDelta(-(CLIMB_DEADZONE_PX + 1))).toBe(-1);
  });

  it('原点から下へ不感帯を超えて動かすと降りる(1)', () => {
    expect(climbDirFromDelta(CLIMB_DEADZONE_PX + 1)).toBe(1);
  });

  it('不感帯内(原点付近)は静止(0)', () => {
    expect(climbDirFromDelta(0)).toBe(0);
    expect(climbDirFromDelta(-CLIMB_DEADZONE_PX)).toBe(0);
    expect(climbDirFromDelta(CLIMB_DEADZONE_PX)).toBe(0);
  });

  it('昇降の不感帯は横移動より大きい(縦ブレ誤反応の抑制)', () => {
    expect(CLIMB_DEADZONE_PX).toBeGreaterThan(MOVE_DEADZONE_PX);
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

// 高DPI(uiScale=2)時: 絶対px定数(半径・配置オフセット・不感帯)が scaled()=2倍され、
// 物理px化後も見た目・操作感が不変に保たれること。各テストで明示的に setUiScale(2) する
// (前後の beforeEach/afterEach により他テストには影響しない)。
describe('uiScale=2(高DPI)でのレイアウト・判定', () => {
  describe('createTouchLayout(帯なし) は絶対px定数を2倍にする', () => {
    it('jumpButton: radius=88(scaled44), x=1200-168, y=540-224', () => {
      setUiScale(2);
      const layout = createTouchLayout(1200, 540);
      expect(layout.jumpButton.radius).toBe(88); // scaled(44)
      expect(layout.jumpButton.x).toBe(1200 - 168); // scaled(84)=168 → 1032
      expect(layout.jumpButton.x).toBe(1032);
      expect(layout.jumpButton.y).toBe(540 - 224); // scaled(112)=224
    });

    it('shootButton: radius=88, x=1200-376, y=540-144', () => {
      setUiScale(2);
      const layout = createTouchLayout(1200, 540);
      expect(layout.shootButton.radius).toBe(88);
      expect(layout.shootButton.x).toBe(1200 - 376); // scaled(188)=376 → 824
      expect(layout.shootButton.x).toBe(824);
      expect(layout.shootButton.y).toBe(540 - 144); // scaled(72)=144
    });

    it('移動ゾーン(画面比で決まる)は uiScale に依存せず左半分のまま', () => {
      setUiScale(2);
      const layout = createTouchLayout(1200, 540);
      expect(layout.moveZone.x).toBe(0);
      expect(layout.moveZone.width).toBe(600);
      expect(layout.moveZone.height).toBe(540);
    });

    it('2倍スケールでも2ボタンは重ならない(中心間距離 > 両半径の和)', () => {
      setUiScale(2);
      const layout = createTouchLayout(1200, 540);
      const dx = layout.shootButton.x - layout.jumpButton.x;
      const dy = layout.shootButton.y - layout.jumpButton.y;
      const dist = Math.hypot(dx, dy);
      expect(dist).toBeGreaterThan(layout.shootButton.radius + layout.jumpButton.radius);
    });
  });

  describe('createTouchLayout(帯あり) のショットボタンX', () => {
    it('帯ありでは shootButton.x=width-scaled(200)=width-400', () => {
      setUiScale(2);
      // 帯高さも物理px(scaled済み)を渡す前提。半径切り詰めの影響を受けないよう
      // 十分高い帯を与え、配置オフセットのみを検証する。
      const layout = createTouchLayout(1200, 540, 240);
      expect(layout.jumpButton.x).toBe(1200 - 168); // scaled(84)=168
      expect(layout.shootButton.x).toBe(1200 - 400); // scaled(200)=400
    });
  });

  describe('moveDirFromDelta は不感帯が scaled(18)=36 になる', () => {
    it('37(>36)で右(1)、36(=しきい値)で停止(0)', () => {
      setUiScale(2);
      expect(moveDirFromDelta(37)).toBe(1);
      expect(moveDirFromDelta(36)).toBe(0);
    });

    it('-37(<-36)で左(-1)、-36で停止(0)', () => {
      setUiScale(2);
      expect(moveDirFromDelta(-37)).toBe(-1);
      expect(moveDirFromDelta(-36)).toBe(0);
    });
  });

  describe('climbDirFromDelta は不感帯が scaled(28)=56 になる', () => {
    it('57(>56)で降りる(1)、56(=しきい値)で静止(0)', () => {
      setUiScale(2);
      expect(climbDirFromDelta(57)).toBe(1);
      expect(climbDirFromDelta(56)).toBe(0);
    });

    it('-57(<-56)で登る(-1)、-56で静止(0)', () => {
      setUiScale(2);
      expect(climbDirFromDelta(-57)).toBe(-1);
      expect(climbDirFromDelta(-56)).toBe(0);
    });
  });

  describe('clampStick の最大半径が scaled(62)=124 になる', () => {
    it('原点から248(=124*2)離れた点は原点+124 に丸まる', () => {
      setUiScale(2);
      const r = clampStick(100, 100, 100 + MOVE_PAD_MAX_RADIUS * 2 * 2, 100); // 100+248
      expect(r.x).toBeCloseTo(100 + 124, 5);
      expect(r.y).toBeCloseTo(100, 5);
    });

    it('最大半径(124)以内ならそのまま返す', () => {
      setUiScale(2);
      // uiScale=1 では 120 はクランプ対象だが、uiScale=2 では 124 以内なので素通り。
      expect(clampStick(100, 100, 220, 100)).toEqual({ x: 220, y: 100 });
    });
  });
});

// uiScale を 2 に設定したまま終了しても、afterEach により 1 に戻ることで
// 後続テスト(別ファイル含む)へ状態が漏れないことを保証する回帰テスト。
describe('uiScale の状態リーク防止(afterEach の検証)', () => {
  it('直前テストで setUiScale(2) しても、このテストは初期スケール(1)で始まる', () => {
    const layout = createTouchLayout(1200, 540);
    // uiScale=1 の値であること(=リークしていない)
    expect(layout.jumpButton.radius).toBe(44);
    expect(layout.jumpButton.x).toBe(1200 - 84);
  });
});
