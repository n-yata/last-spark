# 振り返り: プレイ画面ポストFX導入 (2026-06-15)

## 何をやったか
カットシーンとプレイ画面の質感差を縮める第一歩として、GameScene本体カメラにポストFX
(色調補正/ブルーム/ビネット)を追加。PR #81 マージ済み。背景の画像レイヤー化は design.md に
設計を残し未着手(アート生成待ち)。

## 学び・申し送り

### Phaser カメラ postFX の検証の罠（重要）
- `camera.postFX.addColorMatrix()/addBloom()/addVignette()` は Phaser 3.90 で**実在し描画も効く**。
  バルベルデは「addVignetteは無い」と言ったが**誤り**(tscビルドが通り、実機で描画反映を確認)。
- ただし `camera.postFX.list.length` と `.enabled` は **追加後も 0/false のまま**で、内省は当てにならない
  (3.90は別の場所に保持しているらしい)。**効いているかは目視で確認する**のが正解。検証手段:
  `cam.postFX.addColorMatrix().negative()` を当てて**画面が反転すれば効いている**。
- HUD/ストーリーテキストは **UISceneが別カメラ**なので、GameSceneカメラFXの影響を受けない
  (反転テストでHUDが反転しないことを確認)。バルベルデの読みどおりで、これが現アーキの強み。
- bloom はモバイル負荷が高いので `graphicsQuality.ts` で**生DPR>2の端末はbloom OFF**(cappedDprは
  2上限なので判定には生の`window.devicePixelRatio`を使う)。WebGL以外はFX全無効。

### Playwright で gameplay を出す小技
- `window.lastSpark` でゲーム公開済み。`scene.start('GameScene', {stageId, skipCutscene:true})` で
  イントロ演出を飛ばして gameplay 直行できる(init が skipCutscene を受ける)。

## 残課題
- ★1 背景の画像レイヤー化(design.md 参照)。アート2枚×6ステージの生成待ち。
- 既知の微トレードオフ: 開始テキスト等 GameScene 上のテキストにも軽い色調補正/ブルームが乗る
  (HUDは安全)。気になればbloom強度を下げる。
