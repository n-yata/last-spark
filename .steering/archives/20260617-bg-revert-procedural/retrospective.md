# 振り返り: 画像背景システムの撤去(手続き背景へ全面回帰)

- 作業日: 2026-06-17
- ブランチ: `feature/bg-revert-procedural`

## 何をしたか

stage1 に導入していた painted 画像背景(`STAGE_BG_TEX` / cover-fit + worldView 追従の `drawImageLayer` /
暗幕 `drawDimOverlay` / `dimAlpha`)を**システムごと撤去**し、stage1 を他ステージと同じ手続き背景
(`ruinedCity` シルエット 2 層)へ戻した。

- `src/config/stageBackground.ts`: `BackgroundLayerTheme` の image 系フィールドと `StageBackgroundTheme.dimAlpha`
  を削除。STAGE1_BG を元の 2 層(scrollFactor 0.3/0.55, height 220/300, step 180/140)に復元。
- `src/systems/backgroundPainter.ts`: `drawImageLayer` / `drawDimOverlay` / `DIM_DEPTH` と、レイヤーループ内の
  画像分岐・暗幕分岐を削除。手続きシルエット描画のみに戻した。
- `src/config/assetKeys.ts`: `STAGE_BG_TEX` を削除。
- `src/scenes/PreloadScene.ts`: `STAGE_BG_TEX` import と stage1-bg-far の `load.image` を削除。
- `public/assets/stages/stage1-bg-far.webp` を `git rm`。

## 学び・申し送り

- **プレイ画面の painted 背景はこのゲームに合わなかった**。タイトル/カットシーンの厚塗りリアル画風と、
  プレイ画面の手続き図形(敵/ボス/地形/プレイヤー)が同居すると、背景だけリッチで浮く・赤弾が背景に埋もれる
  といった不整合が出た。暗幕(dimAlpha)で沈める対症療法も「結局合わない」という最終判断に至り全撤去。
  → 既存メモリ [[ingame-art-upgrade-must-be-uniform]] / [[game-bg-cover-fit-not-stretch]] の結論を実地で裏付け。
  プレイ画面のアートは**手続き画風で統一**を維持し、リッチなイラストは**タイトル/カットシーン限定**とする。
- 撤去は段階導入(フォールバック設計)だったため綺麗に外せた。型の任意フィールド・キー定義・ロード・描画分岐を
  順に消すだけで、テスト(stageBackground.test.ts 16件)は無改修で通過。
- カットシーン/タイトルの WebP キービジュアルは**そのまま維持**(これは好評で採用済み)。今回の撤去対象は
  プレイ画面背景のみ。
