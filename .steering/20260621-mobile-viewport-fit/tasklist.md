# タスクリスト

## 🚨 タスク完全完了の原則
全タスクを `[x]` にするまで作業を継続する。未完了 `[ ]` を残して終了しない。

---

## フェーズ1: 寸法取得の共通化

- [x] `src/systems/viewport.ts` を新規作成し `getViewportSize()`(visualViewport 優先・フォールバック)を実装

## フェーズ2: スケーリングの堅牢化

- [x] `src/systems/dprScaling.ts` を更新
  - [x] `apply()` の寸法ソースを `getViewportSize()` に
  - [x] `visualViewport` の resize/scroll を購読
  - [x] `orientationchange` 時に遅延再適用(即時 + rAF + setTimeout)

## フェーズ3: 縦持ち判定の統一

- [x] `src/scenes/GameScene.ts` の縦持ち判定を `getViewportSize()` ベースに置換

## フェーズ4: テスト

- [x] `tests/unit/systems/viewport.test.ts` を新規作成
  - [x] visualViewport 利用時はその寸法を返す
  - [x] 未対応時は innerWidth/innerHeight にフォールバック
  - [x] 異常値(0)時もフォールバック

## フェーズ5: 品質チェック

- [x] `npm test`(587 passed)
- [x] `npm run lint`(requestAnimationFrame no-undef を window.requestAnimationFrame で解消)
- [x] `npm run typecheck`(クリーン)
- [x] `npm run build`(成功)

## フェーズ6: Playwright 回帰確認

- [x] dev 起動 → モバイル landscape(812×375, 1024×600)で canvas CSS 幅 = ビューポート幅・左右余白0(全幅)を実測。
      リサイズ追従 + visualViewport が寸法ソースとして機能することも確認
- [x] (実機=スマホブラウザの横向き全幅確認はユーザーに依頼)

## フェーズ7: 振り返り

- [x] `retrospective.md` を記録(モード3)
