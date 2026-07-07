# 設計書

## アーキテクチャ概要

寸法取得を純粋関数に切り出し(`systems/viewport.ts`)、`dprScaling.ts`(canvas リサイズ)と
`GameScene`(縦持ち判定)の両方をそれ経由に統一する。新規アーキテクチャは導入しない。

## コンポーネント設計

### 1. `src/systems/viewport.ts`(新規)

**責務**: 実ビューポート寸法(CSS px)を返す純粋関数。

```ts
export interface ViewportSize { width: number; height: number; }
export function getViewportSize(): ViewportSize;
```
- `window.visualViewport` が利用可能で width/height が正なら、その値を返す
  (回転・ツールバー変化後の実可視サイズを正確に反映)。
- 未対応・異常値時は `window.innerWidth/innerHeight` にフォールバック。
- `user-scalable=no`(index.html)によりピンチズーム scale=1 固定のため、
  visualViewport.width はレイアウト幅と一致し安定。

### 2. `src/systems/dprScaling.ts`(変更)

- `apply()`: 寸法を `getViewportSize()` から取得し `game.scale.resize(width*dpr, height*dpr)`。
- イベント購読を強化:
  - 既存: window `resize` / `orientationchange`、READY 初回。
  - 追加: `window.visualViewport?.addEventListener('resize'|'scroll', apply)`
    (回転・ツールバー確定後に正しい寸法で発火する信頼できる信号)。
  - `orientationchange` は寸法未確定なことがあるため、`apply()` 即時 + `requestAnimationFrame(apply)`
    + `setTimeout(apply, 250)` の遅延再適用で確定値を取り直す。
- canvas.style は従来どおり ScaleManager に委ね手動変更しない(canvasBounds/displayScale/pointer 整合維持)。

### 3. `src/scenes/GameScene.ts`(変更)

- `setupOrientationHandling` の `window.innerHeight > window.innerWidth` を
  `getViewportSize()` ベースに置換し、回転直後の誤判定を防ぐ。

## データフロー
```
回転/ツールバー変化
  → visualViewport 'resize'(確定寸法) / orientationchange(遅延再適用)
  → dprScaling.apply(): getViewportSize() → scale.resize(w*dpr,h*dpr), zoom=1/dpr
  → canvas CSS 表示 = w×h(画面いっぱい)、RESIZE イベントで各シーン再レイアウト
```

## テスト戦略

### ユニットテスト(`tests/unit/systems/viewport.test.ts` 新規)
- visualViewport 利用可能時はその width/height を返す。
- visualViewport 未対応時は innerWidth/innerHeight にフォールバック。
- visualViewport が異常値(0 等)のときもフォールバックする。

### 実機/Playwright 確認
- Playwright: dev 起動 → ビューポートをモバイル landscape にリサイズ →
  canvas の CSS 幅がビューポート幅に一致(全幅)することを実測。visualViewport 経路の動作確認。
- モバイルブラウザ固有の stale 挙動は headless で再現不可 → 実機確認はユーザーに委ねる。

## セキュリティ/パフォーマンス
- 入力・永続化・ネットワーク非接触。`visualViewport`/`window` 寸法を読むのみ。
- リスナー追加は app ライフサイクル全体(game は単一インスタンス)なので解放不要だが、
  既存方針(window resize/orientationchange も解放していない)と整合。
