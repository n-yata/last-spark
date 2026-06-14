# 設計書

## アーキテクチャ概要

演出シーンは独立した Phaser Scene（`CutsceneScene`）として実装し、GameScene の上にオーバーレイ起動する。これにより「ゲームを止めて演出 → 終わったら戻る／次へ」の制御がシーン遷移で自然に表現できる。Stage 3 のデータはブロック1で確立した `StageData` / `config/story/` のパターンに従って追加する。

```
GameScene（ボス撃破）
   │ launch CutsceneScene(script='stage3-rescue')
   ▼
CutsceneScene（静止画＋交互テキスト＋ト書き、タップ送り）
   │ 完了
   ▼
ClearScene（クリア処理・SaveManager.markStageCleared）
```

## コンポーネント設計

### 1. CutsceneScene（Sceneレイヤー / `src/scenes/CutsceneScene.ts`）

**責務**:
- 演出スクリプト（テキストの並び）を受け取り、順番に表示する
- 話者種別（terraLine / rayInner / ト書き）でスタイルを切り替える（ブロック1の StoryOverlay スタイルを再利用）
- タップ送り、最後に指定の遷移（GameScene 再開 or 次シーン）を行う

**実装の要点**:
- 起動データの型を明示する（ブロック3-5が再利用するため）:
  ```typescript
  // src/types/story.ts に追加
  interface CutsceneSceneData {
    scriptKey: string;        // cutscenes.ts のキー
    onComplete: () => void;   // 完了後の遷移（GameScene resume / 次シーン起動）
  }
  ```
- `init(data: CutsceneSceneData)` でスクリプトと完了後の遷移先を受ける
- 背景は静止画的な簡易演出（単色＋キャラのシルエット/簡易グラフィック）。アセット未調達でも成立するようプレースホルダ可
- ブロック1の `StoryTextKind` のスタイルマップを共有する

### 2. 演出スクリプト定義（`src/config/story/cutscenes.ts`）

**責務**: `docs/story.md`「TERRAのセリフ」確定版を演出スクリプトとして保持する

```typescript
type CutsceneLine =
  | { kind: 'terraLine'; text: string }
  | { kind: 'rayInner'; text: string }
  | { kind: 'direction'; text: string };  // ト書き

interface Cutscene { key: string; lines: CutsceneLine[] }
```

**実装の要点**:
- Stage 3 救出シーン（刻印で名前判明を含む）を転記
- Stage 4-6 の演出もこのファイル形式で後から追加できる（後続ブロックの前提）

### 3. Stage 3 ステージデータ（ジオメトリ=`config/stage1.ts`、テキスト=`config/story/stage3.ts`）

**責務**: 収容施設の地形・敵・ログトリガー・ボス・ケージギミックを定義

**実装の要点**:
- ジオメトリ（地形・敵・logTriggers・ボストリガー・nextStageId・bossKind）は **`src/config/stage1.ts` の `STAGES` テーブルに `STAGE3` を追加**する（ブロック1で確定したファイル配置方針に従う）。確定テキストは `config/story/stage3.ts`
- **stage2 → stage3 の連結**: `src/config/stage1.ts` の `STAGE2` 定義に `nextStageId: 'stage3'` を追加（現在 STAGE2 は最終ステージで未設定）。`STAGE3` は最終ではないので `nextStageId: 'stage4'`（stage4 は後続ブロックで実体追加。連結だけ先行設定可）
- ボス「収容番人」は接地型（`bossKind='ground'`）。`balance.ts` に `CONTAINMENT_WARDEN` チューニングを追加
- 遅いが重い単発攻撃の表現方針: **既存 `GROUND_WEIGHTS` の枠組みを流用し、`balance.ts` のパラメータ（行動間隔を長く・攻撃の威力を高く）で差別化する**。`BossAction` 型に新アクションは追加しない（収容番人は既存の move/shoot/idle/jump で成立）
- 収容ケージは見た目オブジェクト。ボス撃破イベントで解錠アニメ

### 4. SaveData 拡張（`src/systems/SaveManager` 周辺）

**責務**: ステージ単位のクリア状況を保存する

現行（`src/types/save.ts`）は `cleared: boolean` と `bestTimeMs?: number`（単一値）。これを多ステージ対応へ拡張する:

```typescript
interface SaveData {
  version: number;              // 上げる（マイグレーション）
  clearedStages: string[];      // クリア済みステージID（旧 cleared:boolean から移行）
  bestTimeMs?: Record<string, number>; // ステージ別ベストタイム（旧 number から移行）
  settings: GameSettings;
}
```

**実装の要点**:
- 旧 `cleared: boolean === true` を読んだら `clearedStages: ['stage1']` へマイグレート（false なら `[]`）
- 旧 `bestTimeMs?: number` を読んだら `{ stage1: oldValue }` へマイグレート（undefined ならキーなし）
- `markStageCleared(stageId, timeMs?)` を追加。既存 `markCleared(timeMs)` は `markStageCleared('stage1', timeMs)` に委譲する形で互換維持
- version 不一致・不正値時は既定値フォールバック（既存方針踏襲。進行不能にしない）

### 5. ボス撃破後フロー拡張（`GameScene` / `ClearScene`）

**責務**: ボス撃破→ボス後ログ→ボス後演出→クリアの順序制御

**実装の要点**:
- ステージ定義に「ボス後演出スクリプトキー（任意）」を持たせる
- 撃破時: ボス後ログトリガーは既存の任意接触のまま。演出シーンは撃破で自動発火
- 演出キーが無いステージ（Stage 1-2）は従来どおり直接 ClearScene へ（後方互換）

## データフロー

### Stage 3 ボス撃破〜救出演出
```
1. 収容番人 HP0 → GameScene が撃破処理
2. 収容ケージ解錠アニメ
3. CutsceneScene('stage3-rescue') を launch、GameScene を pause
4. TERRAセリフ↔RAY内心↔ト書き（刻印）を順に表示
5. 完了 → ClearScene へ。SaveManager.markStageCleared('stage3')
```

## テスト戦略

### ユニットテスト
- SaveManager: 旧形式→新形式マイグレーション、`markStageCleared`、フォールバック
- Cutscene スクリプトの整合（Stage 3 救出スクリプトが必要な行を持つ）
- ボス後フロー分岐（演出キーあり/なし）の純粋判定

### 統合テスト
- Stage 3 到達→ボス撃破→演出→クリアの遷移が成立する

## ディレクトリ構造

```
src/
├── scenes/CutsceneScene.ts        # 新規: 演出シーン
├── types/story.ts                 # 変更: CutsceneSceneData 型を追加
├── config/story/
│   ├── cutscenes.ts               # 新規: 演出スクリプト（Stage 3〜）
│   └── stage3.ts                  # 新規: Stage 3 確定テキスト
├── config/stage1.ts               # 変更: STAGE3 を STAGES に追加 + STAGE2.nextStageId='stage3'
├── config/balance.ts              # 変更: 収容番人パラメータ
├── types/save.ts                  # 変更: clearedStages / bestTimeMs を Record 化
├── persistence/SaveManager.ts     # 変更: マイグレーション + markStageCleared
├── scenes/GameScene.ts            # 変更: ボス後演出フロー
└── scenes/ClearScene.ts           # 変更: markStageCleared 呼び出し
```

> 収容番人は既存 `GROUND_WEIGHTS` を流用するため `bossAi.ts` の変更は不要（差別化は balance.ts のパラメータのみ）。

## 実装の順序

1. SaveData 拡張＋マイグレーション＋テスト（独立して進められる）
2. CutsceneScene ＋ cutscenes.ts（Stage 3 救出スクリプト）
3. Stage 3 ステージデータ・ボス・ケージ
4. ボス撃破後フロー拡張（演出キー分岐）
5. Stage 3 確定テキスト組み込み・通し確認
6. テスト・lint・typecheck・build
7. functional-design.md 更新（演出シーン・SaveData 変更）

## セキュリティ考慮事項
- localStorage マイグレーションは不正値で進行不能にならないよう既定フォールバック

## パフォーマンス考慮事項
- 演出シーンは静止画＋テキストのみで軽量

## 将来の拡張性
- CutsceneScene は scriptKey 差し替えで Stage 4-6 の演出に再利用
- clearedStages 化により Stage 4-6 追加時の保存はデータ追加だけで済む
