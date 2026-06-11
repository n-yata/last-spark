# 設計書

## アーキテクチャ概要

タッチ環境でのみ、画面下部に固定高さの「コントロール帯(レターボックス)」を設ける。
ゲーム描画(メインカメラの viewport)を帯の上側に縮め、仮想ボタンを帯の中へ移設することで、
「指が乗る領域(帯)」と「ボス・弾幕が見える領域(プレイ領域)」を物理的に分離する。

帯の高さとタッチ判定は単一モジュール `src/config/controlBand.ts` に集約し、
GameScene(カメラ) / UIScene(描画) / InputController(入力判定) が同じ値を共有する。
非タッチ(デスクトップ)では帯高さ 0 となり、従来挙動(フル画面)を完全に維持する。

```
                screen (canvas px, Scale.RESIZE)
 ┌───────────────────────────────────────────┐
 │  GameScene camera viewport                 │  ← height - band
 │   (zoom = (height-band)/GAME_HEIGHT)        │     world全高540を表示
 │            BOSS ▓▓▓  弾幕                    │
 ├───────────────────────────────────────────┤  ← bandTop = height - band
 │ ◀ MOVE ▶            [JUMP] [SHOT]          │  ← control band(touch時のみ)
 └───────────────────────────────────────────┘

 共有値: resolveControlBand(scene) = controlBandHeight(scene.scale.height, isTouchControlEnabled(game))
```

## コンポーネント設計

### 1. `src/config/controlBand.ts`(新規・Phaser最小依存)

**責務**:
- 画面高さ + タッチ有効フラグから帯高さ(px)を算出する純粋関数を提供
- タッチ操作環境かを判定する
- シーンから現在の帯高さを解決するヘルパを提供

**実装の要点**:
- `controlBandHeight(screenHeight, enabled)`: 純粋関数(テスト対象)。非タッチ or 高さ0以下なら 0。
  タッチ時は `screenHeight * RATIO` を `[MIN, MAX]` にクランプ。
- `isTouchControlEnabled(game)`: `game.device.input.touch` を参照(Phaser のデバイス判定)。
- `resolveControlBand(scene)`: 上2つを束ねる薄いヘルパ。
- 定数: `CONTROL_BAND_MIN_PX=112`(半径44ボタン+余白が収まる)、`MAX_PX=168`、`RATIO=0.22`。

### 2. `src/config/touchLayout.ts`(変更)

**責務**:
- 実画面サイズ + 帯高さから仮想ボタン/移動ゾーンのレイアウトを算出

**実装の要点**:
- `createTouchLayout(width, height, bandHeight = 0)` に第3引数を追加。
- `bandHeight <= 0`: **従来の対角配置をそのまま返す**(デスクトップ guide と既存テストの後方互換)。
- `bandHeight > 0`: JUMP/SHOT を帯の縦中央(`y = height - band/2`)に水平並びで配置。
  2 ボタンの中心間距離 > 両半径和(重なり無し)を維持。移動ゾーンは左半分(全高)を維持。

### 3. `src/ui/TouchControls.ts`(変更)

**責務**:
- 仮想ボタン/移動ゾーンの半透明ガイド描画に加え、帯背景を描画

**実装の要点**:
- `render(layout, width, height, bandHeight = 0)` に幅と帯高さを追加。
- `bandHeight > 0` のとき、帯領域(`y = height-band`〜`height`)に背景塗り + 上端アクセント線を描画。
- ボタン/ラベルは `layout` 由来の座標に追従(配置ロジックは touchLayout に一元化)。

### 4. `src/scenes/GameScene.ts`(変更)

**責務**:
- メインカメラの viewport を帯の上に縮め、ズームを viewport 高さ基準に合わせる

**実装の要点**:
- `applyCameraZoom` を `applyCameraLayout` 化: `band = resolveControlBand(this)`、
  `viewH = max(1, scale.height - band)`、`cam.setViewport(0,0,scale.width,viewH)`、
  `zoom = viewH / GAME_HEIGHT`。
- RESIZE ハンドラを差し替え(画面回転/リサイズで帯と viewport を再計算)。
- ボストリガー判定の `cam.displayWidth`(= viewportWidth/zoom)は自動追従。

### 5. `src/scenes/UIScene.ts`(変更)

**責務**:
- 帯高さを解決して TouchControls / レイアウトへ渡す

**実装の要点**:
- `band = resolveControlBand(this)` を毎フレーム算出し、`createTouchLayout(w, h, band)` と
  `touchControls.render(layout, w, h, band)` に反映。ChargeGauge は `layout.shootButton` 追従で自動対応。

### 6. `src/systems/InputController.ts`(変更)

**責務**:
- 入力判定レイアウトを帯基準に一致させる

**実装の要点**:
- コンストラクタ/`refreshLayout` で `createTouchLayout(w, h, resolveControlBand(scene))` を使用。
- 描画(UIScene)と入力(InputController)が同一レイアウトを共有し、当たり位置のズレを防ぐ。

## データフロー

### タッチ端末でのボス戦表示
```
1. RESIZE/起動 → GameScene.applyCameraLayout が band を解決
2. camera viewport を (scale.height - band) に縮小、zoom を viewport 基準に再計算
3. ボス・弾幕はワールド描画 → viewport(帯の上)にのみ描画される
4. UIScene が同じ band でボタンを帯内に配置・描画、InputController も同じ band で当たり判定
5. 右親指は帯上のボタンに乗る → プレイ領域(ボス)を指が隠さない
```

### デスクトップ(非タッチ)
```
1. isTouchControlEnabled=false → band=0
2. viewport=フル画面、zoom=従来通り、ボタンは従来の対角配置(guide のみ)
3. キーボード操作・既存 E2E は一切影響を受けない
```

## エラーハンドリング戦略

- 例外を投げる箇所は無し。防御的に `viewH = max(1, ...)`、`screenHeight<=0` で band=0 を返し、
  ゼロ除算・負ズームを回避する。

## テスト戦略

### ユニットテスト
- `controlBand.test.ts`(新規): 非タッチで0 / タッチ時のクランプ(MIN/MAX/比率) / 高さ0以下で0。
- `touchLayout.test.ts`(追記): band>0 でボタンが帯の縦範囲内・縦中央に来る / 右側(移動ゾーン外)維持 /
  2ボタン非重なり / band 省略時は従来位置(後方互換)。

### 統合テスト(既存の維持確認)
- 既存 E2E(fill-screen / full-playthrough)は非タッチ実行のため band=0 で不変であることを確認。

## 依存ライブラリ

新規追加なし。

## ディレクトリ構造

```
src/config/controlBand.ts        (新規)
src/config/touchLayout.ts        (変更: bandHeight 引数)
src/ui/TouchControls.ts          (変更: 帯背景 + 引数)
src/scenes/GameScene.ts          (変更: camera viewport 縮小)
src/scenes/UIScene.ts            (変更: band 解決と伝播)
src/systems/InputController.ts   (変更: band 基準レイアウト)
tests/unit/config/controlBand.test.ts   (新規)
tests/unit/config/touchLayout.test.ts   (追記)
```

## 実装の順序

1. `controlBand.ts` と単体テスト
2. `touchLayout.ts` に bandHeight 対応 + テスト追記
3. `TouchControls.ts`(帯背景描画)
4. `GameScene.ts`(camera viewport)
5. `UIScene.ts` / `InputController.ts`(band 伝播)
6. テスト・lint・typecheck・build

## セキュリティ考慮事項

- 外部入力・ネットワーク・シークレットを扱わない純粋な描画/レイアウト変更。ハードコードURL等なし。

## パフォーマンス考慮事項

- 帯高さ算出は四則演算のみ。毎フレームの UIScene 再算出も軽量(既存 createTouchLayout と同等)。

## 将来の拡張性

- 帯高さポリシー(固定px/比率/ボタン基準)は `controlBand.ts` の定数で一元調整可能。
- 縦持ち対応や帯内へのボタン増設も、帯高さ算出とレイアウト算出が分離済みのため拡張しやすい。
