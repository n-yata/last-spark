# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### タスクスキップが許可される唯一のケース
以下の技術的理由に該当する場合のみスキップ可能:
- 実装方針の変更により、機能自体が不要になった
- アーキテクチャ変更により、別の実装方法に置き換わった
- 依存関係の変更により、タスクが実行不可能になった

スキップ時は必ず理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

---

## フェーズ1: セーブ層(loopCountの永続化)

- [x] `src/types/save.ts` に `SaveData.loopCount: number` を追加する
- [x] `src/config/storageKeys.ts` の `SAVE_VERSION` を5→6に上げ、版履歴コメントに `v6: loopCount 追加` を追記する
- [x] `src/persistence/SaveManager.ts` を更新する
  - [x] `defaultSaveData()` に `loopCount: 1` を追加する
  - [x] `isValidSaveData()` に `loopCount` の型・範囲チェック(1以上の有限整数)を追加する
  - [x] `migrate()` の対象バージョン条件に `version === 5` を加え、`loopCount` 未存在時は1を補完する(v1分岐にも `loopCount: 1` を追加)
  - [x] `advanceLoop()` メソッドを新設する(`loopCount++`, `clearedStages` を空配列にリセット, `bestTimeMs` は保持)
- [x] `tests/unit/persistence/SaveManager.test.ts` にテストを追加する
  - [x] v5(以下)セーブ読み込み時に `loopCount: 1` が補完されること
  - [x] `advanceLoop()` で `loopCount` が+1され、`clearedStages` が空になり、`bestTimeMs` が保持されること
  - [x] 不正な `loopCount` 値(負数・NaN等)を持つセーブが既定値へフォールバックすること

## フェーズ2: 周回スケーリングとストーリー分岐

- [x] `src/systems/difficulty.ts` を更新する
  - [x] `LOOP_SCALING` テーブル(1〜3周目の乗数、3周目で上限)を追加する
  - [x] `loopScaling(loopCount)` 関数を追加する(4周目以降は3周目値で頭打ち)
  - [x] `applyDifficultyToStageTuning`, `applyDifficultyToEnemySpawns`, `playerDamageMultiplier` に `loopCount`(デフォルト1)引数を追加し、`loopScaling` を乗算適用する
  - [x] `shouldShowStory(difficulty, loopCount)` を新設する(`loopCount >= 2` なら difficulty を問わずスキップ)
  - [x] 旧 `shouldShowStoryForDifficulty` を削除し、呼び出し元を `shouldShowStory` に置き換える
- [x] `tests/unit/systems/difficulty.test.ts` を更新する
  - [x] `loopScaling` の1〜3周目の値と4周目以降の頭打ちを検証する
  - [x] 3つの純粋関数がデフォルト引数(loopCount=1)で既存の数値と完全一致することを検証する(非破壊の確認)
  - [x] 2周目以降の乗数が正しく重なることを検証する
  - [x] `shouldShowStory` が normal/hard × loopCount 1/2 の各組み合わせで正しい真偽を返すことを検証する

## フェーズ3: GameScene配線

- [x] `src/scenes/GameScene.ts` を更新する
  - [x] `init`/`create` 時に `SaveManager` から `loopCount` を読み込む
  - [x] 難易度適用の3呼び出し箇所すべてに `loopCount` を渡す
  - [x] `storyEnabled` の算出を `shouldShowStory(difficulty, loopCount)` に差し替える
  - [x] stage6の `finalizeEnding` から `ClearScene` へ `offerNextLoop: true` を渡す

## フェーズ4: 周回への導線(ClearScene)

- [x] `src/scenes/ClearScene.ts` を更新する
  - [x] `ClearData` に `offerNextLoop?: boolean` を追加する
  - [x] `offerNextLoop` が真のとき、「次の周回へ進む」「タイトルへ」の2択UIを表示する(タップ領域を広く確保)
  - [x] 「次の周回へ」選択時に `SaveManager.advanceLoop()` を呼び、`GameScene` へ `{ stageId: 'stage1' }` で遷移する
  - [x] 「タイトルへ」選択時は現行どおり `TitleScene` へ遷移する

## フェーズ5: 見た目の報酬

- [x] `src/entities/CharacterRig.ts` を更新する
  - [x] `baseTint` を保持するプロパティを追加する
  - [x] ヒットフラッシュ終了時の `clearTint()` 相当処理を「`baseTint` へ戻す」に改修する
- [x] `src/config/balance.ts` に `LOOP_RAY_TINT`/`loopRayTint(loopCount)` を追加する(プレースホルダ配色)
- [x] `src/entities/Player.ts` に周回tintを適用する薄いメソッドを追加する(CharacterRigへ委譲)
- [x] `src/scenes/GameScene.ts` の `createPlayer` 完了後に `loopCount >= 2` の場合のみ周回tintを適用する
- [x] `src/scenes/TitleScene.ts` を更新する
  - [x] `SaveManager` から `loopCount` を取得し、`LOOP {n}` 表示を追加する
  - [x] 周回数に応じた背景/発光ラインの色味変化を追加する
- [x] CharacterRigのbaseTint回帰テストを追加する(被弾フラッシュ後に周回tintへ復帰することを検証)
- [x] 実機(ブラウザ)でRAY配色変化・タイトル演出変化・2択UIのタップ操作を確認する

## フェーズ6: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`

## フェーズ7: ドキュメント更新

- [x] `docs/functional-design.md` に周回要素(loopCount・段階強化・ストーリースキップ・見た目報酬)の仕様を追記する
- [x] 実装後の振り返りを記録（別ファイル `retrospective.md` に記録 → モード3）

---

> **振り返りについて**: 実装後の振り返りはこのファイルではなく、同じディレクトリの
> `retrospective.md` に記録する（テンプレート: `.claude/skills/steering/templates/retrospective.md`）。
> 全タスクが `[x]` になったことを確認してから作成すること。
