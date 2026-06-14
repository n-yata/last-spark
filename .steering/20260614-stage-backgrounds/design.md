# 設計書

## アーキテクチャ概要

ゲーム本編の背景を「単色塗り」から「手続き生成のパララックス背景(空グラデーション＋多層シルエット)」へ刷新する。既存のプレースホルダ哲学(Graphics による手続き生成)を踏襲し、アセットは追加しない。

責務を「純データ/純ロジック(Phaser 非依存・テスト可能)」と「描画(Phaser 依存)」に分離する:

```
GameScene.create()
  └─ buildBackground()                  … 新規メソッド(最初に呼ぶ)
       ├─ getStageBackground(stageId)   … config/stageBackground.ts(純データ)
       └─ paintStageBackground(scene, theme, worldWidth, groundY)
            … systems/backgroundPainter.ts(Phaser描画)
                 ├─ 空グラデーション(縦バンド補間, scrollFactor≒0.1, depth -30)
                 └─ シルエットレイヤー(奥→手前, scrollFactor<1, depth -20..-11)
                      └─ generateSilhouetteColumns(layer, worldWidth, seed)
                           … config/stageBackground.ts(純ロジック・決定論的)
```

座標系はワールド座標(論理 px、5200×540 等)。UI と違い `uiScale` は適用しない(地形・敵と同じ)。
パララックスは全レイヤーをワールド幅 `[0, stageWidth]` 全域に描き、`setScrollFactor(s)`(s<1)で遅く動かす。
全幅に描くことで、カメラがどこを映しても(ボス戦の bounds 縮約後も)可視範囲が必ずレイヤーに覆われる
(可視ワールド範囲 `[camScrollX·s, camScrollX·s + viewW] ⊆ [0, stageWidth]` が s≤1 で常に成立)。
そのため RESIZE / ズーム変化での再構築は不要(`create` で一度だけ生成)。

## コンポーネント設計

### 1. config/stageBackground.ts(純データ + 純ロジック)

**責務**:
- 全6ステージの背景テーマ(空の色、アクセント色、シルエットレイヤー定義、シード)を定義し、`getStageBackground(stageId)` で引けるようにする。
- 決定論的なシルエット列生成 `generateSilhouetteColumns()` と色ユーティリティ(`hexToNum` / `lerpColor`)を提供する。

**実装の要点**:
- Phaser に一切依存しない(import phaser しない)→ vitest で直接テスト可能。
- 乱数は使わず、`seed` から決定論的 PRNG(mulberry32 相当)でレイアウトを生成(リサイズ再描画やテストで安定)。
- 色は CSS hex 文字列で保持し、描画側で数値へ変換する。

### 2. systems/backgroundPainter.ts(Phaser 描画)

**責務**:
- テーマを受け取り、`scene.add.graphics()` で空グラデーションとシルエットレイヤーを描画する。
- 各オブジェクトに depth(負値=地形 depth 0 より背面)と scrollFactor(パララックス)を設定する。

**実装の要点**:
- 空グラデーションは WebGL/Canvas 双方で動くよう、`fillGradientStyle` ではなく**縦バンドの fillRect で skyTop→skyBottom を線形補間**して描く。
- シルエット形状は種別(`ruinedCity`/`shaftTown`/`facility`/`wasteland`/`outerWorks`/`core`)ごとに小関数で描き分ける。窓灯・監視灯・コア光は accent 色の発光ドット/グローで表現。
- depth 体系: 空 -30、シルエット奥 -20 → 手前 -11(地形 0・梯子 5・敵 8・ボス 9・プレイヤー 10・UI 95+ の最背面)。
- `create` のたびに新規生成。シーン再利用(stage1→stage2)時は表示リストが破棄されるため参照保持・明示破棄は不要。

### 3. GameScene.ts(統合)

**責務**:
- `create()` 内で `buildBackground()` を最初に呼び、背景を構築する。
- カメラのベース背景色を `stage.backgroundColor ?? theme.skyBottom` に設定(地面下/奈落の塗りつぶし用。シルエット可視域は背景レイヤーが覆う)。

**実装の要点**:
- 既存 `setupCamera()` の `cam.setBackgroundColor(...)` を `theme.skyBottom` フォールバックへ拡張(stage4/5/6 の既存 `backgroundColor` は尊重)。
- `buildBackground()` は `buildPlatforms()` の前に呼ぶ(depth で背面は保証されるが生成順も背面に揃える)。

## データフロー

### ステージ開始時の背景構築
```
1. GameScene.create() が stageId から getStageData() / buildBackground() を呼ぶ
2. buildBackground() が getStageBackground(stageId) でテーマ取得
3. paintStageBackground() が空グラデーション(縦バンド)を描画(depth -30, sf 0.1)
4. テーマの layers を奥→手前に走査し、generateSilhouetteColumns() で列を決定論生成
5. 種別ごとの描画関数がシルエット＋アクセントを描く(depth -20.., sf<1)
6. 以降カメラ追従でレイヤーが異なる速度で流れ、パララックスになる
```

## エラーハンドリング戦略

### カスタムエラークラス
- 不要(描画のみ。例外を投げる経路はない)。

### エラーハンドリングパターン
- `getStageBackground(stageId)` は未知 ID に対し stage1 テーマへフォールバック(`getStageData` の挙動に合わせる)。背景なしでクラッシュさせない。

## テスト戦略

### ユニットテスト(tests/unit/config/stageBackground.test.ts)
- 全6ステージ(stage1..6)にテーマが存在する。
- 各テーマの色が有効な hex、`scrollFactor` が (0,1) の範囲、`layers` が1つ以上。
- 6ステージの skyTop/シルエット種別が互いに異なる(=視覚的差別化の最低保証)。
- 未知 ID は stage1 テーマにフォールバックする。
- `generateSilhouetteColumns()` が決定論的(同一入力→同一出力)で、列が `[0, worldWidth]` を覆い、高さが正の有限値。
- `hexToNum` / `lerpColor` の境界(t=0,1, 中間)が正しい。

### 統合テスト
- 既存 E2E プレイスルー(`tests/e2e/play-through/`)が引き続き通る(背景追加で描画クラッシュや回帰がない)。

## 依存ライブラリ

新規追加なし。

## ディレクトリ構造

```
src/config/stageBackground.ts        (新規) テーマ定義 + 純ロジック
src/systems/backgroundPainter.ts     (新規) Phaser 描画
src/scenes/GameScene.ts              (変更) buildBackground() 追加・setupCamera のベース色拡張
tests/unit/config/stageBackground.test.ts (新規) ユニットテスト
```

## 実装の順序

1. `config/stageBackground.ts`(型・6テーマ・純ロジック)
2. `tests/unit/config/stageBackground.test.ts`(純ロジック/データの検証)
3. `systems/backgroundPainter.ts`(描画)
4. `GameScene.ts` 統合(buildBackground 呼び出し・ベース色)
5. 品質チェック(test/lint/typecheck/build)

## セキュリティ考慮事項

- 外部入力なし・ネットワークなし・シークレットなし。ハードコード URL/キーなし。色定数のみ。

## パフォーマンス考慮事項

- 背景は `create` で一度だけ Graphics 生成(毎フレーム再描画しない)。
- 全幅描画だが矩形・円の塗りが主で軽量。レイヤー数は空＋2層に抑える。
- アクセントのドット/グローは数を抑え、描画コールを過剰にしない。

## 将来の拡張性

- 新ステージは `stageBackground.ts` にテーマを1件足すだけで背景が付く(GameScene 変更不要)。
- 形状種別(SilhouetteShape)を増やせば新しい世界観に対応可能。
- 将来テクスチャアトラス/SVG へ差し替える場合も、`paintStageBackground` の内部実装だけを差し替えればよい(GameScene/テーマ定義は不変)。
