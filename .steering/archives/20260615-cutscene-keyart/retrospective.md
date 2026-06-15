# 振り返り: カットシーン背景キービジュアル化 (2026-06-15)

## 何をやったか
カットシーン5枚の背景を、図形ベースSVGプレースホルダ → 外部AI生成キービジュアル(WebP)に差し替え。PR #80 マージ済み。stage6-ending のみ生成制限で未対応(SVG据え置き)。

## 学び・申し送り

### AI画像の子ども描写フィルタ（重要）
- ChatGPT画像生成は「実写寄りの子どもの顔」を安全フィルタでブロックする。TERRA(幼い少女)を含む場面で発生。
- 回避＝**厚塗り・非写実の絵画タッチで描く**。これはタイトルとの画風統一にもなる一石二鳥。アニメ化はNG(画風が浮く)。年齢の数字は書かない。
- それでも stage6-ending(子ども＋戦闘後)は弾かれた。未生成のまま → [[stage6-ending-art-pending]]。

### 共有.gitハザードが再発（メモリ的中）
- worktree作成後、並行セッション(story-redesign)がmasterにマージ→共有 .git の master ref が背後で前進(e668eac→3f0fb15)。`git status`はクリーンなのに`git diff master`に無関係なstory差分が出て気づいた。
- 対処: 慌てず ref を確認(`rev-parse HEAD/master`, `merge-base`)→両者が編集したファイルが無いことを確認→自分の変更をコミット→`git merge master`(コンフリクト無し)→再フル検証→PR。CLAUDE.md手順「最新masterを取り込んでから」が効いた。
- 教訓: 長めの作業では PR前に必ず master の前進有無を確認する。

### sharp-cliの落とし穴(Windows/PS)
- 複数ファイル指定(`-i a b c` / `-i *.png`)は「No input files」で失敗。1枚ずつforeachループで変換すること。

### Playwright検証
- `window.lastSpark` でゲーム公開済み。CutsceneSceneは別シーンから`scene.start('CutsceneScene',{scriptKey})`でforce-jump可。**同一シーンをstop→startで再起動すると黒画面**になる(競合)。確認は毎回リロードしてクリーン起動する。

## 残課題
- stage6-ending のキービジュアル生成＆差し替え(シャビの生成待ち)。
