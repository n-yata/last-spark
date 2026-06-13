# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: 型とストーリーデータ定義

- [ ] `src/types/story.ts` を作成
  - [ ] `StoryTextKind`（5種）を定義
  - [ ] `StoryTextStyle` / `TextRequest` / `LogFragment` / `StageStory` を定義
- [ ] `src/config/story/stage1.ts` を作成（story.md の Stage 1 確定テキストを転記）
  - [ ] ステージ開始テキスト
  - [ ] ログ3本（序盤・ボス前・ボス後）
  - [ ] ECLIPSEの語りかけ
  - [ ] RAYの内心テキスト（シーンキー→本文）
- [ ] `src/config/story/stage2.ts` を作成（Stage 2 確定テキスト）
- [ ] `src/config/story/index.ts` を作成（`getStageStory(stageId)`）

## フェーズ2: StoryDirector（純粋ロジック）

- [ ] `src/systems/storyDirector.ts` を作成
  - [ ] storyEvent → TextRequest 変換ロジック
  - [ ] 表示順序解決の純粋関数
- [ ] `storyDirector` のユニットテストを作成
  - [ ] 各イベント種別で正しい kind/本文が返る
  - [ ] 表示順序が正しい

## フェーズ3: 表示レイヤー（StoryOverlay）

- [ ] `src/ui/StoryOverlay.ts` を作成
  - [ ] kind→スタイル（位置・色・イタリック等）のマップ
  - [ ] テキスト描画（上部/中央/下部）
  - [ ] フェードイン/アウトのトゥイーン
  - [ ] `pauseGame=true` 時の GameScene 一時停止・タップ再開
- [ ] `src/scenes/UIScene.ts` に StoryOverlay を組み込み

## フェーズ4: ログトリガーとステージデータ拡張

- [ ] `src/entities/LogTrigger.ts` を作成（オーバーラップ判定・一度だけ発火）
- [ ] `StageData` 型に `logTriggers?`（位置＋ログキー）を追加
- [ ] `GameScene` でログトリガーを生成・オーバーラップ検知

## フェーズ5: 発火点の組み込み

- [ ] ステージ開始時に `stageIntro` を発火
- [ ] ログ接触で該当ログを発火
- [ ] ボストリガー直前に `eclipseVoice` を発火（既存 onBossTrigger の前段）
- [ ] 内心トリガ（場所到達・ログ読了・ボス前後）で `rayInner` を発火

## フェーズ6: Stage 1-2 への組み込み確認

- [ ] Stage 1 で開始テキスト・ログ3本・語りかけ・内心が確定版どおり表示される
- [ ] Stage 2 で同上が表示される
- [ ] ログ未接触でもゲームが正常に進行する

## フェーズ7: 品質チェックと修正

- [ ] すべてのテストが通ることを確認
  - [ ] `npm test`
- [ ] リントエラーがないことを確認
  - [ ] `npm run lint`
- [ ] 型エラーがないことを確認
  - [ ] `npm run typecheck`
- [ ] ビルドが成功することを確認
  - [ ] `npm run build`

## フェーズ8: ドキュメント更新

- [ ] `docs/functional-design.md` にテキスト表示システム・ログトリガーを追記
- [ ] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
{YYYY-MM-DD}

### 計画と実績の差分

**計画と異なった点**:
-

**新たに必要になったタスク**:
-

### 学んだこと

**技術的な学び**:
-

**プロセス上の改善点**:
-

### 次回への改善提案
-
