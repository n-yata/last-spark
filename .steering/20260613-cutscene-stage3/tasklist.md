# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 前提
- ブロック1（storytelling-foundation）が完了していること

---

## フェーズ1: SaveData 全6ステージ対応

- [ ] `src/types/save.ts`: `cleared:boolean`→`clearedStages:string[]`、`bestTimeMs?:number`→`bestTimeMs?:Record<string,number>`（型・既定値）
- [ ] `SaveManager`: 旧 `cleared` → `clearedStages`（true なら `['stage1']`）のマイグレーション（version 更新）
- [ ] `SaveManager`: 旧 `bestTimeMs:number` → `{ stage1: value }` のマイグレーション
- [ ] `markStageCleared(stageId, timeMs?)` を追加。既存 `markCleared` は委譲で互換維持
- [ ] SaveManager のユニットテストを追加・更新
  - [ ] cleared マイグレーション
  - [ ] bestTimeMs マイグレーション
  - [ ] markStageCleared
  - [ ] 不正値・version不一致フォールバック

## フェーズ2: 演出シーン基盤（CutsceneScene）

- [ ] `src/types/story.ts` に `CutsceneSceneData`（scriptKey / onComplete）型を追加
- [ ] `src/config/story/cutscenes.ts` を作成（型 + Stage 3 救出スクリプト）
- [ ] `src/scenes/CutsceneScene.ts` を作成
  - [ ] `init(data: CutsceneSceneData)`
  - [ ] スクリプトの順次表示（terraLine / rayInner / direction）
  - [ ] ブロック1のスタイルマップ再利用
  - [ ] タップ送り
  - [ ] 完了後の遷移（onComplete）
- [ ] 静止画的な簡易演出背景（プレースホルダ可）
- [ ] Cutscene 整合のユニットテスト

## フェーズ3: Stage 3 ステージデータ

- [ ] `src/config/story/stage3.ts`（開始テキスト・ログ3本・語りかけ・内心）
- [ ] `src/config/stage1.ts` の `STAGES` に `STAGE3` を追加（地形・敵・logTriggers・ボストリガー・`nextStageId:'stage4'`・`bossKind:'ground'`）
- [ ] `src/config/stage1.ts` の `STAGE2` に `nextStageId: 'stage3'` を追加（stage2→stage3 連結）
- [ ] 収容番人ボスのパラメータ（`balance.ts` に `CONTAINMENT_WARDEN`：行動間隔長め・威力高め）
- [ ] 収容番人は既存 `GROUND_WEIGHTS` を流用（bossAi 変更なし。パラメータのみで差別化）
- [ ] 収容ケージのギミック（撃破で解錠アニメ）

## フェーズ4: ボス撃破後フロー拡張

- [ ] ステージ定義に「ボス後演出スクリプトキー（任意）」を追加
- [ ] ボス撃破→ボス後ログ→演出→クリアの順序制御
- [ ] 演出キーなし（Stage 1-2）は従来どおり（後方互換）
- [ ] 分岐ロジックのユニットテスト

## フェーズ5: 統合・通し確認

- [ ] Stage 3 に到達し収容番人と戦える
- [ ] 撃破でケージ解錠→救出演出（刻印で名前判明）が再生される
- [ ] Stage 3 の開始テキスト・ログ・語りかけ・内心が確定版どおり
- [ ] Stage 1-2 が従来どおり動く（後方互換）

## フェーズ6: 品質チェックと修正

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`

## フェーズ7: ドキュメント更新

- [ ] `docs/functional-design.md`（演出シーン・SaveData 変更・画面遷移更新）
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
