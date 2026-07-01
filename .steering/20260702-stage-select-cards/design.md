# 設計書

## アーキテクチャ概要

既存の「純粋ロジック(Phaser 非依存) + 描画(Phaser)」分離を踏襲する。カードのモデル構築・解放判定・レイアウト計算・タイム整形を純粋モジュール `stageSelect/stageCards.ts`(新規)に置き、`stageSelect.ts` は描画とイベント配線に徹する。

```
SaveManager(SaveData) ─┐
STAGE_IDS / STAGE_LABELS ─┼─▶ stageCards.ts(純粋)
getStageBackground(テーマ) ─┘      ├ buildStageCardModels(save) → StageCardModel[]
                                   ├ isStageUnlocked(index, cleared, bestTimes)
                                   ├ formatBestTime(ms) → "m:ss.d"
                                   └ cardGridLayout(w, h, count) → CardRect[]
                                        │
stageSelect.ts(描画) ◀─────────────────┘
  ├ カード枠/ホバー(Graphics + Zone)
  ├ ミニプレビュー(lerpColor 帯 + generateSilhouetteColumns 縮小描画)
  └ CLEAR バッジ / BEST タイム / LOCKED 暗転
```

## コンポーネント設計

### 1. stageCards.ts(新規・純粋ロジック)

**責務**:
- `StageCardModel` の構築(id / stageNo / name / cleared / bestTimeMs / locked / theme)
- 解放判定・ベストタイム整形・グリッドレイアウト計算

**実装の要点**:
- `isStageUnlocked(index, clearedStages, bestTimeMs)`: `index === 0` は常に true。それ以外は「前のステージ ID が clearedStages に含まれる **または** bestTimeMs にキーを持つ」場合 true。**bestTimeMs(周回で消えない)を含めるのが周回互換の要**。
- `formatBestTime(ms)`: `m:ss.d`(分:秒.デシ秒)。`ClearScene` に同種の整形があれば流儀を合わせる(重複実装があれば共通化を検討)。
- `cardGridLayout(width, height, count, opts)`: 3列グリッドの各カード矩形(x/y/w/h)を返す純関数。論理座標で計算し、呼び出し側が `scaled()` 適用済みの値を渡す。カード間ガター・上下マージン(見出し/BACK 領域)を opts で受ける。
- ステージ名は `stages.ts` の `STAGE_LABELS` を分解して使う(番号は index から導出)。`stages.ts` に `stageName(id)` を追加し、`PLAYABLE_STAGES` の `label`(`STAGE n  名前` 連結形式)は既存互換のため残す。

### 2. stageSelect.ts(変更・描画)

**責務**:
- 既存オーバーレイの中身を「縦並びテキストボタン」から「カードグリッド」へ置き換える
- カード1枚 = Container(枠 Graphics + プレビュー Graphics + テキスト群 + 入力 Zone)

**実装の要点**:
- **ミニプレビュー**: カード上部 55% の領域に描く。
  - 空: `skyTop`→`skyBottom` を `lerpColor` で 6 帯に補間して `fillRect`(Graphics の `fillGradientStyle` は WebGL 限定のため使わない。Canvas フォールバックでも同じ見た目)
  - シルエット: `generateSilhouetteColumns(layer, プレビュー論理幅, seed)` を各レイヤーで呼び、高さを `プレビュー高 / 基準高` で縮小して奥→手前の順に `fillRect`。決定論なので再描画で揺れない
  - アクセント灯: seed 由来の固定位置に 2〜3 個の小さな `fillRect`(accent 色)
  - プレビューは Graphics 直描き(テクスチャ生成しない。カード6枚×矩形数十個は 60fps に影響しない)
- **カード枠**: 角丸 lineStyle 枠。ホバー/押下で枠色を accent/ハイライトへ変更(既存 `makeMenuButton` の hover 流儀)
- **LOCKED**: プレビュー・テキストの上に半透明黒 `fillRect` + 中央に `LOCKED` テキスト。Zone を `setInteractive` しない(タップ無効)
- **CLEAR バッジ / BEST タイム**: カード下部にテキスト(`scaledFontPx`)。配色は既存パレット(#37f7d8 / #cfe9e2 / #9fffe8)を踏襲
- 入力は Zone(`Rectangle` サイズ)で受ける。**1x1 テクスチャ + setDisplaySize は使わない**(過去の教訓: Arcade body 膨張。ここは物理なしの UI だが、サイズ指定ゾーンは Zone/Rectangle で作る流儀を守る)
- 既存の `destroyOverlay` / `startZone` 排他 / `isOverlayOpen` はそのまま維持する

### 3. stages.ts(小変更)

- `STAGE_LABELS` を `stageName(id): string` として公開(カードは番号と名前を別行で出すため)
- `PLAYABLE_STAGES` は既存互換(オプションメニューのステージ移動パネルが参照)のため形式を変えない

## データフロー

### ステージセレクトを開く
```
1. STAGE SELECT タップ → openStageSelect()
2. new SaveManager().getData() で SaveData を取得
3. buildStageCardModels(save) が全ステージのモデルを構築(解放判定込み)
4. cardGridLayout(width, height, 6) で矩形を算出
5. モデル+矩形からカード Container を生成(プレビュー描画・バッジ・Zone 配線)
6. 解放済みカードのタップ → destroyOverlay() → onStartStage(id)(従来と同一)
```

## エラーハンドリング戦略

- SaveData は SaveManager が常に検証済み or 既定値を返すため、カード側での防御は不要。
- 未知 stageId のテーマは `getStageBackground` が stage1 へフォールバック(既存挙動)。

## テスト戦略

### ユニットテスト(tests/unit/stageSelect/stageCards.test.ts 新規)
- `isStageUnlocked`: 初回(全ロック、stage1のみ解放)/ 順次解放 / 周回リセット後の bestTimeMs による解放維持 / 境界(最終ステージ)
- `formatBestTime`: 0ms / 秒未満 / 分跨ぎ / 大きい値
- `cardGridLayout`: 6枚が3列2行に収まる / 画面境界をはみ出さない / カード同士が重ならない
- `buildStageCardModels`: cleared/bestTime/locked が SaveData から正しく引ける

### 統合(既存回帰)
- 既存の `tests/unit/stageSelect/stages.test.ts` が通る(PLAYABLE_STAGES 互換維持)
- Playwright 実機相当検証: セーブデータを注入した3状態(初回 / stage1-2クリア / 周回後)でカード表示・ロックタップ無効・解放タップ遷移を確認

## 依存ライブラリ

追加なし。

## ディレクトリ構造

```
src/
├── stageSelect/
│   ├── stageCards.ts      # 新規: カードモデル・解放判定・レイアウト・タイム整形(純粋)
│   ├── stageSelect.ts     # 変更: カードグリッド描画
│   └── stages.ts          # 小変更: stageName(id) を公開
tests/
└── unit/stageSelect/stageCards.test.ts  # 新規
```

## 実装の順序

1. stageCards.ts(純粋ロジック)+ ユニットテスト
2. stages.ts の stageName 公開
3. stageSelect.ts のカードグリッド描画への置き換え
4. Playwright での3状態検証(セーブ注入)
5. 品質チェック(lint / typecheck / test / build)
6. docs 更新(functional-design.md / repository-structure.md)

## セキュリティ考慮事項

- 外部通信なし。localStorage は既存の検証済み SaveManager 経由の読み取りのみ(書き込みなし)。
- 表示文字列は全て固定リテラル(ユーザー入力を表示しない)。

## パフォーマンス考慮事項

- プレビューは開いた時に一度だけ Graphics 描画(update ループなし)。カード6枚 × 矩形数十個は無視できる負荷。
- 既存の動的 import(タイトル初期表示を軽く保つ)は維持する。

## 将来の拡張性

- `StageCardModel` にランク(S/A/B)フィールドを足せる形にしておく(リザルトランク導入時はカード側の1行追加で済む)。
- ミニプレビュー描画関数はオプションメニューのステージ移動パネルへ将来流用できるよう、カード Container 生成をローカル関数として切り出しておく。
