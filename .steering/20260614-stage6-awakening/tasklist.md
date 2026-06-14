# タスクリスト: RAY強化イベントを Stage6 開始へ移設

ブランチ: `feature/stage6-awakening`
設計: [design.md](./design.md) / 要求: [requirements.md](./requirements.md)

## config 層
- [x] `registryKeys.ts`: `PROGRESS` グループ（`playerEmpowered`）を削除
- [x] `stages.ts`: STAGE5 から `postBossCutsceneKey` を削除（通常クリア経路へ復帰）。ヘッダコメント整理
- [x] `stages.ts`: STAGE6 に `introCutsceneKey: 'stage6-awakening'` を追加（`introCutsceneCoversStartText` は立てない）
- [x] `cutscenes.ts`: `STAGE5_AWAKENING`→`STAGE6_AWAKENING` リネーム（key/定数名/コメント）＋本文を Stage6 舞台へ書き直し。CUTSCENES マップ更新
- [x] `stage5.ts`: `inner.bossDefeated = 'この気持ちは、私のものだ。それでいい'` を復元

## scene 層
- [x] `GameScene.ts`: `createPlayer` を `stageId === 'stage6'` 判定へ置換（registry 読み出し撤去）
- [x] `GameScene.ts`: `init` の `fromStageSelect` 分岐・`finalizeEnding` の registry 行・`GameSceneData.fromStageSelect`・`PROGRESS` import を撤去
- [x] `GameScene.ts`: デッドメソッド `enterPostBossCutscene` / `finalizePostBossClear` を削除。`handleClear` の cage 二分岐を救出フロー単一へ整理
- [x] `TitleScene.ts`: `startGame` から `fromStageSelect: true` を除去

## テスト（ギュレル）
- [x] `cutscenes.test.ts`: `stage6-awakening` の登録・冒頭ト書き・rayInner/direction のみ・禁止語なし・旧キー undefined を検証
- [x] `storyData.test.ts`: stage5 `inner.bossDefeated` 直接検証・`postBossCutsceneKey` は stage3 のみ・stage6 の introCutsceneKey/coversStartText falsy を検証

## docs
- [x] `story.md`: Stage6 開始ビートに覚醒（強化獲得）演出を明記。Stage5 撃破内心を src と同期

## 検証
- [x] lint / typecheck / test(460 passed) / build 全green
- [x] セキュリティレビュー（クルトワ）: Critical/High ゼロ・コミット可
- [ ] 実機 Playwright 検証（Stage6 強化・覚醒演出・リトライ維持・Stage5 撃破内心）: 共有ブラウザが並行セッションで占有中のため保留
