# 要求内容

## 概要

スマホのブラウザ(モバイルブラウザのタブ)で、横向きにしても canvas が画面幅いっぱいにならず
左右に黒帯・余白が出る不具合を修正する。PWA(ホーム追加=standalone)では正常。

## 背景

`systems/dprScaling.ts` は Scale.NONE 自前制御で、`window.innerWidth/innerHeight` を読んで
canvas を画面いっぱいにリサイズしている。モバイルブラウザでは `orientationchange` 発火時点で
`window.innerWidth/innerHeight` が回転完了前(縦向き)の値を返すことがあり、横向きでも canvas 幅が
縦向き時の幅(小さい)のまま作られ、左右に黒帯が出る。PWA standalone はツールバーの出入りや
回転挙動が安定しているため顕在化しない。

## 実装対象の機能

### 1. 実ビューポート寸法の正確な取得
- `window.innerWidth/innerHeight` の代わりに、可視ビューポートを正確に返す `visualViewport` を
  優先して使う(未対応環境は innerWidth/innerHeight にフォールバック)。

### 2. 回転・ツールバー変化への確実な追従
- `visualViewport` の resize/scroll を購読し、回転やツールバー出入りの確定後の寸法で再適用する。
- `orientationchange` 時は寸法が未確定なことがあるため、確定後にも測り直す(遅延再適用)。

### 3. 縦持ち判定の寸法ソース統一
- `GameScene` の縦持ち判定も同じ寸法ソース(visualViewport 優先)に統一し、回転直後の誤判定を防ぐ。

## 受け入れ条件

- [ ] スマホのブラウザで横向きにしたとき、canvas が画面幅いっぱいに表示される(左右黒帯が出ない)。
- [ ] PWA(standalone)での既存の正常表示が維持される。
- [ ] 寸法取得が visualViewport 優先・フォールバック付きで、単体テストで検証される。
- [ ] タッチ操作の座標整合(canvas 表示とポインタ判定の一致)が崩れない。
- [ ] 既存 + 追加テストが通り、lint/typecheck/build が成功する。

## スコープ外

- ワールドの見え方(カメラズーム)・UIレイアウトの変更。
- PWA manifest / display モードの変更。

## 検証の制約(重要)

- モバイルブラウザ固有の「回転直後の stale 寸法」は headless / PC では再現できない。
  Playwright + 単体テストで「正しい寸法が来れば全幅になる/visualViewport 経路が効く/フォールバック」を
  担保し、**最終的な実機(スマホブラウザ)での横向き全幅表示はユーザー確認に委ねる**。

## 参照ドキュメント
- `docs/architecture.md`
