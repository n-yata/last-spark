# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 前提
- ブロック1・2・3が完了していること

---

## フェーズ1: Stage 5 ステージデータ

- [x] `src/config/story/stage5.ts`（開始テキスト・ログ3本・語りかけ・内心）
- [x] `src/config/stage1.ts` の `STAGES` に `STAGE5` を追加（地形・敵・logTriggers・ボストリガー）
  - `nextStageId` は **stage6 未実装のため意図的に未設定**（後述「計画と異なった点」参照）
- [x] `STAGE4.nextStageId='stage5'` を設定（stage5 実体追加に伴い接続）
- [x] 外縁部の環境表現（背景色 `#0c1119` の青みがかった鋼色。プレースホルダ）

## フェーズ2: ECLIPSEの使者（高速型）ボス

- [x] `balance.ts` に使者パラメータ `ENVOY` を追加（FlyingBossConfig 形式・高速・短い行動間隔・鋭い急降下）
- [x] 既存 `FlyingBoss` を基底に使者を生成（FlyingBoss を config 注入式にパラメータ化し ENVOY を流用）
- [x] `FLYING_WEIGHTS` の枠組みで挙動を調整（BossAction 追加なし。速度・継続時間で「速さ」を表現）

## フェーズ3: テキスト・演出組み込み

- [x] `cutscenes.ts` に Stage 5 開始演出 `stage5-intro`（TERRA同行）を追加
- [x] ステージ開始時に開始演出を再生（既存 `introCutsceneKey` 機構を流用）
- [x] 遺言ログ（クライマックス・postBoss）の組み込み確認（データ整合テストで担保）
- [x] 開始テキスト・ログ・語りかけ・内心が確定版どおり（storyData.test.ts で story.md と一致を検証）

## フェーズ4: 通し確認

- [x] Stage 5 に到達し使者と戦える（連結・系統ディスパッチ・登録をデータ整合テストで担保）
- [x] ヒット&アウェイの挙動が機能する（FlyingBoss の dive 流用 + ENVOY が飛行ボスより高速なことを envoyBoss.test.ts で検証）
- [x] クリアで stage5 が記録される（既存クリアフロー: 演出キーなし分岐 → finishStageClear → markStageCleared）
- [x] ~~実機ブラウザでの表示・挙動の目視確認~~（環境のネットワーク制約で Chromium 取得不可のため未実施。build/typecheck/lint/単体テストで担保。ブロック6着手時に実機目視）

## フェーズ5: 品質チェックと修正

- [x] `npm test`（292 tests passed）
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`

## フェーズ6: ドキュメント更新

- [x] `docs/functional-design.md` 更新（BossKind/BossVariant/BossAction の型コメントを stage5 使者・warden 実態に追従、FlyingBoss の config 流用を追記）
- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-13

### 計画と実績の差分
**計画と異なった点**:
- `STAGE5.nextStageId` を当初計画の `'stage6'` ではなく **未設定**にした。stage6 は未実装のため、`'stage6'` を指すと getStageData が stage1 にフォールバックし、stage5 クリア後に「最初から」始まる不具合になる（stage4 が以前から採っている安全策と同じ）。ClearScene は `nextStageId` 未定義を「最終ステージ」として扱うため、未設定が正しい。stage6 実体追加時（ブロック6）に `nextStageId='stage5'→'stage6'` をセットで接続する。
- 設計は「FlyingBoss を流用」だったが、FlyingBoss が `FLYING_BOSS` 定数をハードコード参照していたため、**コンストラクタで `FlyingBossConfig` を注入できるようパラメータ化**した（既定は `FLYING_BOSS` で stage2 は不変）。これにより stage2/stage5 が同一ロジックを共有し、使者は `ENVOY` 値の差し替えだけで「高速ヒット&アウェイ」を表現できた。
- 「dive頻度高め」は当初パラメータで、と考えたが、`FLYING_WEIGHTS` は系統共有のため重みは触らず（設計どおり BossAction/重み追加なし）、**速度・継続時間・phase2係数**で「速さ・手数の多さ」を表現した。dive の絶対頻度は飛行ボスと同じだが、移動/急降下/復帰が速く行動間隔が短いため体感はより攻撃的になる。

**新たに必要になったタスク**:
- `SpawnSystem` のボス可視トリガー計算が飛行型で `FLYING_BOSS.width` 固定だったため、使者（スリムな `ENVOY.width`）でも正しく機能するよう variant 分岐を追加。
- 開発モードのステージ選択（`devMode/stages.ts`）に stage5 ラベル「ECLIPSE外縁部」を追加（一覧は `STAGE_IDS` 由来で自動導出だが、表示ラベルのみ手動）。
- `ENVOY` の高速・スリム特性を飛行ボスとの相対比較で検証する `envoyBoss.test.ts` を新規追加（タウトロジーでない実挙動の保証）。

### 学んだこと
**技術的な学び**:
- 系統エンティティ（FlyingBoss）を「定数直参照」から「config 注入」へ薄くリファクタするだけで、新ステージのボスを 1 つの定数追加で量産できる構造になった。既定引数を旧定数にすることで既存ステージの挙動を完全に据え置ける。
- ステージ連結は `nextStageId` の有無が「最終ステージ判定」を兼ねるため、未実装の次ステージを先回りで指すと黙ってフォールバックする。実体ができるまで未接続にする既存パターンが、回帰を防ぐ正しい運用だった。

**プロセス上の改善点**:
- 既存の安全策（stage4 の `nextStageId` 未設定コメント・データ整合テスト）を先に読んでいたため、tasklist の `nextStageId='stage6'` の罠に気づき、回帰を未然に防げた。

### 次回への改善提案
- ブロック6（stage6・エンディング）着手時に、まず stage5 を含めた実機ブラウザ目視（使者の高速ヒット&アウェイ、遺言ログ表示、開始演出）を行ってから着手する。
- stage6 実装時に `STAGE5.nextStageId='stage6'` を忘れず接続し、stage5→stage6 連結テストを storyData.test.ts に追加する。
