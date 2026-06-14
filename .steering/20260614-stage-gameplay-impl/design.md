# 設計書

## アーキテクチャ概要

既存のデータ駆動構成（`config/stage1.ts` が全6ステージの正本、`SpawnSystem` が `stageId` で引く、見た目は `PreloadScene` のプロシージャル描画＋`characterRig`）を踏襲する。新規メカニクスはS4毒床1つに絞り、他は既存要素の削除・再配置・色/figureの調整に留める。

```
[削除系] LogTrigger 縦断撤去（利用箇所→定義の順）
  GameScene(生成/接触) → storyDirector(logFound/scientistLog) → StoryOverlay(暖色分岐)
  → types/story.ts(型) → config/stage1.ts(logTriggers) → tests → LogTrigger.ts本体

[追加系] Hazard(毒床) 縦断追加（LogTrigger を雛形に）
  Hazard.ts(overlapエンティティ) → GameScene(生成/overlap→被ダメ) → config(hazards配置) → test

[調整系] ボスfigure/色（PreloadScene/characterRig/balance色）, ステージ構成（config配列の再配置）
```

## コンポーネント設計

### 1. ログ系撤去（削除順序が肝）

**責務**: 物語の口を4つに集約する方針に伴い、科学者ログ系をコードから完全に除去する。

**削除順序（バルベルデ調査に基づく＝利用箇所→定義）**:
1. `GameScene.ts`: `import LogTrigger`、`logTriggers` グループフィールド、`buildLogTriggers()`、`onLogOverlap()`、overlap登録を削除
2. `systems/storyDirector.ts`: `logFound` イベント処理、`scientistLog` の TEXT_STYLES 定義を削除
3. `ui/StoryOverlay.ts`: `scientistLog` の VISUAL 分岐（暖色 serif backdrop）を削除
4. `types/story.ts`: `StoryTextKind` から `'scientistLog'`、`LogSlot`、`StoryEvent` の `logFound`、`StageStory.logs` を削除
5. `config/stage1.ts`: `LogTriggerSpawn` 型、`StageData.logTriggers`、全6ステージの `logTriggers` 配列を削除
6. `config/story/stage1〜6.ts`: 各 `logs` フィールドを削除
7. テスト: `tests/unit/entities/LogTrigger.test.ts` 削除、`storyDirector.test.ts`/`storyData.test.ts`/`coreBoss.test.ts` のログ関連assertion削除
8. `entities/LogTrigger.ts`: ファイル削除（最後）

**実装の要点**:
- 型を先に消すと利用箇所が一斉にコンパイルエラーになり修正漏れが見えにくい。利用箇所→定義の順で、各ステップ後に `typecheck` を回して残参照を潰す
- セーブ層（`SaveManager.ts` の旧v3 `collectedLogs` 無視ロジック、`SaveManager.test.ts` の互換テスト）は**残す**（過去セーブ互換の保証）

### 2. stage6-ending 群衆描写削除

**責務**: エンディングカットシーンから画面に出せない群衆描写を除去する。

**実装の要点**:
- `config/story/cutscenes.ts` のエンディング配列から「施設から人間たちが姿を見せる」ステップ（群衆）を削除
- 「人間どうしが争った跡（落書き・崩れたバリケード）」のト書きは story.md が明示的に容認（実物オブジェクト不要・テキスト描写可）→ **残す**
- ステップ削除後、`cutscenes.test.ts` のステップ数/内容のassertionを追従修正

### 3. ボスの安い手当て

**責務**: ボス挙動を変えず、見た目だけでテーマとの接続を強める。

**S2 哨戒機（単眼/サーチライト）**:
- `characterRig.ts` の `bossFlyingRig` は既に head が `shape:'sensor'`（単眼）。`PreloadScene.ts` の sensor 描画（小箱＋発光アイ）の**アイを強調**、または下方向へ伸びるサーチライト円錐を足す
- 挙動（FlyingBoss.ts のホバリング偵察）は触らない

**S4 環境管理機（毒色）**:
- 現状、毒霧は `TEX.projectileEnemy`（`#ff7a90` ピンク）を流用＝汚染トーンと無関係
- PurifierBoss 専用の毒弾テクスチャ（緑黄系・背景 `#151a0c` と地続き）を `PreloadScene` に追加し、`PurifierBoss.fireSpray` がそれを使うようにする。色定数は1箇所で管理
- 他の敵弾（通常敵）には影響を与えない（専用テクスチャで分離）

**実装の要点**: 色・figureの調整のみ。`balance.ts` の攻撃パラメータ（弾数・角度・速度）は変更しない（回帰防止）。

### 4. Hazard（S4毒床）— 唯一の新規実装

**責務**: 触れている間ダメージを与える静的な床ハザード。

**設計**: `LogTrigger` を雛形にした overlap エンティティ `entities/Hazard.ts`。
- 物理: 重力OFF・immovable・overlap判定のみ（`configureBody` パターンをそのまま流用＝Group.add後の再適用）
- 見た目: 汚染色の半透明矩形（毒だまり）。`PreloadScene` のテクスチャ or Graphics 矩形
- ダメージ: GameScene で player と overlap → 既存のプレイヤー被ダメージ経路を呼ぶ。**連続接触の多重ヒットを防ぐクールダウン**（例: 同一床で N ms に1回）を Hazard 側に持たせる
- config: `StageData` に `hazards?: HazardRect[]`（x,y,width,height）を追加し、S4 に配置

**実装の要点**:
- 既存にダメージ床がないため、プレイヤーの被ダメージAPI（`Player.takeDamage` 相当）を実装時に特定し、毒床から呼ぶ
- 即死ではなくスリップダメージ。ステージがクリア不能にならない配置・ダメージ量にする
- 落下死（`deathY` 閾値）とは別系統。毒床は「触れてもジャンプで脱出できる」表現

### 5. 各ステージ構成の再配置

**責務**: ②設計の「手触り」を既存要素の配置変更で出す。

**実装の要点**:
- `config/stage1.ts` の各ステージの `platforms`/`ladders`/`enemies`/背景色を②表（S1開けて静か〜S6ボス集中）に沿って調整
- **クリア可能性を最優先**（詰み・即死・到達不能を作らない）。再配置は最小限の差分で手触りを出す
- S2は既存梯子の縦攻略を強調、S4は奈落の一部を毒床に置換/併設、S5は足場を詰める

## データフロー

### 毒床ダメージ
```
1. GameScene が config.hazards から Hazard を生成（configureBody再適用）
2. physics.add.overlap(player, hazards, onHazardOverlap)
3. プレイヤーが毒床に重なる → Hazard.tryHit()（クールダウン判定）が true
4. true なら Player.takeDamage(poisonDamage) を呼ぶ
5. プレイヤーがジャンプで離脱 → overlap解消 → ダメージ停止
```

## エラーハンドリング戦略

- ログ撤去で `logs`/`LogSlot` を消すと連鎖的にコンパイルエラーが出る。各削除ステップ後に `npm run typecheck` を回し、残参照を逐次解消する（一括削除→最後にまとめて修正、はしない）
- 毒床の多重ダメージ（フレーム毎ヒット）はクールダウンで防ぐ。クールダウン未実装だと1秒で即死し得るためテストで保証する

## テスト戦略

### ユニットテスト
- `Hazard`: クールダウンで多重ヒットが抑制されること、`tryHit` の境界（クールダウン直後/経過後）
- `config/storyData`（既存）: ログ関連describeを削除し、残りが通ること
- `cutscenes`（既存）: 群衆ステップ削除後のステップ構成
- `storyDirector`（既存）: `scientistLog`/`logFound` 削除後の挙動
- `stage1`/各ステージ config: 再配置後も到達可能な配置（既存テストがあれば追従、なければ最小限の配置検証）

### 統合テスト（手動／E2E）
- 各ステージを起動してログ参照エラーが出ないこと
- S4で毒床に触れてダメージ→ジャンプで脱出できること
- S2/S4ボスの見た目が変わり、挙動は従来通りであること

## ディレクトリ構造

```
src/
  entities/
    LogTrigger.ts        … 削除
    Hazard.ts            … 新規（毒床）
  scenes/
    GameScene.ts         … ログ生成/接触を削除、毒床生成/overlap追加
    PreloadScene.ts      … 毒弾テクスチャ追加、S2 sensor描画の強調
  systems/
    storyDirector.ts     … logFound/scientistLog 削除
  ui/
    StoryOverlay.ts      … scientistLog 分岐削除
  types/
    story.ts             … scientistLog/LogSlot/logFound/logs 削除
  config/
    stage1.ts            … logTriggers 削除、hazards 追加、構成再配置
    characterRig.ts      … S2 sensor 強調（必要なら）
    balance.ts           … 毒色定数（必要なら）、毒床ダメージ量
    story/
      stage1〜6.ts        … 各 logs フィールド削除
      cutscenes.ts       … 群衆ステップ削除
tests/unit/
  entities/LogTrigger.test.ts … 削除
  entities/Hazard.test.ts     … 新規
  systems/storyDirector.test.ts / config/storyData.test.ts / config/coreBoss.test.ts / config/cutscenes.test.ts … ログ・群衆関連を追従修正
```

## 実装の順序

1. **ログ系撤去**（利用箇所→定義の順、各ステップで typecheck）
2. **stage6-ending 群衆削除**（cutscenes.ts ＋ test）
3. **ボスfigure/色手当て**（S2 sensor強調、S4毒弾テクスチャ）
4. **Hazard（毒床）新規実装**（エンティティ→GameScene→config→test）
5. **各ステージ構成の再配置**（config調整＋クリア可能性確認）
6. **品質チェック**（lint/typecheck/test/build 全通し）

## セキュリティ考慮事項

- ハードコーディング禁止（URL/シークレット/AWS情報）。本変更はゲーム内定数（色・座標・ダメージ量）のみで外部接続なし
- コミット前にクルトワ（security-engineer）のレビューを実施（変更ファイル全件、XSS/インジェクション/ハードコーディング観点）

## パフォーマンス考慮事項

- 毒床は静的・少数。overlap判定の追加負荷は無視できる範囲
- 毒弾テクスチャ追加はテクスチャ1枚増のみ

## 将来の拡張性

- `Hazard` は汎用ハザード床として設計（毒以外のダメージ床にも転用可能なよう色・ダメージをconfig化）
- ③テキスト確定（次PR）が編集する `config/story/` のテキストフィールド構造は本PRで変えない（`logs` 削除を除く）
