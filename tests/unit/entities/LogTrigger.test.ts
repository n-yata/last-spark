import { describe, it, expect, vi } from 'vitest';

// Phaser は Canvas/WebGL を前提とするため jsdom 環境では直接インスタンス化できない。
// このテストは LogTrigger.configureBody() が操作するボディ設定のロジックのみを検証する。
// configureBody() は「this.body」に setAllowGravity / setImmovable を呼ぶだけの純粋な
// 設定処理であるため、実体と同じインターフェースを持つモックボディを用意して
// prototype 経由で呼び出すことで、Phaser の Canvas 依存を持ち込まずに検証できる。

// Phaser モジュール全体をモックする(Canvas/WebGL が無い jsdom で動かすため)。
vi.mock('phaser', () => {
  class MockSprite {
    body: unknown = null;
    scene: unknown = null;
    x = 0;
    y = 0;
    setDisplaySize() { return this; }
    setTint() { return this; }
    setDepth() { return this; }
    setVisible() { return this; }
    setVelocityX() { return this; }
    disableBody() { return this; }
    destroy() {}
    get active() { return true; }
  }

  return {
    default: {
      Physics: {
        Arcade: {
          Sprite: MockSprite,
          Body: class MockBody {},
          Group: class MockGroup {},
        },
      },
      Scene: class MockScene {},
    },
  };
});

// Phaser モック確立後に対象モジュールをインポートする。
// (vi.mock はホイスティングされるため import より先に解決される)
import { LogTrigger } from '../../../src/entities/LogTrigger';

// --- モックボディファクトリ ---
// Arcade.Body の allowGravity / immovable に対応する最小インターフェース。
function makeMockBody() {
  return {
    allowGravity: true,    // Phaser のデフォルト: 重力 ON
    immovable: false,       // Phaser のデフォルト: 可動
    setAllowGravity(flag: boolean) { this.allowGravity = flag; },
    setImmovable(flag: boolean)    { this.immovable = flag;    },
    setSize() { return this; },
  };
}

// LogTrigger.prototype.configureBody を、モックボディをインジェクトした
// this コンテキストで直接呼び出すヘルパー。
function callConfigureBodyWith(body: ReturnType<typeof makeMockBody>) {
  const ctx = { body } as unknown as LogTrigger;
  LogTrigger.prototype.configureBody.call(ctx);
  return body;
}

// ============================================================
describe('LogTrigger.configureBody()', () => {
  // -------- 基本: 静止オブジェクトへの設定 --------

  it('allowGravity を false に設定する(重力を受けない)', () => {
    const body = callConfigureBodyWith(makeMockBody());
    expect(body.allowGravity).toBe(false);
  });

  it('immovable を true に設定する(他の物体に押されない)', () => {
    const body = callConfigureBodyWith(makeMockBody());
    expect(body.immovable).toBe(true);
  });

  it('allowGravity と immovable を同時に正しく設定する', () => {
    const body = callConfigureBodyWith(makeMockBody());
    expect(body.allowGravity).toBe(false);
    expect(body.immovable).toBe(true);
  });

  // -------- 回帰: グループ追加によるボディ設定上書きからの復元 --------
  // Phaser の Group.add() はグループ既定値(重力 ON・可動)でボディ設定を上書きする。
  // これが今回のバグ(LogTrigger が落下して床をすり抜ける)の原因だった。
  // GameScene.buildLogTriggers() では group.add() 直後に configureBody() を再適用して
  // 静止状態を回復する。このテストはその再適用が正しく機能することを確認する。

  it('グループ追加後に重力 ON・可動に戻されても、configureBody() 再適用で静止状態に戻る', () => {
    const body = makeMockBody();

    // 初回 configureBody() → 静止状態
    callConfigureBodyWith(body);
    expect(body.allowGravity).toBe(false);
    expect(body.immovable).toBe(true);

    // Group.add() による上書きをシミュレート(Phaser のデフォルト値に戻す)
    body.allowGravity = true;
    body.immovable = false;
    expect(body.allowGravity).toBe(true);   // 上書き後は重力 ON
    expect(body.immovable).toBe(false);     // 上書き後は可動

    // configureBody() 再適用 → 静止状態に戻る
    callConfigureBodyWith(body);
    expect(body.allowGravity).toBe(false);  // 重力 OFF に戻った
    expect(body.immovable).toBe(true);      // 不動に戻った
  });

  it('configureBody() を複数回呼んでも常に静止状態になる(冪等性)', () => {
    const body = makeMockBody();
    callConfigureBodyWith(body);
    callConfigureBodyWith(body);
    callConfigureBodyWith(body);
    expect(body.allowGravity).toBe(false);
    expect(body.immovable).toBe(true);
  });
});
