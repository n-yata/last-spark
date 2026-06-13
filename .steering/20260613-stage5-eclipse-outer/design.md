# 設計書

## アーキテクチャ概要

ブロック1-2の基盤に Stage 5 データを追加する。新規システムは作らず、既存パターンへのデータ追加と高速型ボス1体の挙動実装が中心。高速型は stage2 の `FlyingBoss`（ヒット&アウェイの dive）の知見を流用できる。

## コンポーネント設計

### 1. Stage 5 ステージデータ
**責務**: 外縁部の地形・敵・ログトリガー・ボストリガー・環境表現
**実装の要点**:
- ジオメトリは `src/config/stage1.ts` の `STAGES` に `STAGE5` を追加。テキストは `config/story/stage5.ts`
- 機械密度の高い外縁部の環境表現（プレースホルダ可）
- `STAGE5.nextStageId='stage6'`

### 2. ECLIPSEの使者（高速型）ボス
**責務**: 高速移動・連続攻撃のヒット&アウェイ
**実装の要点**:
- **既存の `FlyingBoss`（stage2）を基底とする**。流線型・高速・ヒット&アウェイは FlyingBoss の `dive`（急降下→高度復帰）と最も相性がよい。`bossKind='flying'` 相当で生成
- `balance.ts` に `ENVOY`（`FlyingBossConfig` 形式）パラメータを追加（高速・短い行動間隔・dive頻度高め）
- 予測しにくさは既存 `FLYING_WEIGHTS` の枠組みで重み・速度を調整して表現（`BossAction` 追加は不要）

### 3. Stage 5 確定テキスト・演出
**責務**: story.md の Stage 5 テキストを `config/story/stage5.ts`・`cutscenes.ts` に転記
**実装の要点**:
- 遺言ログ（クライマックス）の解錠が正しく機能すること
- ステージ開始演出（TERRA同行）を追加

## データフロー
```
stage4 クリア → stage5 開始
→ 開始テキスト → 開始演出（TERRA）→ プレイ
→ ログ接触（遺志）→ ボス前語りかけ → 使者戦
→ 撃破 → ボス後ログ（任意接触）→ クリア（markStageCleared('stage5', timeMs)）
```

> **ボス後演出シーンなし**: Stage 5 もボス後演出を持たない（ブロック2の「ボス後演出キーなし」分岐に乗る）。

## テスト戦略
- `config/story/stage5` が必要キーを持つ
- 高速ボスの挙動パラメータ（純粋ロジックがあれば）
- ステージ連結（stage4→stage5→stage6）

## ディレクトリ構造
```
src/
├── config/story/stage5.ts     # 新規: Stage 5 確定テキスト
├── config/story/cutscenes.ts  # 変更: Stage 5 開始演出
├── config/stage1.ts           # 変更: STAGE5 を STAGES に追加
├── config/balance.ts          # 変更: 使者（ENVOY / FlyingBossConfig 形式）
└── entities/FlyingBoss.ts     # 流用（必要なら ENVOY 用の微調整のみ）
```
> 使者は既存 `FlyingBoss` + `FLYING_WEIGHTS` を流用するため `bossAi.ts` / `BossAction` の変更は不要。

## 実装の順序
1. Stage 5 ステージデータ・連結
2. ECLIPSEの使者ボス（高速・ヒット&アウェイ）
3. Stage 5 確定テキスト・開始演出
4. 通し確認
5. テスト・lint・typecheck・build

## 将来の拡張性
- 高速ボスの挙動は Stage 6 第1フェーズの「配下召喚」演出でも知見を流用できる
