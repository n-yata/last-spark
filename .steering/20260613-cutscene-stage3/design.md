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
- `init(data: { scriptKey, onComplete })` でスクリプトと完了後の遷移先を受ける
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

### 3. Stage 3 ステージデータ（`src/config/story/stage3.ts` + ステージ定義）

**責務**: 収容施設の地形・敵・ログトリガー・ボス・ケージギミックを定義

**実装の要点**:
- ボス「収容番人」は接地型（`bossKind='ground'`）。`balance.ts` に `CONTAINMENT_WARDEN` 等のチューニングを追加
- 遅いが重い単発攻撃 → `bossAi.ts` の重みテーブルを系統追加 or パラメータ調整で表現
- 収容ケージは見た目オブジェクト。ボス撃破イベントで解錠アニメ
- `nextStageId`: stage2 → stage3 の連結を設定

### 4. SaveData 拡張（`src/systems/SaveManager` 周辺）

**責務**: ステージ単位のクリア状況を保存する

```typescript
interface SaveData {
  version: number;              // 上げる（マイグレーション）
  clearedStages: string[];      // クリア済みステージID（旧 cleared:boolean から移行）
  bestTimeMs?: Record<string, number>; // ステージ別ベストタイム（任意）
  settings: GameSettings;
}
```

**実装の要点**:
- 旧 `cleared: boolean` を読んだら `clearedStages: ['stage1']` 相当へマイグレート
- `markStageCleared(stageId)` を追加。`markCleared` は互換のため残すか置換
- version 不一致時は既定値フォールバック（既存方針踏襲）

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
├── config/story/
│   ├── cutscenes.ts               # 新規: 演出スクリプト（Stage 3〜）
│   └── stage3.ts                  # 新規: Stage 3 確定テキスト
├── (ステージ定義に stage3 追加)    # 変更: 地形/敵/ボス/ケージ/logTriggers
├── config/balance.ts              # 変更: 収容番人パラメータ
├── systems/bossAi.ts              # 変更: 重装型の行動（必要なら）
├── systems/SaveManager(該当)       # 変更: clearedStages 化 + マイグレーション
├── scenes/GameScene.ts            # 変更: ボス後演出フロー
└── scenes/ClearScene.ts           # 変更: markStageCleared
```

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
