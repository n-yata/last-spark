# 実装後の振り返り

## 作業概要

スマホのブラウザ(タブ)で横向きにしても canvas が画面幅いっぱいにならず左右に黒帯が出る不具合を修正。
原因は `dprScaling.ts` が `window.innerWidth/innerHeight` を読むこと。モバイルブラウザでは
`orientationchange` 時にこれが回転前(縦向き)の値を返し、横向きでも canvas を縦向き幅で作っていた。
実ビューポート寸法取得を `visualViewport` 優先の純粋関数 `getViewportSize()`(`systems/viewport.ts`)へ
切り出し、`dprScaling` の寸法ソース + イベント購読(visualViewport resize/scroll、orientationchange の
遅延再適用)を堅牢化。`GameScene` の縦持ち判定も同じソースに統一した。

## 実装完了日
2026-06-21

## 計画と実績の差分

**計画と異なった点**:
- lint で `requestAnimationFrame is not defined`(no-undef)。bare 参照ではなく `window.requestAnimationFrame`
  を使うことで解消(`window.setTimeout` と統一)。ESLint env の都合で、ブラウザのタイマー/rAF は
  `window.` 経由で参照するのが本プロジェクトの安全側。

**技術的理由でスキップしたタスク**: なし(全タスク `[x]`)。

## 学んだこと

**技術的な学び**:
- **モバイルブラウザの `window.innerWidth/innerHeight` は orientationchange 時に stale**(回転前の値)。
  PWA standalone では安定するため「PWAは正常・ブラウザだけ不具合」という切り分けが原因特定の鍵になった。
  実ビューポートは `visualViewport`(回転・ツールバー確定後に正しい値で resize 発火)を優先するのが堅牢。
- **「PWAでは正常・ブラウザで不具合」は viewport/表示モード差を疑う定石**。display:standalone と
  ブラウザタブ(動的ツールバー・回転挙動)の差が出る箇所(寸法取得・100vh 系)を最初に見る。
- 寸法取得を純粋関数に切り出すと、Phaser/DOM 副作用配線(dprScaling)と分離して単体テストできる
  (visualViewport 優先・未対応フォールバック・異常値フォールバックを検証)。
- **この種のモバイル特有バグは headless/PC では再現できない**。Playwright では「正しい寸法→全幅・
  左右余白0・リサイズ追従・visualViewport が読める」までを回帰として固め、回転直後の stale 回復の
  最終確認は実機(スマホブラウザ)でユーザーに委ねた。検証範囲を正直に線引きするのが大事。

## 次回への改善提案
- 画面サイズに依存する処理は最初から `getViewportSize()` のような共通ソースに集約し、
  `window.innerWidth` 直読みを散らさない(今回 GameScene にも直読みが残っていた)。
- ブラウザのグローバル(requestAnimationFrame 等)は `window.` 経由で参照し no-undef を避ける。
