# 設計書

## アーキテクチャ概要

ブロック1-2の基盤に Stage 6 データを追加しつつ、(1)複数フェーズのラスボス、(2)エンディング演出という2つの特別要素を実装する。エンディングは複数の演出ステップ（テキスト→演出シーン→セリフ→エンディングテキスト）の連結であり、ブロック2の `CutsceneScene` を複数ステップで再生する形にする。

## コンポーネント設計

### 1. Stage 6 ステージデータ
**責務**: 支配中枢の地形・敵・序盤ログ・ボストリガー
**実装の要点**:
- ジオメトリは `src/config/stage1.ts` の `STAGES` に `STAGE6` を追加。テキストは `config/story/stage6.ts`
- ログは序盤の1本のみ（story.md 準拠：ボス前後ログなし）
- 最終ステージ（`nextStageId` なし）。`STAGE5.nextStageId='stage6'` の確認
- **最終ステージの撃破後分岐**: 現行は撃破→ClearScene。Stage 6 は撃破→エンディングシーケンス→全クリア保存→Title。`nextStageId` 無し かつ stage6 のとき、ClearScene の代わりにエンディングへ遷移する分岐を `GameScene`/`ClearScene` 側に設ける

### 2. ECLIPSE本体（複数フェーズ）ボス
**責務**: 支援型→直接攻撃型の2フェーズ以上のラスボス
**実装の要点**:
- 既存の `BossPhase`（phase1/phase2）の枠組みを流用（phase1=支援型、phase2=直接攻撃型）
- 前半フェーズ（配下召喚）: **Boss クラス自身が配下を生成する**方式に決定。`SpawnSystem` はボストリガー後は新規出現を止める既存挙動のため、ボス戦中の動的召喚は SpawnSystem に依存せず、Boss が `shoot` 相当のアクションとして配下 Enemy を直接 spawn する（既存の Enemy 生成・オブジェクトプールを流用）。新 `BossAction` として `summon` を追加し、ECLIPSE_CORE 専用の重みテーブルに閉じる
- 後半フェーズ: コア本体への直接攻撃が通る挙動（phase2 で `summon` を止め、コアの攻撃に切替）
- 人型でない巨大コアの見た目（リグではなく専用表現。プレースホルダ可）
- `balance.ts` に `ECLIPSE_CORE` パラメータ追加
- フェーズ移行条件は HP 50%（既存 `phase2HpRatio` を流用）。phase1→phase2 で召喚を止め攻撃様式を変える

### 3. エンディング演出（EndingSequence）
**責務**: story.md「Stage 6 結末演出の詳細構成」の4ステップを順に再生
**実装の要点**:
- ステップ1: ECLIPSE撃破→管理解除テキスト（「ECLIPSEの管理が、解除された」）
- ステップ2: 演出シーン（廃墟の外・人間を初めて直接描写・争いの痕跡）
- ステップ3: TERRAとのセリフ交換（cutscenes に Stage 6 結末スクリプト）
- ステップ4: エンディングテキスト（「終わりではなく、始まり。…」）
- `CutsceneScene` を複数ステップ連結で再生 or 専用 `EndingScene` を新設（実装時判断）
- 人間の直接描写は「TERRA以外の人間が初めて姿を見せる」演出（プレースホルダのシルエット可）
- **エンディング BGM**: エンディングシーケンス開始時に `SoundManager.playBgm('ending')` を呼ぶ（`ending` トラックはブロック6で実装。ブロック6未完なら呼び出しは no-op になるよう、キー未登録時は無音フォールバック）

### 4. 全クリア処理（ClearScene / TitleScene / SaveManager）
**責務**: stage6 クリアで全クリアを保存し、タイトルへ
**実装の要点**:
- `markStageCleared('stage6')`
- 全ステージ clearedStages に揃った状態を「全クリア」と判定する純粋関数
- TitleScene で全クリア表示（素地）

## データフロー
```
stage5 クリア → stage6 開始
→ 開始テキスト → 序盤ログ（任意）→ ボス前語りかけ → ECLIPSE本体戦
   フェーズ1（配下召喚）→ フェーズ2（コア直接攻撃）
→ 撃破 → エンディングシーケンス
   管理解除 → 演出（人間描写）→ TERRAセリフ → エンディングテキスト
→ 全クリア保存 → タイトルへ
```

## テスト戦略
- `config/story/stage6` が必要キー（序盤ログ・開始・内心）を持つ
- 全クリア判定の純粋関数（clearedStages が全て揃ったか）
- ボスのフェーズ移行ロジック（純粋部分）
- 最終ステージ（nextStageId なし）→ エンディング分岐

## ディレクトリ構造
```
src/
├── config/story/stage6.ts        # 新規: Stage 6 確定テキスト
├── config/story/cutscenes.ts     # 変更: Stage 6 結末スクリプト
├── config/stage1.ts              # 変更: STAGE6 を STAGES に追加（最終・nextStageId なし）
├── config/balance.ts             # 変更: ECLIPSE_CORE
├── types/boss.ts                 # 変更: BossAction に 'summon' を追加
├── systems/bossAi.ts             # 変更: ラスボス専用重みテーブル（フェーズ別召喚/攻撃）
├── scenes/EndingScene.ts(任意)    # 新規 or CutsceneScene 連結で代替
├── scenes/GameScene.ts           # 変更: 最終ステージ撃破→エンディング分岐
├── scenes/ClearScene.ts          # 変更: 最終ステージ分岐
└── scenes/TitleScene.ts          # 変更: 全クリア表示
```

## 実装の順序
1. Stage 6 ステージデータ・連結（最終ステージ）
2. ECLIPSE本体ボス（複数フェーズ・配下召喚・コア攻撃）
3. エンディングシーケンス（4ステップ）
4. 全クリア処理・タイトル表示
5. Stage 6 確定テキスト組み込み・通し確認
6. テスト・lint・typecheck・build
7. functional-design.md 更新（画面遷移にエンディング追加）

## パフォーマンス考慮事項
- ラスボスの配下召喚は既存オブジェクトプールを活用し生成負荷を抑える

## 将来の拡張性
- エンディング後の周回・難易度選択は将来の別ブロックで対応可能な構造にする
