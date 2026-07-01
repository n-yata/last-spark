# 設計書

## アーキテクチャ概要

既存の「難易度モード(normal/hard)を係数テーブルで管理し、Phaser非依存の純粋関数で適用する」パターンを踏襲する。周回数(`loopCount`)を難易度と直交する第2軸として `difficulty.ts` に追加し、既存のセーブ・難易度・ストーリー制御・クリアフローという4つの既存機構を最小変更で拡張する。新規シーンは作らず、既存の `ClearScene` を拡張して周回への導線を持たせる。

```
SaveData(+loopCount)
   └─ GameScene.init で loopCount を読み込み
        ├─ difficulty.ts: loopScaling(loopCount) を既存3関数に乗算適用
        ├─ difficulty.ts: shouldShowStory(difficulty, loopCount) でストーリー分岐を一元化
        └─ createPlayer 後: loopRayTint(loopCount) を CharacterRig.setTint で適用
   └─ stage6クリア(finalizeEnding) → ClearScene(offerNextLoop=true)
        ├─ 「次の周回へ」→ SaveManager.advanceLoop() → GameScene(stage1)
        └─ 「タイトルへ」→ TitleScene(loopCount表示・背景演出差分)
```

## コンポーネント設計

### 1. セーブ層(`src/types/save.ts`, `src/persistence/SaveManager.ts`, `src/config/storageKeys.ts`)

**責務**:
- `loopCount: number`(初期値1)を `SaveData` 直下(`settings` 外)に永続化する。`settings` はユーザーが変更する設定値の集合であり、`loopCount` は `clearedStages`/`bestTimeMs` と同種の進捗データのため。
- 既存セーブ(v2〜v5)を読み込んだ際、`loopCount: 1` を補完してマイグレーションする。
- 周回の進行(`loopCount++` かつ `clearedStages` リセット、`bestTimeMs` は保持)を単一メソッド `advanceLoop()` に閉じる。

**実装の要点**:
- `SAVE_VERSION` を5→6に上げ、`storageKeys.ts` の版履歴コメントに `v6: loopCount 追加` を追記する。
- `isValidSaveData()` に `loopCount` の型・範囲チェック(1以上の有限整数)を追加する。
- `migrate()` の対象バージョン条件に `d.version === 5` を加え、`loopCount` 未存在時は1を補完する。v1分岐にも `loopCount: 1` を追加する。
- `advanceLoop()` は `bestTimeMs` を触らず、`clearedStages` のみ空配列にリセットする。誤って進捗記録を消さないことをテストで固定する。

### 2. 難易度・周回スケーリング層(`src/systems/difficulty.ts`)

**責務**:
- 周回スケーリングを既存の `DIFFICULTY_TUNING` とは独立したテーブル `LOOP_SCALING` として持ち、3周目で上限に達し4周目以降は頭打ちにする。
- 既存の3つの純粋関数(`applyDifficultyToStageTuning`, `applyDifficultyToEnemySpawns`, `playerDamageMultiplier`)に `loopCount` 引数(デフォルト1)を追加し、既存の難易度係数へ周回乗数を掛け合わせる。
- ストーリー表示可否の判定を `shouldShowStory(difficulty, loopCount)` に一元化する(`loopCount >= 2` なら difficulty を問わずスキップ)。旧 `shouldShowStoryForDifficulty` は置き換えて削除する。

**実装の要点**:
- `loopCount` にデフォルト引数 `= 1` を与えることで、1周目の乗数を全て1.0にし、既存呼び出し・既存テストの数値を完全一致させ非破壊にする。
- `loopScaling(loopCount)` は `Math.min(Math.max(Math.floor(loopCount), 1), 3) - 1` でテーブルindexにクランプする。
- `shouldShowStory` は1関数に分岐を集約しているため、GameScene側の呼び出し1箇所を差し替えるだけで開始/救出/エンディング全演出に波及する。

### 3. GameScene配線(`src/scenes/GameScene.ts`)

**責務**:
- `init`/`create` 時に `SaveManager` から `loopCount` を読み込み、以後の難易度計算・ストーリー分岐・見た目報酬適用に使う。
- stage6の `finalizeEnding` から `ClearScene` へ `offerNextLoop: true` を渡す。

**実装の要点**:
- 難易度適用の3呼び出し箇所すべてに `loopCount` を追加で渡す。
- `storyEnabled` の算出を `shouldShowStory(difficulty, loopCount)` に差し替える。
- `createPlayer` 完了後、`loopCount >= 2` の場合のみ `loopRayTint(loopCount)` を Player に適用する。

### 4. 周回への導線(`src/scenes/ClearScene.ts`)

**責務**:
- 最終クリア(`ALL CLEAR`)時に `offerNextLoop` が真なら、「次の周回へ進む」「タイトルへ」の2択を提示する。
- 「次の周回へ」選択時は `SaveManager.advanceLoop()` を呼び、`GameScene` へ `stageId: 'stage1'` で遷移する。
- 「タイトルへ」選択時は現行どおり `TitleScene` へ遷移する。

**実装の要点**:
- 新規シーンは作らず、既存の `ClearData` に `offerNextLoop?: boolean` を追加して分岐させる(既存の `TAP TO CONTINUE`/`TAP TO TITLE` の1本導線パターンを2択に拡張する形)。
- タップ領域は十分広く取り、モバイル実機(縦・横)で誤操作なく選べることを確認する。

### 5. 見た目の報酬(`src/entities/CharacterRig.ts`, `src/entities/Player.ts`, `src/scenes/TitleScene.ts`)

**責務**:
- 周回数に応じてRAYの配色を実行時tintで変更する(パーツテクスチャは増やさない)。
- タイトル画面に周回数表示と、周回数に応じた背景/発光ラインの色味変化を追加する。

**実装の要点**:
- `CharacterRig` は被弾時のヒットフラッシュ(`updateHitFlash`)で `clearTint()` すると周回tintまで消えてしまう。`baseTint` を保持させ、`clearTint()` 相当の処理を「`baseTint` へ戻す」に改修する(このプロジェクトで唯一注意が必要な破壊的相互作用)。
- `loopRayTint(loopCount)` は `balance.ts` 等にプレースホルダ配色テーブルとして定義し、実機確認のうえビジュアル調整で確定する(具体的な色指定は未決事項のまま実装フェーズで決める)。
- TitleSceneは既に `SaveManager` を読んでいるので、`loopCount` を追加取得して `LOOP {n}` 表示と背景色変化を加える。新規アセットは不要。

## データフロー

### 周回達成〜次周回開始
```
1. stage6ボス撃破 → finalizeEnding が ClearScene へ { stageId: 'stage6', offerNextLoop: true } を渡す
2. ClearScene: SaveManager.markStageCleared('stage6', ...) 実行後、2択UIを表示
3. 「次の周回へ」選択 → SaveManager.advanceLoop() (loopCount++, clearedStages=[])
4. GameScene(stage1)へ遷移。loopCount>=2 のため shouldShowStory=false でストーリー演出スキップ、
   loopScaling(loopCount) が難易度係数に乗算され、loopRayTint でRAYの配色が変わる
```

### 既存セーブ(v5以下)の読み込み
```
1. SaveManager.load() が isValidSaveData で version不一致を検出
2. migrate() が version<=5 の分岐に入り、loopCount未存在のため 1 を補完
3. SAVE_VERSION=6 の SaveData として返却・保存
```

## エラーハンドリング戦略

新規のカスタムエラークラスは不要。既存の `SaveManager` の方針(localStorage失敗時もthrowせずデフォルト値へフォールバックする)を継続する。`loopCount` のバリデーション失敗時も同様に、セーブ全体を `defaultSaveData()`(loopCount=1)へフォールバックさせる。

## テスト戦略

### ユニットテスト
- `tests/unit/persistence/SaveManager.test.ts`: v5→v6マイグレーションでのloopCount補完、`advanceLoop()` の loopCount増加・clearedStagesリセット・bestTimeMs保持、不正なloopCount値の拒否。
- `tests/unit/systems/difficulty.test.ts`: `loopScaling` の1〜3周目の値と4周目以降の頭打ち、`applyDifficultyToStageTuning`/`applyDifficultyToEnemySpawns`/`playerDamageMultiplier` へのloopCount適用(デフォルト値で既存挙動を維持することを含む)、`shouldShowStory` のloopCount>=2分岐(normal/hard両方)。
- CharacterRigのbaseTint保持(被弾フラッシュ後に周回tintへ復帰すること)の回帰テストを追加する。

### 統合テスト
- 既存の `tests/integration/` パターンに準じ、GameSceneでの難易度・ストーリー分岐の配線が壊れていないことを既存テストの継続通過で確認する(新規統合テストは既存カバレッジで十分なため追加は最小限)。

## 依存ライブラリ

新規ライブラリの追加なし。既存のPhaser/TypeScript/Vitest構成のみで実装する。

## ディレクトリ構造

```
src/
  types/save.ts               (変更: loopCount追加)
  config/storageKeys.ts       (変更: SAVE_VERSION 5→6)
  persistence/SaveManager.ts  (変更: migrate/isValidSaveData/advanceLoop)
  systems/difficulty.ts       (変更: LOOP_SCALING/loopScaling/shouldShowStory追加)
  scenes/GameScene.ts         (変更: loopCount配線・storyEnabled差し替え・RAY tint適用)
  scenes/ClearScene.ts        (変更: offerNextLoop分岐・2択UI)
  scenes/TitleScene.ts        (変更: LOOP表示・背景演出差分)
  entities/CharacterRig.ts    (変更: baseTint保持)
  entities/Player.ts          (変更: 周回tint適用メソッド)
  config/balance.ts           (変更: LOOP_RAY_TINT/loopRayTint追加)
tests/
  unit/persistence/SaveManager.test.ts   (変更)
  unit/systems/difficulty.test.ts        (変更)
  unit/entities/characterRig.test.ts     (新規 or 既存拡張、baseTint回帰テスト)
```

## 実装の順序

1. セーブ層(loopCount・マイグレーション・advanceLoop)とそのテスト
2. difficulty.ts の周回スケーリング・shouldShowStory とそのテスト
3. GameScene配線(loopCount読み込み・難易度引数・storyEnabled差し替え)
4. ClearSceneの2択UIとfinalizeEnding連携
5. 見た目の報酬(CharacterRig baseTint改修・RAY tint・TitleScene演出)

## セキュリティ考慮事項

- `loopCount` はlocalStorageに保存されるクライアント側の値であり、改ざんされても外部への影響やインジェクションのリスクはない(既存の `clearedStages`/`bestTimeMs` と同様、値域チェックのみで十分)。
- `isValidSaveData` での範囲チェック(1以上の有限整数)により、異常値(負数・NaN・巨大値)によるゲームロジックの破綻を防ぐ。

## パフォーマンス考慮事項

- RAY配色は実行時tint(乗算)のみで新規テクスチャ生成を伴わないため、`PreloadScene` の生成負荷・アセットキー数に影響しない。
- 周回スケーリングは既存の係数乗算に1回分の乗算を追加するのみで、フレーム処理への影響は無視できる。

## 将来の拡張性

- `LOOP_SCALING` テーブルは配列なので、将来的に上限周回数を増やす場合もテーブルに要素を追加するだけで済む。
- `loopRayTint` のテーブルも同様に配列拡張で追加の周回配色に対応できる。
- 今回スコープ外とした実績システム・スコアランキングは、`loopCount` という進捗データが既にセーブ層に載るため、将来追加する際の参照値として利用できる。
