# 設計書

## アーキテクチャ概要

既存の「純粋ロジック(systems) + シーン(scenes)」分離を踏襲する。ランク判定・記録更新判定を純粋モジュール `systems/clearResult.ts`(新規)に置き、GameScene は集計、ClearScene は表示、SaveManager は永続化に徹する。

```
GameScene(集計)
  ├ kills: CombatCallbacks.onEnemyDefeated で加算(既存コールバックに1行)
  ├ damageTaken: クリア確定時に player.maxHp - player.hp(回復無しのため確定)
  └ ClearScene 起動データに { damageTaken, kills } を追加(3経路: 通常/救出/エンディング)
        │
clearResult.ts(純粋・新規)
  ├ resolveRank(damageTaken, maxHp) → 'S' | 'A' | 'B'
  ├ isBetterRank(candidate, current) → boolean(S > A > B)
  └ isNewRecord(prevBestMs, clearTimeMs) → boolean(既存ベストがある時のみ true になり得る)
        │
ClearScene(表示)                          SaveManager(永続化)
  ├ カウントアップ(tween counter)          ├ SaveData.bestRank?: Record<string, StageRank>
  ├ NEW RECORD フレア(保存前に判定)         ├ markStageCleared(stageId, timeMs?, rank?)
  ├ 戦績行(被ダメ/撃破数)                   │   より良いランクのみ上書き
  └ ランクポップ(カウントアップ完了後)       └ v7 のまま任意フィールド追加(バージョン繰り上げなし)
        │
stageCards.ts / stageSelect.ts(カード表示)
  └ StageCardModel.bestRank?: StageRank → カード右下にランク字
```

## コンポーネント設計

### 1. clearResult.ts(新規・純粋ロジック)

**責務**: ランク判定・ランク比較・記録更新判定

**実装の要点**:
- `type StageRank = 'S' | 'A' | 'B'`(types/save.ts に置き、セーブ型と共有)
- `resolveRank(damageTaken, maxHp)`: 0 → 'S'、`damageTaken <= maxHp * 0.25` → 'A'、それ以外 'B'。不正値(負・非有限)は 0 扱いで防御
- `isBetterRank(candidate, current?)`: current 無しなら true。順序は S > A > B
- `isNewRecord(prevBestMs, clearTimeMs)`: `prevBestMs !== undefined && clearTimeMs < prevBestMs`
- ランク閾値(0.25)は `balance.ts` に `RANK.aDamageRatio` として置く(チューニング値の集中管理)

### 2. GameScene(変更・集計)

**実装の要点**:
- `private kills = 0` を追加し、既存 `onEnemyDefeated` コールバック内でインクリメント
- クリア確定時(`handleClear` のタイム確定と同じ場所)に `damageTaken = this.player.maxHp - this.player.hp` を確定し、救出経路用に `pendingClearTimeMs` と同様のフィールドで保持
- ClearScene への `transitionTo` 3箇所(通常 / finalizeRescueClear / finalizeEnding)に `damageTaken` / `kills` を追加
- finalizeEnding(stage6)は保存も GameScene 側で行っているため、ここでは `markStageCleared(stageId, timeMs, rank)` にランクを渡す

### 3. ClearScene(変更・表示)

**実装の要点**:
- `ClearData` に `damageTaken?: number` / `kills?: number` を追加(未指定は表示のみ省略せずに 0 扱いとするか → **未指定時は戦績・ランク行を出さない**。旧経路やテスト起動でデータが無い場合に嘘の 0 を出さないため)
- **NEW RECORD 判定は markStageCleared の前**に `getData().bestTimeMs?.[stageId]` を読んで行う
- 保存: `markStageCleared(stageId, clearTimeMs, rank)`(stageId がある経路のみ。stage6 は GameScene 側で保存済みのため従来どおり stageId を渡さない)
- カウントアップ: `tweens.addCounter({ from: 0, to: clearTimeMs, duration: 900 })` で毎フレーム `TIME m:ss` を更新。完了時に確定値へ固定
- NEW RECORD: TIME 行の横に黄色(#fff27a)で表示し、alpha 点滅 tween(既存の TAP TO 〜 と同じ流儀)
- 戦績行: `ダメージ n   撃破 m` を TIME の下に小さめで表示
- ランク: カウントアップ完了後に大きめの一文字(S=#fff27a / A=#37f7d8 / B=#cfe9e2)を scale 1.6→1.0 のポップ tween で表示。SE は `uiTap`(新規SE追加はスコープ外)
- レイアウトは既存の height 比率配置を微調整(TIME 0.44 / 戦績 0.52 / ランクは右側 or TIME 横)。既存の台詞(0.6)・導線(0.78)は動かさない

### 4. SaveManager / types/save.ts(変更・永続化)

**実装の要点**:
- `SaveData.bestRank?: Record<string, StageRank>` を追加(**任意フィールド**。bestTimeMs と同方針で周回リセットの対象外)
- **SAVE_VERSION は 7 のまま**: 旧セーブはフィールド無しで妥当、新セーブを旧コードが読んでも未知フィールドは無視される(isValidSaveData は既知フィールドのみ検査)。busterMode/vibration は「settings 内の必須フィールド」だったためバージョン繰り上げが必要だったが、bestRank は「トップレベルの任意進捗フィールド」であり bestTimeMs と同じ扱いでよい
- 検証: `isValidBestRanks(value)`(ステージID→'S'|'A'|'B' の Record)を isValidSaveData に追加(`undefined` 許容)。不正値は既定値フォールバック(既存方針)
- `markStageCleared(stageId, timeMs?, rank?)`: rank が渡され、`isBetterRank(rank, 現在値)` のときのみ更新
- `advanceLoop()` は bestRank を**保持**する(bestTimeMs と同じ)
- getData() のディープコピーに bestRank を追加

### 5. stageCards.ts / stageSelect.ts(変更・カード表示)

**実装の要点**:
- `StageCardModel.bestRank?: StageRank` を追加し、`buildStageCardModels` で `save.bestRank?.[id]` を引く
- カード右下(BEST の反対側)にランク一文字を表示(色は ClearScene と同じマップを共有: `clearResult.ts` に `rankColor(rank)` を置く)

## データフロー

### 通常クリア(stage1-2, 4-5)
```
1. handleClear: clearTimeMs 確定と同時に damageTaken/kills を確定
2. transitionTo(clear, { clearTimeMs, stageId, nextStageId, damageTaken, kills })
3. ClearScene: prevBest を読む → isNewRecord 判定 → resolveRank → markStageCleared(stageId, time, rank)
4. カウントアップ → NEW RECORD/戦績/ランク表示
```

### 救出経由(stage3) / エンディング経由(stage6)
```
- stage3: handleClear 時点で pending に退避 → finalizeRescueClear が同じデータを渡す
- stage6: finalizeEnding が markStageCleared(stageId, time, rank) で保存し、
  ClearScene へは表示用データ(stageId なし + damageTaken/kills + prevBest 判定用の isNewRecord 済みフラグ…ではなく)
  → stage6 も判定を GameScene 側で行い、ClearData に `newRecord?: boolean` を渡す形に統一する
  (ClearScene 内判定は「stageId がある経路」のみ。二重保存を避ける既存設計を維持)
```

## エラーハンドリング戦略

- `resolveRank` は不正値(負・NaN・Infinity)を 0 扱いに丸める(formatBestTime と同じ表示防御)
- ClearData の戦績が未指定(undefined)の場合は戦績・ランク表示を出さない(嘘の 0 を出さない)
- bestRank の不正セーブ値は isValidSaveData で弾き既定値へ(既存の破損耐性)

## テスト戦略

### ユニットテスト
- `tests/unit/systems/clearResult.test.ts`(新規): resolveRank(境界: 0 / ちょうど25% / 超過 / 不正値)、isBetterRank(全組合せ + current なし)、isNewRecord(初回 / 更新 / 未更新 / 同タイム)
- `tests/unit/persistence/SaveManager.test.ts`(追加): bestRank の保存・復元 / より良いランクのみ上書き / advanceLoop で保持 / 不正値フォールバック / bestRank なし旧セーブの読み込み
- `tests/unit/stageSelect/stageCards.test.ts`(追加): bestRank がモデルへ反映される / 無しなら undefined

### 実機相当検証(Playwright)
- ClearScene を直接起動(3パターン: 初回クリア / ベスト更新 / ベスト未更新)し、NEW RECORD の出し分け・カウントアップ最終値・ランク字を確認
- クリア後のセーブに bestRank が記録され、ステージセレクトのカードにランクが出ることを確認
- ランク S 保持中に B でクリアしても S が残ることを確認

## 依存ライブラリ

追加なし。

## ディレクトリ構造

```
src/
├── systems/clearResult.ts        # 新規: ランク判定・比較・記録更新判定(純粋)
├── config/balance.ts             # 変更: RANK.aDamageRatio 追加
├── types/save.ts                 # 変更: StageRank / SaveData.bestRank 追加
├── persistence/SaveManager.ts    # 変更: bestRank の検証・保存・比較更新
├── scenes/GameScene.ts           # 変更: kills 集計・damageTaken 確定・遷移データ拡張
├── scenes/ClearScene.ts          # 変更: カウントアップ/NEW RECORD/戦績/ランク表示
├── stageSelect/stageCards.ts     # 変更: StageCardModel.bestRank
└── stageSelect/stageSelect.ts    # 変更: カードへのランク表示
tests/
├── unit/systems/clearResult.test.ts       # 新規
├── unit/persistence/SaveManager.test.ts   # 追加
└── unit/stageSelect/stageCards.test.ts    # 追加
```

## 実装の順序

1. clearResult.ts + types/save.ts + balance.ts + ユニットテスト
2. SaveManager の bestRank 対応 + テスト
3. GameScene の集計・遷移データ拡張
4. ClearScene の表示・演出
5. stageCards / stageSelect のランク表示 + テスト
6. Playwright 検証 → 品質チェック → docs 更新

## セキュリティ考慮事項

- 外部通信なし。localStorage への追加はステージID→'S'|'A'|'B' の Record のみで、読み込みは既存の検証パイプラインを通す。
- 表示文字列は全て固定リテラル + 数値整形。

## パフォーマンス考慮事項

- カウントアップ tween は ClearScene 表示中のみ(約900ms)。プレイ中の集計は整数加算のみで負荷なし。

## 将来の拡張性

- ランク別報酬(配色解放等)は bestRank を参照するだけで実装できる。
- タイム基準を将来ランクに足す場合は resolveRank の入力を増やす(閾値は balance.ts)。
