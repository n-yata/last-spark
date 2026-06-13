# 設計書

## アーキテクチャ概要

ブロック1-2で確立した基盤（`config/story/stageN.ts`、`StageData`、`CutsceneScene`、ボス後フロー、`clearedStages`）に Stage 4 のデータを追加する。新規システムは作らず、既存パターンへのデータ追加とボス1体の挙動実装が中心。

## コンポーネント設計

### 1. Stage 4 ステージデータ
**責務**: 汚染地帯の地形・敵・ログトリガー・ボストリガー・環境表現を定義
**実装の要点**:
- `bossKind='ground'`（環境管理機は接地型を基本とする）
- 汚染表現は背景色・パーティクル等の環境ストーリーテリングで。アセット未調達でもプレースホルダで成立させる
- `nextStageId`: stage4 → stage5

### 2. 環境管理機（浄化型）ボス
**責務**: 毒・スプレー系の範囲攻撃を持つボス
**実装の要点**:
- `balance.ts` に `PURIFIER` 等のパラメータ追加
- 範囲攻撃（スプレー）は既存の弾／エフェクト機構を流用。範囲・持続のパラメータ化
- 既存 `bossAi.ts` の重みテーブルに浄化型の攻撃を追加 or 設定で表現

### 3. Stage 4 確定テキスト・演出
**責務**: story.md の Stage 4 テキストを `config/story/stage4.ts`・`cutscenes.ts` に転記
**実装の要点**:
- ステージ開始演出スクリプト（TERRA同行）を cutscenes に追加し、ステージ開始時に再生

## データフロー
```
stage3 クリア → stage4 開始
→ ステージ開始テキスト → 開始演出（TERRA）→ プレイ
→ ログ接触（任意）→ ボス前語りかけ → 環境管理機戦
→ 撃破 → ボス後ログ → クリア（markStageCleared('stage4')）
```

## テスト戦略
- `config/story/stage4` が必要キーを持つ
- 範囲攻撃パラメータの純粋ロジック（あれば）
- ステージ連結（stage3→stage4→stage5）

## ディレクトリ構造
```
src/
├── config/story/stage4.ts     # 新規
├── config/story/cutscenes.ts  # 変更: Stage 4 開始演出
├── (ステージ定義に stage4)     # 変更
├── config/balance.ts          # 変更: 環境管理機
└── systems/bossAi.ts          # 変更: 浄化型（必要なら）
```

## 実装の順序
1. Stage 4 ステージデータ・連結
2. 環境管理機ボス（範囲攻撃）
3. Stage 4 確定テキスト・開始演出
4. 通し確認
5. テスト・lint・typecheck・build

## 将来の拡張性
- 範囲攻撃の仕組みは後続ボスでも再利用可能にパラメータ化
