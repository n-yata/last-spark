# 設計書

## アーキテクチャ概要

本機能は新規ロジックを追加せず、**既存の背景定義データ(色値)と静止画アセット(SVG)を調整する**変更に限定する。描画パイプラインの構造は不変。

```
[プレイ背景]
 stageBackground.ts(色データ) ──→ backgroundPainter.ts(手続き描画) ──→ GameScene
   ▲ 本変更で色を明度UP                  ▲ 不変                        ▲ camera bg色は stage1.ts
 stage1.ts StageData.backgroundColor ───────────────────────────────────┘(stage4/5/6)

[カットシーン背景]
 public/assets/cutscenes/*.svg ──→ PreloadScene(load.svg) ──→ CutsceneScene(cover配置)
   ▲ 本変更でSVG内の色を明度UP        ▲ 不変                    ▲ 不変
```

設計の核: stage1 が「ちょうどいい」のは、**空(skyTop/skyBottom)がシルエット色より十分明るく、コントラストが付いている**ため。stage2-6 は空・シルエットの双方が暗部に沈み、コントラストが消えて「何も見えない」状態。よって**空を中心に明度を引き上げ、シルエットは空より暗いが暗黒ではない水準へ持ち上げて、層・装飾(窓灯/監視灯/スリット光)が判別できるようにする**。色相(各ステージの世界観)は維持する。

## コンポーネント設計

### 1. ステージ背景テーマ (`src/config/stageBackground.ts`)

**責務**:
- stage2〜6 の `skyTop` / `skyBottom` / `layers[].color` を、stage1 相当の視認性まで明度UPする。
- 各ステージの色相(stage2=シアン / stage3=白青 / stage4=毒緑 / stage5=青 / stage6=暗藍+赤)を維持する。

**実装の要点**:
- 既存の「奥(layers[0])は手前(layers[1])より明るい」明暗関係を保つ(手前ほど暗いシルエット)。
- `skyBottom`(地平線側)を最も明るくし、シルエットが地平線に対して輪郭として読めるようにする。
- stage6 は全ステージ中で最も暗いトーンを保ちつつ(影の核の威圧)、地形・シルエットが判別できる最低限まで持ち上げる。
- `accent`(発光色)は色相を変えず、必要時のみ微調整(原則据え置き)。
- skyTop は6ステージで相互に異なる値を維持する(テスト `stageBackground.test.ts` の不変条件)。

### 2. カメラ背景色 (`src/config/stage1.ts` の `StageData.backgroundColor`)

**責務**:
- stage4/5/6 のカメラ背景色を、背景テーマの明度UPと段差が出ないよう併せて持ち上げる。

**実装の要点**:
- 地平線下・画面端の保険色なので、背景テーマの暗部レイヤー色と近い明度帯に合わせる(暗すぎて浮かない)。

### 3. カットシーン背景画像 (`public/assets/cutscenes/*.svg` 全5枚)

**責務**:
- stage1-intro / stage3-rescue / stage4-intro / stage5-intro / stage6-ending の絵全体を明るくし、描かれた場面を判別可能にする。

**実装の要点**:
- 各SVGは手描きの多層(空グラデーション + シルエット + キャラ + ビネット)構造。最終段の**ビネット(四隅を沈める暗い矩形)の不透明度を下げる**ことと、**空グラデーション/シルエットの主要色を明度UP**することで、絵を壊さずに視認性を回復する。
- 画面上部に出る字幕(CutsceneScene 側で描画)の可読性を維持する。上部のビネット明部が字幕とぶつかる場合は、上部ビネットを過度に明るくしすぎない。
- SVGとして正しくロード・描画されること(タグ構造を壊さない、有効な色値)。

## データフロー

### プレイ背景の描画(変更なし・色のみ差し替え)
```
1. GameScene が getStageBackground(stageId) でテーマ(色データ)を取得
2. paintStageBackground が skyTop→skyBottom をバンド補間して空を描画
3. 各 layer.color でシルエット + 装飾(窓灯/監視灯/光)を描画
※ 本変更は 1 の色データを差し替えるのみ。2-3 のロジックは不変。
```

### カットシーン背景の描画(変更なし・SVGのみ差し替え)
```
1. PreloadScene が load.svg で *.svg をテクスチャ化
2. CutsceneScene.drawBackground が cover 配置
※ 本変更は SVG ファイルの内容(色)を差し替えるのみ。ロジックは不変。
```

## エラーハンドリング戦略

新規のエラー経路はない。SVG編集はタグ構造・色値の妥当性を保ち、`load.svg` が失敗しないことを担保する(壊れたSVGはロード失敗→フォールバックのシルエット演出になるため、構造破壊を避ける)。

## テスト戦略

### ユニットテスト
- 既存 `tests/unit/config/stageBackground.test.ts` が通ること。色固定値は検証していない(hex形式 / skyTop相互差異 / shape・seed差異のみ)ため、色変更で期待値修正は原則不要。skyTop の相互差異を保つことだけ守る。

### 統合テスト(目視)
- stage2〜6 を表示し、stage1 と同等に地形・シルエット・空が判別できること。
- カットシーン5枚を再生し、場面が判別でき、字幕が読めること。
- ※ 明度は定性評価のため、最終確認はシャビの目視で合格判定する。

## 依存ライブラリ

新規追加なし。

## ディレクトリ構造

```
変更ファイル:
  src/config/stageBackground.ts        # stage2-6 の色を明度UP
  src/config/stage1.ts                 # stage4/5/6 の backgroundColor 調整
  public/assets/cutscenes/stage1-intro.svg
  public/assets/cutscenes/stage3-rescue.svg
  public/assets/cutscenes/stage4-intro.svg
  public/assets/cutscenes/stage5-intro.svg
  public/assets/cutscenes/stage6-ending.svg
```

## 実装の順序

1. `stageBackground.ts` の stage2〜6 色を明度UP(世界観維持・明暗関係維持)。
2. `stage1.ts` の stage4/5/6 `backgroundColor` を整合する明度へ調整。
3. カットシーンSVG5枚を明度UP(ビネット緩和 + 主要色持ち上げ)。
4. ユニットテスト/lint/typecheck/build で回帰がないことを確認。
5. 目視確認(可能なら起動/スクリーンショット)。

## セキュリティ考慮事項

- ハードコードされた機密情報・URL・キーの新規混入はない(色値のみ)。SVGに外部参照(`xlink:href` 外部URL等)を追加しない。

## パフォーマンス考慮事項

- 描画ロジック・レイヤー数・アセット枚数は不変のため、実行時コストは現状維持。SVGにフィルタ等の重い要素を多用しない。

## 将来の拡張性

- 明度を含む背景トーンは引き続き `stageBackground.ts` のデータと各SVGに集約される。将来ステージを足す際も同じデータ点を調整すればよい(構造は不変)。
