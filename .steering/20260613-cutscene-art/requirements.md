# 要求定義: カットシーン背景画像の本式化(動的描画フォールバックの卒業)

## 概要

ステージ途中で再生されるカットシーン演出のうち、専用の背景画像を持たず**コードで図形を動的描画(プレースホルダのシルエット)している3スクリプト** — `stage4-intro` / `stage5-intro` / `stage6-ending` — に、既存の `stage1-intro.svg` / `stage3-rescue.svg` と同等品質の **SVG 一枚絵背景** を新規作成し、全カットシーンを画像方式に統一する。

## 背景・目的

- カットシーン(`CutsceneScene`)は背景描画が2方式のハイブリッド:
  1. **画像アセット方式**: `CUTSCENE_BACKGROUND[scriptKey]` にテクスチャがあれば事前ロード済み SVG を cover 配置(`stage1-intro` / `stage3-rescue`)
  2. **動的描画フォールバック**: 未登録時は `drawScene()` が Graphics で楕円・円・格子のシルエットを手続き描画(`stage4-intro` / `stage5-intro` / `stage6-ending`)
- ユーザー(シャビ)の評価: 画像アセットを使う(1)の箇所は満足。(2)の動的描画フォールバックの見栄えが気に入らない。
- `stage6-ending` については `.steering/20260613-stage6-final/` で stage6 本体は実装完了済みだが、その**振り返りで「エンディング背景は現状プレースホルダ。余力があれば専用背景画像で演出を強化できる」と明記された残課題**にあたる。本ステアリングはその残課題の消化を兼ねる。

## 機能要求

### 必須要求(Must)

- [ ] `stage4-intro` 用の背景 SVG を新規作成する(汚染地帯・TERRA同行)
- [ ] `stage5-intro` 用の背景 SVG を新規作成する(ECLIPSE外縁部・緊張)
- [ ] `stage6-ending` 用の背景 SVG を新規作成する(管理の解けた廃墟の外・苦い勝利の希望。1枚絵)
- [ ] 3枚を `public/assets/cutscenes/` に配置する
- [ ] `assetKeys.ts` の `CUTSCENE_TEX` / `CUTSCENE_BACKGROUND` に3キーを登録する
- [ ] `PreloadScene.ts` で3枚を `load.svg`(論理解像度 `GAME_WIDTH`×`GAME_HEIGHT`)でロードする
- [ ] 各カットシーン再生時に動的描画ではなく画像方式の分岐(`textures.exists`)が通ること

### 推奨要求(Should)

- [ ] 既存2枚のアート水準を踏襲する(960×540 viewBox、グラデーション/シルエット/発光/ビネット、`<title>`/`<desc>` 付与)
- [ ] 各ステージの `backgroundColor`(stage4=`#151a0c` 汚染の土気色 / stage5=`#0c1119` 冷たい鋼色 / stage6=`#06080f` 支配中枢の藍)と画調を整合させる
- [ ] スクリプト本文(セリフ/ト書き)が示す情景と絵柄を一致させる

### 任意要求(Could)

- [ ] エンディングは「管理されていない空」の希望を、既存の暗い基調から少し明度を上げて表現する

## 受け入れ基準

- [ ] `stage4-intro` / `stage5-intro` / `stage6-ending` 再生時に専用 SVG 背景が表示され、`drawScene()` のシルエットが使われない
- [ ] 既存の満足箇所(`stage1-intro` / `stage3-rescue`)に退行がない
- [ ] `npm test` / `npm run lint` / `npm run typecheck` / `npm run build` が通る
- [ ] 実機ブラウザ起動でランタイムエラー・ロード失敗(404)が出ない

## 制約条件

- 画像は **SVG** で作る(既存2枚と同形式・`load.svg` で論理解像度ラスタライズ)。
- 演出ロジック(`CutsceneScene` の行送り・テキスト描画)は変更しない。背景方式の登録(アセット+キー)に閉じる。
- `stage6-ending` は**1スクリプト=背景1枚**を維持する(複数枚切替の実装拡張は行わない。ユーザー決定)。
- URL/シークレット等のハードコーディング禁止(アセットは相対パスでロード済みパターンに従う)。

## スコープ外

- カットシーンの新規追加(stage2 等、現状カットシーンを持たない箇所への新設)。
- `CutsceneScene` の演出機構の拡張(行ごとの背景切替、トランジション等)。
- stage6 ゲーム本体の実装(既に `20260613-stage6-final` で完了済み)。
- BGM・SE の追加調整。

## 参照

- 親ステアリング: `.steering/20260613-stage6-final/`(stage6-ending 背景の本式化はこの振り返りの残課題)
- 既存アート: `public/assets/cutscenes/stage1-intro.svg` / `stage3-rescue.svg`
- スクリプト本文: `src/config/story/cutscenes.ts`
