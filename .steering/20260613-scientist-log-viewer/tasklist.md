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

## フェーズ1: 拾得時の演出スリム化（Step1・渋滞解消）

- [x] `GameScene.onLogOverlap` から科学者ログ本文(`logFound`)の表示を除去
  - [x] 最初のログ分岐の `resolveStoryEvent(..., { type: 'logFound', slot })` push を除去
  - [x] 2本目以降分岐の `logFound` push を除去（2本目以降は内心も本文も出さず収集のみ）
  - [x] RAY 内心(`firstLogFound` / `firstLogRead`)の表示は維持されることを確認
  - [x] 内心が本文抜きで直結したときの文意を確認（firstLogFound→firstLogRead の直結。違和感なしと判断）

## フェーズ2: ログ収集状態の永続化（Step2）

- [x] `src/types/save.ts` に `SaveData.collectedLogs: string[]` を追加
- [x] `src/config/storageKeys.ts` の `SAVE_VERSION` を 2→3 に更新（コメントに v3 仕様追記）
- [x] `SaveManager` の収集 API・コピー・検証を実装
  - [x] `defaultSaveData()` に `collectedLogs: []` を追加
  - [x] `getData()` / `save()` のディープコピーに `collectedLogs` を追加
  - [x] `isValidSaveData()` に collectedLogs の配列検証を追加
  - [x] `markLogCollected(stageId, slot)` を実装（キー `${stageId}:${slot}`・重複追加なし）
  - [x] `getCollectedLogs(): string[]` を実装（コピーを返す）
- [x] **v2→v3 マイグレーションを `migrate()` に追加（最重要・進捗破損防止）**
  - [x] version:2 + clearedStages 等を持つデータを collectedLogs:[] 補完で v3 に移行
  - [x] bestTimeMs / settings は既存検証を流用し不正時は既定へフォールバック
  - [x] v1 既存マイグレーションを壊さない
- [x] `GameScene` から `saveManager.markLogCollected(stageId, slot)` を呼ぶ
  - [x] SaveManager をフィールドで1インスタンス保持（取得ごとに new しない・クリア時の new も統一）
- [x] SaveManager テストを追加
  - [x] v2→v3 移行で clearedStages/bestTimeMs/settings が維持され collectedLogs:[] が補完される
  - [x] `markLogCollected` で追加・重複なしを検証
  - [x] `getCollectedLogs` が保存値を返す（コピー性も検証）
  - [x] localStorage 例外時に throw せず既定値（既存方針）
  - [x] v1 マイグレーション回帰が通る

## フェーズ3: 取得トースト（Step3）

- [x] 「ログを取得」トーストを実装（`src/ui/Toast.ts`・HUD 隅・約1.2秒で自動消去・StoryOverlay とは別系統）
  - [x] ゲームを pause しない
  - [x] HUD（UIScene）上に配置し、`scale.width` 基準・`scrollFactor(0)` でレイアウト
- [x] `onLogOverlap` からトーストを発火
  - [x] `HUD.toast` registry キーを追加し、GameScene が積み UIScene が drain（StoryOverlay の pending と同方式）

## フェーズ4: ログ閲覧画面（Step4）

- [x] `src/scenes/LogViewerScene.ts` を新規作成（呼び出し元非依存・SaveData を直接参照）
  - [x] 全ログ母集合を `STAGE_IDS` × `story.logs` キーから構築
  - [x] `getCollectedLogs()` と突き合わせ、取得済みは本文・未取得は「???」ロック表示
  - [x] 一覧 → 本文の表示（1画面構成、重厚にしない）
  - [x] `scientistLog` の VISUALS（暖色・serif）を流用
  - [x] 閉じてタイトルに戻る導線（戻るボタン / ESC / BACKSPACE）
  - [x] `story.logs[slot]` 欠落時に throw しない（母集合は logs 由来のみで構築するため不整合に強い）
- [x] 閲覧振り分けロジックを純粋関数化して切り出しテスト（`src/systems/logCollection.ts`）
- [x] ~~CutsceneScene の launch/閉じる作法を踏襲~~（方針変更: Title の `startZone` との入力競合を避けるため、`transitionTo`（scene.start）による全画面遷移を採用。閉じるも `transitionTo(title)`。呼び出し元非依存である点は維持）

## フェーズ5: タイトル導線（Step5）

- [x] `src/config/sceneKeys.ts` に `logViewer` キーを追加
- [x] ~~`src/config/gameConfig.ts` の scene 配列に登録~~（実態に合わせ修正: 本プロジェクトは scene を `main.ts` で注入する構成のため `main.ts` に LogViewerScene を登録）
- [x] `src/scenes/TitleScene.ts` に「記録ログ」導線を追加（`startZone` より後に追加し topOnly で前面化＝DEV MODE と同じ作法）。`transitionTo` で LogViewerScene へ遷移

## フェーズ6: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npx vitest run` → 32ファイル / 358 tests green
- [x] リントエラーがないことを確認
  - [x] `npm run lint` → 指摘なし
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck` → エラーなし
- [x] ビルドが成功することを確認
  - [x] `npm run build` → 完走（PWA 生成まで・チャンクサイズ警告は既存）
- [x] 既存テスト（storyData.test.ts / coreBoss.test.ts 等）の回帰がないことを確認

## フェーズ7: セキュリティレビューとドキュメント

- [x] クルトワ（security-engineer）によるセキュリティレビュー（ハードコーディング観点含む）
- [x] Critical/High 指摘があれば修正 → 指摘なし（Critical/High/Medium/Low すべてゼロ・コミット可）
- [x] 実装後の振り返り（このファイル下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-13

### 計画と実績の差分

**計画と異なった点**:
- フェーズ4: 雛形を CutsceneScene の launch/閉じる作法とする計画だったが、Title の全画面 `startZone` との入力競合を避けるため `transitionTo`（scene.start）の全画面遷移に変更。呼び出し元非依存の設計は維持。
- フェーズ5: scene 登録先を `gameConfig.ts` と記載していたが、本プロジェクトは `main.ts` で scene 配列を注入する構成のため登録先は `main.ts`。

**新たに必要になったタスク**:
- トースト配線用に `HUD.toast` registry キーを追加（StoryOverlay の pending drain と同方式に揃えた）。

**技術的理由でスキップしたタスク**:
- なし。

### 学んだこと

**技術的な学び**:
- GameScene → UIScene の状態受け渡しは registry drain が確立パターン。トーストも同方式に乗せることで Scene 間直接参照を増やさず疎結合を保てた。
- 閲覧ロジックを純粋関数（logCollection.ts）に切り出したことで、Phaser 非依存に母集合構築・取得突き合わせ・ロックラベルを網羅テストできた。

**プロセス上の改善点**:
- セッション引き継ぎ時、参照を指示された HANDOFF.md は存在しなかった。サマリーを信頼せず git diff / typecheck / vitest を生出力で確認してから再開したことで、実態（Step1・2 完了／Step3 トーストは未配線）を正確に把握できた。

### 次回への改善提案
- 閲覧画面の入口は現状タイトルのみ（スコープ外）。将来、プレイ中の HUD ボタン + pause からの導線を追加する際は、LogViewerScene を launch/overlay 化する設計に寄せ直す余地がある。
