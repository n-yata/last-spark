# 要求内容

## 概要

即席の text ベタ書きボタンを廃止し、パネル背景・押下フィードバック・ネオングロー付きの
共通ボタン部品(NeonButton)を新設して、メニュー系の全シーン(Title / GameOver / Clear /
Pause(Options) / StageSelect)に適用する。

## 背景

現状、ボタン実装が3系統に分裂している:

1. `src/ui/menuButton.ts` の `makeMenuButton` — テキストのみ・hover色変化のみ(optionsMenu / stageSelect が使用)
2. `GameOverScene.makeButton` — シーン内の即席実装(hover時 scale 1.1)
3. `TitleScene` の「⚙ OPTIONS」 — ベタ書き text + hover色変化

いずれも「テキストの色が変わるだけ」で、どこが押せるのか・押せたのかが視覚的に弱い。
特にモバイル(本作の主対象)は hover が存在しないため、押下フィードバックの不在が
そのまま操作感の悪さになる。また実装が分裂しているため、今後の UI 追加のたびに
見た目のばらつきが再生産される。

## 実装対象の機能

### 1. 共通ボタン部品 NeonButton(`src/ui/neonButton.ts`)

- パネル型(既定): 角丸の半透明ダークパネル + ネオン色のグロー枠 + ラベル
- ゴースト型(variant: 'ghost'): パネルなしのテキストボタン(音量の ◂ ▸ や小さな BACK 用)。
  現行 makeMenuButton 相当の見た目に押下フィードバックを追加したもの
- 押下フィードバック: POINTER_DOWN で即座にアクション発火(現行の応答性を維持)しつつ、
  沈み込み(scale)+ 枠の発光フラッシュの短い tween を再生
- hover(PC): 枠・ラベルの増光。pointerout で復帰
- variant: 'primary'(主導線・黄系) / 'default'(青緑系) / 'danger'(破壊的操作・赤系) / 'ghost'
- 幅はラベル幅 + パディングから自動算出し、`minWidth` で下限指定可(縦並びメニューの幅を揃える)
- 絶対px・fontSize はすべて `scaled()` / `scaledFontPx()` 経由(高DPI規約)
- 効果音は従来どおり呼び出し側が鳴らす(二重再生防止の既存方針を踏襲)

### 2. 既存シーンへの適用(即席実装の廃止)

- `optionsMenu.ts` / `stageSelect` の `makeMenuButton` 呼び出しを NeonButton に置換
  (メニュー項目=パネル型、◂ ▸・BACK=ゴースト型)。`menuButton.ts` は削除
- `GameOverScene` の `makeButton` を削除し、RETRY(primary)/ TITLE(default)をパネル型に置換
- `ClearScene` の周回2択(次の周回へ進む / タイトルへ戻る)をパネル型ボタンに置換
  (モバイル誤操作対策のタップ領域の広さは minWidth / パディングで維持)
- `TitleScene` の「⚙ OPTIONS」をゴースト型(または小型パネル型)に置換

## 受け入れ条件

### NeonButton 部品
- [ ] パネル型・ゴースト型・variant(primary/default/danger)が仕様どおり描画される
- [ ] POINTER_DOWN で即座に onClick が発火する(遅延なし=現行の応答性を維持)
- [ ] 押下時に沈み込み+発光のフィードバックが再生される
- [ ] サイズ計算(パディング・minWidth)が純関数として分離され、ユニットテストで検証される
- [ ] 絶対px・fontSize が scaled()/scaledFontPx() を経由している(dpr=1/2 両方で崩れない)

### 既存シーンへの適用
- [ ] Title / GameOver / Clear / Options(Pause・Title 双方) / StageSelect の全ボタンが共通部品になる
- [ ] `menuButton.ts` と `GameOverScene.makeButton` が削除され、即席実装が残らない
- [ ] 既存の e2e(options / play-through の緑分 / orientation)が引き続き通る
- [ ] Playwright スクリーンショットで主要画面(Title / Options / GameOver / Clear)の見た目を確認する
- [ ] クリック・タップの当たり判定が表示と一致する(既存 e2e の実クリック経路で担保)

## 成功指標

- ボタン実装が 1 系統に統一され、メニュー系シーンに即席ボタン実装が存在しない
- モバイルで「押せる場所」「押せたこと」が視覚的に判別できる

## スコープ外

以下はこのフェーズでは実装しません:

- プレイ中 HUD(PauseButton / MovePad / TouchControls / LifeBar / ChargeGauge / BossHpBar)の変更
  (プレイ中 HUD は操作系と密結合のため別作業とする)
- TitleScene のロゴ・背景演出の強化(別候補「タイトル画面の格上げ」として温存)
- ClearScene のリザルト演出強化(別候補「リザルト画面のリッチ化」として温存)
- ステージセレクトのカード自体のデザイン変更(PR#116 で刷新済み)

## 参照ドキュメント

- `docs/functional-design.md` - 機能設計書(UI/シーン構成)
- `docs/development-guidelines.md` - 開発ガイドライン
- `.steering/20260702-fix-dpr1-canvas-style/retrospective.md` - 高DPI検証の申し送り(dpr=1/2 両方で確認)
