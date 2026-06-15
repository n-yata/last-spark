# プレイ画面ビジュアルアップグレード 設計（バルベルデ案）

カットシーン(厚塗りキービジュアル)とプレイ画面の質感差を、**挙動を一切壊さず**縮める。
スコープは ★1 パララックス背景の画像化 ＋ ★2 ポストFX の2点。キャラ/敵/ボスのスプライト刷新は対象外(将来)。

## 進捗
- ✅ **★2 ポストFX: 完了**（PR #81 / merge `280e952`）。`config/graphicsQuality.ts` + `GameScene.applyPostFx()`。
- ⬜ **★1 背景の画像レイヤー化: 未着手**（本ドキュメントの主対象。アート生成待ち）。

## ★1 背景画像レイヤー化の設計（既存システムを拡張する方針）

**ゼロから作らない。** 既に手続きパララックス基盤がある:
- `src/config/stageBackground.ts`: 6ステージ分のテーマ(空グラデ + 2層シルエット, scrollFactor, seed)。Phaser非依存の純データ+純関数。
- `src/systems/backgroundPainter.ts`: 上記を入力に Graphics で全幅描画。`drawLayer` が shape 別に分岐。depth は SKY=-30 / LAYER_BASE=-20。
- `src/scenes/GameScene.ts` `buildBackground()` が `paintStageBackground(this, theme, stage.width, STAGE.groundY)` を呼ぶ。
- カメラ: `Scale.NONE` + `applyCameraLayout()` で `setZoom(height/540)`。背景は全幅[0,stage.width]に敷くのでカメラ追従・ボス戦bounds縮約・RESIZEに自動追随(create で1度生成でOK)。

### 変更案
1. **`BackgroundLayerTheme` を拡張**(optional 追加=後方互換):
   `imageKey?: string` / `imageMode?: 'tile' | 'stretch'` / `imageTop?: number` / `imageHeight?: number`
2. **`drawLayer` に画像分岐を追加**: `layer.imageKey && scene.textures.exists(layer.imageKey)` なら
   - `'tile'`(遠景): `scene.add.tileSprite(0, top, stage.width, h, key).setOrigin(0,0)`
   - `'stretch'`(中景): `scene.add.image(...).setDisplaySize(stage.width, h)`
   - depth は既存規約(`LAYER_DEPTH_BASE+i`)、`setScrollFactor(layer.scrollFactor)`
   - 未ロードなら既存の手続き shape へ**フォールバック**(CutsceneScene の textures.exists 分岐と同哲学=段階導入で壊れない)
3. **`assetKeys.ts`** に `STAGE_BG_TEX`(stage1〜6 × far/mid)を追加(TITLE_TEX/CUTSCENE_TEX と同様)。
4. **`PreloadScene.preload`** に背景WebPの `load.image` を追加(段階的)。
5. 各ステージの `STAGE{N}_BG.layers` に画像レイヤーを追記(空グラデ・手続きは温存)。

### アセット仕様(ユーザーが生成 → こちらでWebP化)
1ステージ2枚。WebP化は `ai-image-to-game-webp-pipeline`(npx sharp-cli, 1枚ずつループ)。
| レイヤー | 役割 | mode | 推奨サイズ | scrollFactor |
|--|--|--|--|--|
| far(遠景) | 空・遠い稜線・霞んだ構造体。左右シームレス(横ループ前提) | tile | 1920×540 | 0.2〜0.3 |
| mid(中景) | ステージ主役のシルエット群。下端=地平線で接地 | stretch | 2560×540 | 0.45〜0.6 |
命名: `stage{N}-bg-far.webp` / `stage{N}-bg-mid.webp` → `public/assets/stages/`。各200KB以下目安。
トーン: 各ステージの既存テーマ色(`stageBackground.ts`)に準拠(暗め基調＋発光アクセント / story.md)。

### 不変条件(壊してはいけない)
- 当たり判定/物理/カメラbounds/ボストリガー(複数アスペクト比で検証=`boss-trigger-aspect-ratio-gotcha`)。
- 高DPI規約: 背景は実寸基準cover(`scaled()`不要が正)。
- テスト: `BackgroundLayerTheme` 拡張は optional 追加のみ＝既存テスト不変。

### タスク順
stage1 で縦切り検証(生成→preload→テーマ追記→実機/Playwright確認) → stage2〜6 横展開 → 通しで性能確認。
