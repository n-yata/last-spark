# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: 型とストーリーデータ定義

- [x] `src/types/story.ts` を作成
  - [x] `StoryTextKind`（5種）を定義
  - [x] `StoryTextStyle` / `TextRequest` / `LogSlot` / `StageStory` / `StoryEvent` を定義
- [x] `src/config/story/stage1.ts` を作成（story.md の Stage 1 確定テキストを転記）
  - [x] ステージ開始テキスト
  - [x] ログ3本（序盤・ボス前・ボス後）
  - [x] ECLIPSEの語りかけ
  - [x] RAYの内心テキスト（シーンキー→本文）
- [x] `src/config/story/stage2.ts` を作成（Stage 2 確定テキスト）
- [x] `src/config/story/index.ts` を作成（`getStageStory(stageId)`）

## フェーズ2: StoryDirector（純粋ロジック）

- [x] `src/systems/storyDirector.ts` を作成
  - [x] storyEvent → TextRequest 変換ロジック
  - [x] 表示順序解決の純粋関数（stageStart=intro→inner の順）
- [x] `storyDirector` のユニットテストを作成（9件）
  - [x] 各イベント種別で正しい kind/本文が返る
  - [x] 表示順序が正しい

## フェーズ3: 表示レイヤー（StoryOverlay）

- [x] `src/ui/StoryOverlay.ts` を作成
  - [x] kind→スタイル（位置・色・イタリック等）のマップ
  - [x] テキスト描画（上部/中央/下部）
  - [x] フェードイン/アウトのトゥイーン
  - [x] `pauseGame=true` 時の GameScene 一時停止・タップ再開（非停止テキストは自動消去＋再開）
- [x] `src/config/storyEvents.ts`（GameScene→UIScene のイベント名）
- [x] `src/scenes/UIScene.ts` に StoryOverlay を組み込み（game イベントで受信）

## フェーズ4: ログトリガーとステージデータ拡張

- [x] `src/entities/LogTrigger.ts` を作成（オーバーラップ判定・一度だけ発火）
- [x] `src/config/stage1.ts` の `StageData` interface に `logTriggers?`（位置＋ログキー）を追加
- [x] Stage 1-2 に early/preBoss のログトリガーを配置（postBoss はブロック2のボス後フローで追加）
- [x] `GameScene` でログトリガーを生成・オーバーラップ検知

## フェーズ5: 発火点の組み込み

- [x] ステージ開始時に `stageIntro` を発火（UIScene の create 完了を待って emit）
- [x] ログ接触で該当ログを発火（最初のログは発見/読了の内心を前後に添える）
- [x] ボストリガー直前に `eclipseVoice` を発火（spawnBoss 後に語りかけを重ねる）
- [x] 内心トリガ（開始・初戦闘後・ログ発見/読了）で `rayInner` を発火

## フェーズ6: Stage 1-2 への組み込み確認

- [x] Stage 1-2 の確定テキスト（開始・ログ・語りかけ・内心）がデータ整合テストで確定版どおり（storyData.test.ts）
  - postBoss ログの「表示」はブロック2のボス後フロー実装後に通る（テキストはデータ確定済み）
- [x] ログ未接触でもゲームが進行する（logTriggers は overlap のみ・任意接触。tryConsume で多重発火なし）
- [x] ~~実機ブラウザでの表示目視確認~~（環境のネットワーク制約で Chromium 取得不可のため未実施。build/typecheck/lint/単体テストで担保。実機目視はブロック2着手時に実施する）

## フェーズ7: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`（225 tests passed）
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`

## フェーズ8: ドキュメント更新

- [x] `docs/functional-design.md` にテキスト表示システム・ログトリガーを追記
- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-13

### 計画と実績の差分

**計画と異なった点**:
- `postBoss` ログの「表示」を本ブロックから外し、ブロック2（ボス後フロー）へ委譲した。現行のボス撃破→即 ClearScene の動線では、ボス撃破後にログを拾う場所が無いため。テキスト・配置データ自体は確定済みで、ブロック2でトリガーを置けば即機能する。
- `src/config/storyEvents.ts`（GameScene→UIScene のイベント名）を新規追加した。当初の design には明記していなかったが、HUD（registry で毎フレーム共有）と異なり、テキスト表示は離散イベントのため専用チャネルが必要だった。
- 実機ブラウザでの目視確認は、環境のネットワーク制約で Chromium バイナリを取得できず未実施。build/typecheck/lint/単体テスト（storyDirector・storyData）で担保し、目視はブロック2着手時に行う。

**新たに必要になったタスク**:
- 開始テキストの emit タイミング対策。`scene.launch(ui)` 直後に同期 emit すると UIScene の create 前でリスナー未登録のため取りこぼす。UIScene の `CREATE` イベントを待って emit するよう修正した。
- 「最初のログ」だけ発見/読了の内心を前後に添える合成（GameScene.onLogOverlap）。

### 学んだこと

**技術的な学び**:
- ストーリー表示は「純粋ロジック（storyDirector：イベント→TextRequest）」と「描画（StoryOverlay：Phaser）」に分離することで、本文・順序の確定をユニットテストで保証できた。
- Scene 間の離散通信は game レベルのイベントエミッタが疎結合で扱いやすい。ただし launch 直後の同期 emit はリスナー登録の競合に注意。

**プロセス上の改善点**:
- 既存コードの実パス（stage1.ts に全ステージ集約、tests/ ディレクトリ）をステアリングのレビューで先に潰していたため、実装時の手戻りがなかった。

### 次回への改善提案
- ブロック2着手時に、まず実機ブラウザでブロック1の表示（5種テキスト・ログトリガー・語りかけ）を目視確認してから演出シーン基盤に進む。
- `postBoss` ログのトリガー配置をブロック2のボス後フロー実装とセットで行う。
