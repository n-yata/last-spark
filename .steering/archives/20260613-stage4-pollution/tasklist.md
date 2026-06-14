# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 前提
- ブロック1（storytelling-foundation）・ブロック2（cutscene-stage3）が完了していること

---

## フェーズ1: Stage 4 ステージデータ

- [x] `src/config/story/stage4.ts`（開始テキスト・ログ3本・語りかけ・内心）
- [x] `src/config/stage1.ts` の `STAGES` に `STAGE4` を追加（地形・敵・logTriggers・ボストリガー・`bossKind:'ground'`・`bossVariant:'purifier'`）
  - ⚠ `nextStageId:'stage5'` は**設定しない**。stage5 が未実装のため設定すると ClearScene が未登録 ID へ遷移し `getStageData` が stage1 にフォールバック（stage1 を再プレイしてしまう）。stage3 と同じく「実体ができ次第 next を付ける」方針に従い、stage4 を現状の最終ステージ扱いとする（依存関係による技術的スキップ）。
- [x] `STAGE3.nextStageId='stage4'` を設定（ブロック2時点では未設定だったため本ブロックで設定）
- [x] 汚染地帯の環境表現（`StageData.backgroundColor` を追加し、stage4 を緑がかった土気色 `#151a0c` に。プレースホルダの環境表現）

## フェーズ2: 環境管理機（浄化型）ボス

- [x] `src/types/boss.ts` の `BossAction` に `'spray'` を追加
- [x] `balance.ts` に環境管理機（`PURIFIER` / `PurifierBossConfig`）パラメータを追加（spray 弾数・開き角・速度を含む）
- [x] `bossAi.ts` に浄化型の重みテーブル（`PURIFIER_WEIGHTS`）+ `pickNextPurifierBossAction` / `allowedPurifierActions` を追加＋テスト（`tests/unit/systems/purifierBossAi.test.ts`）
- [x] 毒・スプレー系の範囲攻撃（`spray` アクション）の実装（`src/entities/PurifierBoss.ts` の `fireSpray`：扇状に複数弾を散布。GameScene.spawnBoss で `bossVariant==='purifier'` 時に生成）

## フェーズ3: テキスト・演出組み込み

- [x] `cutscenes.ts` に Stage 4 開始演出（`stage4-intro`・TERRA同行）を追加
- [x] ステージ開始時に開始演出を再生（`StageData.introCutsceneKey` + `GameScene.startIntro/finishIntro`。演出→開始テキストの順）
- [x] 開始テキスト・ログ・語りかけ・内心が確定版どおり表示される（`storyData.test.ts` / `cutscenes.test.ts` で確定テキスト一致を検証。ボス前内心は bossIntro 直後に `eclipseReaction`、ボス後内心は撃破→クリア前に `bossDefeated` を発火）

## フェーズ4: 通し確認

> 注: リモート実行環境はブラウザ（Chromium）のダウンロードがネットワークポリシーで遮断され、実機プレイ確認は不可。代わりに静的検証（typecheck/lint/build）とユニットテストで配線・到達性・記録経路を保証した。
- [x] Stage 4 に到達し環境管理機と戦える（`stage3→stage4` 連結・`bossVariant='purifier'`→`PurifierBoss` 生成をコード+テストで確認）
- [x] 範囲攻撃が機能する（`spray` 抽選を `purifierBossAi.test.ts` で検証・`fireSpray` で扇状散布を実装）
- [x] クリアで stage4 が記録される（既存 `ClearScene.markStageCleared('stage4', timeMs)` 経路。`stageId` 連携を確認）

## フェーズ5: 品質チェックと修正

- [x] `npm test`（260 件すべて pass）
- [x] `npm run lint`（エラーなし）
- [x] `npm run typecheck`（エラーなし）
- [x] `npm run build`（成功。チャンクサイズ警告は既存事項）

## フェーズ6: ドキュメント更新

- [x] `docs/functional-design.md` 更新（`BossAction` に spray、`BossVariant`、StageData の `bossVariant`/`introCutsceneKey`/`backgroundColor`、`PurifierBoss` のボス系統説明、stage4 までの連結を反映）
- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-13

### 計画と実績の差分
**計画と異なった点**:
- **`STAGE4.nextStageId='stage5'` は設定しなかった**。tasklist の当初記載では設定する想定だったが、stage5 が未実装のため設定すると ClearScene が未登録 ID へ遷移し `getStageData` が stage1 へフォールバックして stage1 を再プレイしてしまう。stage3 が「stage4 実装まで next 未設定」だった前例に倣い、stage4 を現状の最終ステージ扱いとした（依存関係による技術的判断。ブロック4で stage5 実装時に `nextStageId='stage5'` を付ける）。
- **開始演出と開始テキストの順序**: design の data flow 図は「開始テキスト→開始演出→プレイ」だったが、開始テキスト（StoryOverlay 内で完結し GameScene から完了を検知する手段がない）の後に演出を差し込む配線は脆くなるため、「開始演出→開始テキスト→プレイ」の順に実装した（救出演出と同じ CutsceneScene 起動パターンを再利用でき堅牢）。演出で汚染地帯を提示→RAY のナレーション開始テキスト、という流れで物語上も自然。
- **ボス前/ボス後の内心トリガを汎用化して追加**: 既存の内心トリガ（terraFound 等）では stage4 の「ECLIPSEは……正しいのか（ボス前）」「TERRAの顔が浮かぶ（ボス後）」を出せないため、`eclipseReaction`（bossIntro 直後）と `bossDefeated`（撃破→クリア前）の2つの汎用 inner キーを追加した。該当キーを持たない stage1-3 では空配列となり挙動は不変。

**新たに必要になったタスク**:
- ボス撃破後にクリア遷移前へ内心を差し込むため `GameScene.handleClear` を `finishStageClear` に切り出し、`bossDefeated` 内心があれば読了時間ぶん待ってから遷移するよう拡張（内心がなければ即遷移＝stage1-3 は不変）。
- `StageData` に `bossVariant` / `introCutsceneKey` / `backgroundColor` の3フィールドを追加。

### 学んだこと
**技術的な学び**:
- 新ボスは「Boss を継承し `beginNextAction` だけ上書き + 専用重みテーブル」で最小差分に収められた（FlyingBoss と同じ拡張パターン）。範囲攻撃 `spray` も既存の `Projectile` プールを流用し、発射後に鉛直速度を与えるだけで扇状にできた。
- ステージ追加は「データ追加（stage1.ts / story/stage4.ts / cutscenes.ts / index.ts）＋ 1分岐（spawnBoss）」が中心で、ブロック1-2の基盤（StageData 駆動・CutsceneScene・clearedStages）が効いている。

**プロセス上の改善点**:
- リモート環境ではブラウザDLが遮断され実機プレイ確認ができないため、純粋ロジック（bossAi / storyDirector）と確定テキストのデータ整合をユニットテストで担保する方針が有効だった。配線（spawnBoss 分岐・連結）もデータテストでカバーした。

### 次回への改善提案
- ブロック4（stage5）実装時に `STAGE4.nextStageId='stage5'` を必ず設定すること（本ブロックで意図的に未設定）。
- 浄化型ボスは描画リグを接地ボス（'boss'）流用のプレースホルダにしている。視覚的識別を強めるなら専用リグ（浄化タンクのシルエット）を後続で追加検討。
- 実機プレイ確認が可能な環境では、stage4 へのステージ選択ショートカット（デバッグ用）があると通し確認が容易になる。
