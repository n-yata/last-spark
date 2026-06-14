# タスクリスト: カットシーン背景画像の本式化

## 概要

`stage4-intro` / `stage5-intro` / `stage6-ending` の3カットシーンに専用 SVG 背景を新規作成し、動的描画フォールバックから画像方式へ統一する。演出ロジックは変更せず、アート作成・キー登録・プリロードの3点に閉じる。

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること。未完了タスク(`[ ]`)を残したまま終了しない。**

---

## フェーズ1: 現状確認(着手前)

- [x] `src/config/assetKeys.ts` を読み、`CUTSCENE_TEX` / `CUTSCENE_BACKGROUND` の現行定義を把握
- [x] `src/scenes/PreloadScene.ts` を読み、既存 `load.svg`(stage1/stage3)の書き方を把握(GAME_WIDTH/HEIGHT は `../config/dimensions` から、SVG ロードは preload() 内)
- [x] `src/config/story/cutscenes.ts` の `stage4-intro` / `stage5-intro` / `stage6-ending` 本文を再確認し、絵柄に反映する情景を確定
- [x] 既存 `stage1-intro.svg` / `stage3-rescue.svg` の表現(キャラ・発光・ビネット)を参照

## フェーズ2: SVG アート作成

- [x] `public/assets/cutscenes/stage4-intro.svg`(汚染地帯・TERRA同行。土気色 `#151a0c` 基調・毒霧・口元を押さえる TERRA)
  - [x] `<title>`/`<desc>` を付与し情景を記述
  - [x] RAY(シアン発光)と TERRA を配置
- [x] `public/assets/cutscenes/stage5-intro.svg`(ECLIPSE外縁部。鋼色 `#0c1119` 基調・機械構造・遠景に ECLIPSE の影/眼・身を寄せる TERRA)
  - [x] `<title>`/`<desc>` を付与し情景を記述
- [x] `public/assets/cutscenes/stage6-ending.svg`(管理の解けた廃墟の外・1枚絵。藍 `#06080f` から夜明けへ微かな明度上げ・争いの痕跡・人間のシルエット・空を見上げる RAY と TERRA)
  - [x] `<title>`/`<desc>` を付与し情景を記述

## フェーズ3: 登録とプリロード

- [x] `src/config/assetKeys.ts` の `CUTSCENE_TEX` に `stage4Intro` / `stage5Intro` / `stage6Ending` を追加
- [x] `src/config/assetKeys.ts` の `CUTSCENE_BACKGROUND` に `stage4-intro` / `stage5-intro` / `stage6-ending` のマッピングを追加
- [x] `src/scenes/PreloadScene.ts` に3枚の `load.svg`(論理解像度)を追加

## フェーズ4: テスト

- [x] `CUTSCENE_BACKGROUND` に3キーが登録されていることを検証するユニットテストを追加/拡張(`tests/unit/config/cutscenes.test.ts`。全カットシーンが画像背景を持つ検証へ拡張 + 3キー一致検証を追加)
- [x] `npm test`(369 passed / 32 files。cutscenes は15テスト)
- [x] `npm run lint`(クリーン)
- [x] `npm run typecheck`(クリーン)
- [x] `npm run build`(成功。チャンクサイズ警告は Phaser 由来の既存事項)

## フェーズ5: 実機確認

- [x] ロード404がないことを確認(dev サーバ http://localhost:5174 に対し新規3枚の SVG URL を直接検証 → いずれも `200 / image/svg+xml`。アプリ本体 HTML も 200)
- [x] SVG の描画妥当性を確認(3枚とも Launch プレビューパネルで正しく描画。`PreloadScene` のロードパスと配信パスが一致)
  - 注: Phaser canvas の自動操作制約(親 `20260613-stage6-final` 振り返りに記載)のため、ゲームを各カットシーンまで自動操作しての通し目視は未実施。起動・アセットロード・SVG描画妥当性の確認に留める。リリース前の人手目視チェックリスト対象。

## フェーズ6: 仕上げ

- [x] クルトワ(security-engineer)によるセキュリティレビュー(ハードコーディング観点含む)→ 深刻度 None。SVGに script/イベントハンドラ/外部参照なし、ハードコード(URL/シークレット/AWS情報)なし、ロードパスは既存準拠でトラバーサル懸念なし。※コミット直前に最終差分で再レビューを行う。
- [x] 親ステアリング `20260613-stage6-final` 振り返りの該当残課題(エンディング背景の本式化)が解消された旨を追記(下記「親ステアリングとの紐付け」)
- [x] 実装後の振り返りを記録

## フェーズ7: シャビのレビュー反映

- [x] stage6-ending の人物表現の描き直し(シャビ指摘「人物が少しグロめ」)
  - [x] 施設の人々: 黒ベタののっぺらぼう人影 → 大人＋子ども＋奥の人影の組に変更。暖色寄りの色味＋夜明けの逆光で縁取り、なだらかな体形でホラー感を排除
  - [x] TERRA の後ろ姿: 不自然だったつなぐ腕をなめらかな自然形に、歪んでいた後ろ髪を整ったボブ＋低い毛束に描き直し
  - [x] RAY・背景(空/廃墟/夜明け/バリケード)は変更なし(シャビ「それ以外はOK」)
  - [x] SVG 整形式検証(XML パース成功: rect24/path29/circle22)+ 危険要素(script/href/外部参照)混入なしを自己スキャンで確認

---

## 親ステアリングとの紐付け

`20260613-stage6-final` の振り返り「次回への改善提案」に残されていた次の課題を、本ステアリングで解消した:

> エンディングの「人間の直接描写」は現状プレースホルダ(ト書き＋シルエット背景)。余力があれば専用の背景画像(`CUTSCENE_BACKGROUND` に 'stage6-ending' を登録)で演出を強化できる。

→ `public/assets/cutscenes/stage6-ending.svg` を新規作成し `CUTSCENE_BACKGROUND['stage6-ending']` に登録。動的描画フォールバックから画像方式へ移行済み。あわせて stage4-intro / stage5-intro も同様に本式化し、全カットシーンを画像背景に統一した。

## 実装後の振り返り

### 実装完了日
2026-06-13

### 計画と実績の差分
- **設計どおり影響最小で完結**: `CutsceneScene` の演出ロジックは一切変更せず、SVG 3枚の追加 + `assetKeys.ts` のキー登録 + `PreloadScene.ts` のロード追加のみ。既存の `textures.exists` 分岐がそのまま画像方式へ切り替わった。
- **テストは新規ファイルでなく既存拡張で対応**: `cutscenes.test.ts` に既に stage4/5/6 の本文テストが存在していたため、背景テクスチャ検証(従来 stage1/stage3 のみ)を「全カットシーンが画像背景を持つ」検証へ拡張し、3キー一致検証を追加した。
- **worktree に node_modules が無く `npm install` を要した**(worktree 作成直後の初回のみ)。
- **シャビのレビューで stage6-ending の人物を描き直した**(フェーズ7)。初版は施設の人間を黒ベタの人型シルエットにしたが「少しグロめ」との指摘。大人＋子どもの組＋逆光の縁取りで温かく、TERRA の後ろ姿も自然形に修正した。stage4/5 と背景・RAY は承認済み。

### 学んだこと
- `CutsceneScene` の「背景キーがあれば画像、なければ動的描画」という分岐設計のおかげで、演出の見栄え強化が「アセット+登録」だけで完結する。演出ロジックに触れずに済むため退行リスクが極めて低い。
- Phaser canvas はブラウザ自動操作(Playwright)でゲーム内まで駆動しづらい。代替として「dev サーバへ SVG URL を直接 HTTP 検証(404 検出)」+「Launch プレビューでの SVG 描画妥当性確認」で、アセットロードの健全性を確定的に担保できた。
- **人物シルエットは「黒ベタ＋のっぺらぼう」だとホラー的に見える**。逆光の縁取り・自然なプロポーション・複数人の組(家族的構成)にすると、同じ暗い画調でも希望のトーンに変わる。情緒を左右する要素は人手レビューで早期に拾うのが効く。
- 手書き SVG は色値のタイプミス(`#10friendly` 等の不正 hex)が混入しやすい。lint/typecheck/build + HTTP 配信確認 + XML パース検証の多段で健全性を担保した。

### 次回への改善提案
- リリース前の人手目視チェックリストに「stage4/5/6 カットシーンの背景が物語のトーン(汚染の淀み/冷たい緊張/苦い夜明け)に合っているか」「人物表現が不気味でないか」を追加する。
- 既存 stage1/stage3 を含め、SVG の構文妥当性(XML パース)を CI で軽くチェックできると、手書き SVG のタイプミスを早期検出できる。

## 関連ドキュメント

- 親ステアリング: `.steering/20260613-stage6-final/`(エンディング背景の本式化はこの振り返りの残課題)
- `src/scenes/CutsceneScene.ts`(背景描画の分岐。変更しない)
- `src/config/story/cutscenes.ts`(スクリプト本文)
- 既存アート: `public/assets/cutscenes/stage1-intro.svg` / `stage3-rescue.svg`
