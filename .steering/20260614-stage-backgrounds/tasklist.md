# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: 背景テーマ定義と純ロジック

- [x] `src/config/stageBackground.ts` を新規作成
  - [x] 型定義(`SilhouetteShape` / `BackgroundLayerTheme` / `StageBackgroundTheme` / `SilhouetteColumn`)
  - [x] 全6ステージのテーマ定義(空の色・accent・layers・seed をストーリー世界観に合わせて設定)
  - [x] `getStageBackground(stageId)`(未知 ID は stage1 フォールバック)
  - [x] 色ユーティリティ `hexToNum` / `lerpColor`(純関数・export)
  - [x] 決定論的 PRNG と `generateSilhouetteColumns(layer, worldWidth, seed)`

## フェーズ2: ユニットテスト

- [x] `tests/unit/config/stageBackground.test.ts` を新規作成
  - [x] 全6ステージにテーマが存在し、色が有効 hex・scrollFactor が (0,1)・layers≥1
  - [x] 6ステージの skyTop とシルエット種別が互いに異なる(視覚的差別化の保証)
  - [x] 未知 ID は stage1 テーマにフォールバック
  - [x] `generateSilhouetteColumns` が決定論的で全幅を覆い、高さが正の有限値
  - [x] `hexToNum` / `lerpColor` の境界値

## フェーズ3: 描画コンポーネント

- [x] `src/systems/backgroundPainter.ts` を新規作成
  - [x] `paintStageBackground(scene, theme, worldWidth, groundY)` の骨子(depth/scrollFactor 設定)
  - [x] 空グラデーション(縦バンド線形補間)描画
  - [x] シルエット種別ごとの描画(ruinedCity/shaftTown/facility/wasteland/outerWorks/core)
  - [x] アクセント表現(窓灯・監視灯・コア光のドット/グロー)

## フェーズ4: GameScene 統合

- [x] `GameScene.ts` に `buildBackground()` を追加し `create()` で最初に呼ぶ
- [x] `setupCamera()` のベース背景色を `stage.backgroundColor ?? theme.skyBottom` に拡張
- [x] 必要な import を追加

## フェーズ5: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`（416 件パス）
- [x] リントエラーがないことを確認
  - [x] `npm run lint`（クリーン）
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`（クリーン）
- [x] ビルドが成功することを確認
  - [x] `npm run build`（成功・PWA 生成）

## フェーズ6: 検証とドキュメント

- [x] implementation-validator による品質検証（総合 4.8/5、Critical/High なし。Low 3件は反映済み）
- [x] セキュリティレビュー(クルトワ)（Critical/High なし。ハードコーディング該当ゼロ）
- [x] 視覚検証（dev サーバ + Playwright で stage1〜6 を起動しスクリーンショット確認。全6ステージが世界観に沿って差別化）
- [x] docs/functional-design.md を更新（背景システムとカラーコーディングに追記）
- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-14

### 計画と実績の差分

**計画どおり進んだ点**:
- 「純データ/純ロジック(stageBackground.ts・Phaser非依存)」と「描画(backgroundPainter.ts・Phaser依存)」の分離は計画どおりで、ユニットテストを Phaser モックなしで成立させられた。
- パララックスは全幅描画 + scrollFactor<1 の方式で、RESIZE/ズーム/ボス戦 bounds 縮約に対し再構築不要。数式上もカバレッジが保証される(可視右端 ≤ stageWidth)。

**計画と異なった点 / 追加対応**:
- implementation-validator の指摘(Low #1)を受け、`getStageBackground` の二重呼び出しを `bgTheme` フィールド保持に変更(buildBackground で確定し setupCamera で再利用)。
- 視覚検証で、開始演出(CutsceneScene)がカメラ alpha を 0 にするため、Playwright から GameScene を直接起動し演出を無効化 + カメラ手動配置 + scene.pause で落下死を避けてスクショする手順が必要だった。

**未決事項の決定(requirements の ## 未決事項)**:
- パララックス層数 → 空 + シルエット2層の計3層に確定(空 depth -30 / シルエット -20,-19)。
- StageData への背景表現 → 新フィールドは足さず、stageId をキーに stageBackground.ts から引く方式に確定(StageData 型の変更なし。既存 backgroundColor はベース塗りとして温存)。
- 背景アニメーション → 今回は静的(create で一度だけ生成)。毎フレーム描画なしでパフォーマンスを優先。

### 学んだこと

**技術的な学び**:
- mulberry32 による決定論 PRNG でレイアウトを再現可能にすると、リサイズ再描画やテストが安定する(Math.random を避ける利点)。
- 縦バンドの fillRect 補間でグラデーションを描けば、WebGL 専用の fillGradientStyle に依存せず Canvas でも安全。
- Phaser の depth は負値が使え、地形(0)より確実に背面へ置ける。

**プロセス上の学び**:
- 視覚機能は E2E/ユニットだけでなく、実際に起動してスクショ確認すると受け入れ条件の充足を直接確認できる。`window.lastSpark` 経由でシーンを直接起動できるデバッグ口が有効だった。

### 次回への改善提案
- 将来テクスチャアトラス/SVG へ差し替える場合も、backgroundPainter の内部だけ変えれば GameScene/テーマ定義は不変に保てる(拡張点が一箇所に閉じている)。
- stage6 は意図的に暗い(太陽を遮る影)。実機の明るさによっては視認性が気になる可能性があり、必要なら accent グローの強度を後日チューニングする余地あり。
