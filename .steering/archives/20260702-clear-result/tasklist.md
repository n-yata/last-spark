# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 実装可能なタスクのみを計画
- 計画段階で「実装可能なタスク」のみをリストアップ
- 「将来やるかもしれないタスク」は含めない
- 「検討中のタスク」は含めない

### タスクスキップが許可される唯一のケース
以下の技術的理由に該当する場合のみスキップ可能:
- 実装方針の変更により、機能自体が不要になった
- アーキテクチャ変更により、別の実装方法に置き換わった
- 依存関係の変更により、タスクが実行不可能になった

スキップ時は必ず理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

### タスクが大きすぎる場合
- タスクを小さなサブタスクに分割
- 分割したサブタスクをこのファイルに追加
- サブタスクを1つずつ完了させる

---

## フェーズ1: 純粋ロジックと型(clearResult / save 型 / balance)

- [x] types/save.ts に `StageRank` 型と `SaveData.bestRank?: Record<string, StageRank>` を追加
- [x] balance.ts に `RANK.aDamageRatio: 0.25` を追加(コメントで意図を記載)
- [x] systems/clearResult.ts を新規作成
  - [x] `resolveRank(damageTaken, maxHp)`(不正値防御込み)
  - [x] `isBetterRank(candidate, current?)`(S > A > B、current 無しは true)
  - [x] `isNewRecord(prevBestMs, clearTimeMs)`(既存ベストがある時のみ)
  - [x] `rankColor(rank)`(ClearScene / カードで共有する色マップ)
- [x] tests/unit/systems/clearResult.test.ts を新規作成(13件パス)
  - [x] resolveRank: 0=S / ちょうど25%=A / 超過=B / 負値・NaN・Infinity の防御
  - [x] isBetterRank: 全順序組合せ + current なし
  - [x] isNewRecord: 初回(prev なし)=false / 更新=true / 未更新・同タイム=false

## フェーズ2: 永続化(SaveManager)

- [x] SaveManager に bestRank 対応を追加
  - [x] `isValidBestRanks` 検証(undefined 許容、不正値は既定値フォールバック)
  - [x] `getData()` / `save()` のディープコピーに bestRank を追加
  - [x] `markStageCleared(stageId, timeMs?, rank?)` でより良いランクのみ更新(順序の正本は types/save.ts の STAGE_RANK_ORDER。persistence→systems 依存禁止のため systems ではなく最下位の types に置く方針へ変更)
  - [x] `advanceLoop()` で bestRank を保持(getData/save のコピー経由で自然に保持)
- [x] SaveManager.test.ts にテストを追加(累計65件パス: clearResult 13 + SaveManager 52)
  - [x] bestRank の保存・復元
  - [x] より良いランクのみ上書き(S 保持中に B でクリアしても S のまま)+ ランク未指定呼び出しの互換
  - [x] advanceLoop 後も bestRank 保持
  - [x] bestRank 不正値のセーブは既定値へフォールバック
  - [x] bestRank なしの既存 v7 セーブがそのまま読み込める(バージョン繰り上げなしの確認)

## フェーズ3: 集計と表示(GameScene / ClearScene)

- [x] GameScene の集計
  - [x] `kills` フィールドを追加し onEnemyDefeated で加算(create() でのリセットも追加 — Scene 再利用のためフィールド初期化子では不十分)
  - [x] クリア確定時に `damageTaken = player.maxHp - player.hp` を確定(撃破の瞬間で確定、演出中の変動を含めない)
  - [x] ClearScene への遷移3経路(通常 / finalizeRescueClear / finalizeEnding)に damageTaken / kills を追加
  - [x] finalizeEnding(stage6)は GameScene 側でランク判定・markStageCleared(rank) と newRecord 判定を行い、ClearData に渡す

- [x] ClearScene の表示・演出
  - [x] ClearData に damageTaken / kills / newRecord を追加(未指定なら戦績・ランク行を出さない)
  - [x] NEW RECORD 判定を markStageCleared の前に実施(stageId がある経路)
  - [x] markStageCleared にランクを渡す
  - [x] タイムのカウントアップ(tweens.addCounter 900ms、完了時に確定値へ固定)
  - [x] NEW RECORD 表示(黄色 + alpha 点滅、更新時のみ)
  - [x] 戦績行(ダメージ / 撃破)の表示
  - [x] ランクのポップ表示(カウントアップ完了後、色は rankColor、発光シャドウ付き)

## フェーズ4: カード表示(stageSelect)

- [x] stageCards.ts: `StageCardModel.bestRank` を追加し buildStageCardModels で反映
- [x] stageSelect.ts: カード右下にランク一文字を表示(rankColor 共有)
- [x] stageCards.test.ts にテスト追加(bestRank の反映 / 無しなら undefined。累計88件パス)

## フェーズ5: 実機相当検証(Playwright)

- [x] ClearScene 直接起動で3パターン確認(初回=NEW RECORDなし / ベスト更新=あり / 未更新=なし)
- [x] カウントアップの最終値が formatBestTime(clearTimeMs) と一致(1:05 / 1:00 / 1:10 を実測)
- [x] ランク字(S/A/B)の出し分けを確認(damageTaken 0=S / 4(境界25%)=A / 5=B)
- [x] クリア後セーブに bestRank が記録され、ステージセレクトのカードにランク S が表示される
- [x] S 保持中に B・A クリアで S が残る(セーブ実測: bestRank.stage1='S' 維持)
- [x] 実プレイ経路の確認(stage1 実プレイ: 実弾で雑魚撃破→kills=1、実戦ボス撃破→ClearScene に TIME 0:34 / ダメージ4 / 撃破1 / RANK A / NEW RECORD が実データで表示、ベスト更新とS保持も実測)

## フェーズ6: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`(670件パス)
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`

## フェーズ7: ドキュメント更新・振り返り

- [x] docs/functional-design.md を更新(ClearScene のリザルト仕様 / SaveData.bestRank / カードのランク表示)
- [x] docs/repository-structure.md の systems 一覧に clearResult.ts を追記(stageSelect の依存関係に systems 純粋モジュールを追加)
- [x] 実装後の振り返りを記録（別ファイル `retrospective.md` に記録 → モード3）

---

> **振り返りについて**: 実装後の振り返りはこのファイルではなく、同じディレクトリの
> `retrospective.md` に記録する（テンプレート: `.claude/skills/steering/templates/retrospective.md`）。
> 全タスクが `[x]` になったことを確認してから作成すること。
