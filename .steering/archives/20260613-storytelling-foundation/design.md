# 設計書

## アーキテクチャ概要

既存の Scene / Entity / System レイヤー構造を踏襲する。テキスト表示は HUD と同じく `UIScene` 側のオーバーレイとして描画し、表示制御ロジック（どのテキストをいつ出すか）は純粋関数に切り出してテスト可能にする。ストーリーデータ（確定テキスト）は `src/config/` に静的定義し、コードから分離する。

```
GameScene（進行・トリガ検知）
   │  storyEvent（開始/ログ接触/ボス前/内心トリガ）
   ▼
StoryDirector（System: イベント→表示要求の変換、純粋ロジック中心）
   │  TextRequest（種類・本文・一時停止要否）
   ▼
UIScene（StoryOverlay: 5種スタイルで描画、タップ送り、ポーズ連動）
```

## コンポーネント設計

### 1. ストーリーデータ定義（`src/config/story/`）

**責務**:
- `docs/story.md`「テキストコンテンツ（確定版）」をコードの静的データとして保持する
- ステージIDごとに「開始テキスト」「ログ3本（序盤/ボス前/ボス後）」「ECLIPSEの語りかけ」「内心テキスト（シーンキー→本文）」を引けるようにする

**実装の要点**:
- `src/config/story/stage1.ts`, `stage2.ts` などステージ単位でファイル分割
- 型は `src/types/story.ts` に定義（`StoryText`, `LogFragment`, `StageStory` など）
- テキスト本文は story.md からの転記。改変しない（story.md が正本）

### 2. テキスト種別の型定義（`src/types/story.ts`）

**責務**: 5種テキストの種別・表示スタイルを型で表現する

```typescript
type StoryTextKind =
  | 'scientistLog'   // 科学者のログ（上部・暖色・手書き風）
  | 'eclipseVoice'   // ECLIPSEの語りかけ（上部・冷色・等幅）
  | 'rayInner'       // RAYの内心（下部・白・イタリック）
  | 'stageIntro'     // ステージ開始テキスト（中央・白・フェードイン）
  | 'terraLine';     // TERRAのセリフ（下部・暖色）※基盤のみ

interface StoryTextStyle {
  position: 'top' | 'center' | 'bottom';
  pauseGame: boolean;       // 表示中にゲームを止めるか
  // 色・フォント等は UIScene 側の StyleMap で kind から解決
}
```

**実装の要点**:
- `kind → StoryTextStyle` のマップを純粋データとして持ち、`StoryDirector` と `UIScene` が共有する
- `pauseGame`: ログ・語りかけ・開始テキストは true、内心・TERRAセリフ（基盤）は false

### 3. StoryDirector（Systemレイヤー / `src/systems/storyDirector.ts`）

**責務**:
- ゲーム進行イベント（ステージ開始・ログ接触・ボス前・内心トリガ）を受け、どのテキストを表示するかを決定して `TextRequest` を返す
- 「同一シーンで複数テキストが発生する場合の順序」を純粋関数で解決する（story.md の表示順序ルール）

**実装の要点**:
- Phaser 非依存の純粋関数として実装する（既存の `bossAi.ts` / `shotControl.ts` / `playerMovement.ts` と同じスタイル）
- 表示要求のキューイング（開始テキスト→演出…の順序制御）を純粋関数 `nextTextRequest()` 等で表現
- ユニットテスト対象

### 4. StoryOverlay（UISceneの一部 / `src/ui/StoryOverlay.ts`）

**責務**:
- `TextRequest` を受け取り、`kind` に応じた位置・色・フォントで Phaser テキストを描画する
- `pauseGame=true` の場合は GameScene を一時停止し、タップで閉じて再開する
- フェードイン/アウトのトゥイーン

**実装の要点**:
- HUD（`UIScene`）と同じレイヤーに重ねる。プレイ領域（レターボックス帯）との整合に注意
- ポーズ連動は既存の Scene pause/resume を利用（`GameScene` を pause、`UIScene` は活かす）
- フォント未調達のため、MVPでは標準フォント＋色/スタイル（イタリック・色）で区別し、手書き風/等幅は将来差し替え可能にする

### 5. LogTrigger（Entityレイヤー / `src/entities/LogTrigger.ts`）

**責務**:
- ステージ内に配置される「科学者の遺品・旧式端末」。プレイヤーが重なると一度だけログ表示イベントを発火する

**実装の要点**:
- 物理オブジェクト（オーバーラップ判定のみ、衝突なし）
- 一度解錠したら再発火しない（接触済みフラグ）
- 配置データは `StageData`（`src/config/stage1.ts` の既存 interface）に `logTriggers?`（位置＋ログキー）として追加

### ファイル配置方針（全ブロック共通の前提）

既存コードではステージのジオメトリ定義（`StageData` interface・`STAGES` テーブル・`getStageData`）が **`src/config/stage1.ts`** に集約され、`GameScene` / `SpawnSystem` / `Player` がそこから import している。本ブロック以降、以下の責務分割を厳守する:

- **ステージのジオメトリ（地形・梯子・敵・ボストリガー・logTriggers・nextStageId・bossKind）** → `src/config/stage1.ts` の `STAGES` テーブルに追加する（ファイルのリネームはしない。churn を避けるため stage1.ts に全ステージを集約し続ける）
- **ストーリーテキスト（開始テキスト・ログ本文・ECLIPSEの語りかけ・RAYの内心）** → `src/config/story/stageN.ts` に置く

> この分割により、ジオメトリ（Phaser依存・SpawnSystem が読む）とテキスト（静的データ・StoryDirector が読む）が混ざらない。ブロック2以降の「ステージ定義」はすべて `stage1.ts` の `STAGES` への追加を指す。

### 6. GameScene / SpawnSystem への組み込み

**責務**:
- ステージ開始時に `stageIntro` を発火
- ログトリガーのオーバーラップで該当ログを発火
- ボストリガー発火直前に `eclipseVoice` を発火（既存 `onBossTrigger` の前段）
- 内心トリガ（場所到達・ログ読了・ボス前後）で `rayInner` を発火

**実装の要点**:
- 既存の `SpawnSystem.onBossTrigger` の流れにECLIPSEの語りかけを差し込む
- `StageData` 型の拡張（`logTriggers`）は後続ステージでも使うため汎用的に

## データフロー

### ログ接触
```
1. Player が LogTrigger に overlap
2. GameScene が storyEvent('log', logKey) を StoryDirector に渡す
3. StoryDirector が config/story から本文を引き、TextRequest(kind=scientistLog, pause=true) を返す
4. UIScene.StoryOverlay が GameScene を pause し、上部に暖色テキスト表示
5. タップ → フェードアウト → GameScene resume
```

### ボス前の語りかけ
```
1. SpawnSystem がボストリガー到達を検知
2. ボス出現の前に StoryDirector へ storyEvent('bossIntro', stageId)
3. eclipseVoice を pause 付きで表示 → タップ後にボス出現
```

## テスト戦略

### ユニットテスト
- `storyDirector`: イベント種別→正しい kind/本文/順序の TextRequest を返す
- 表示順序解決（開始テキスト→演出の順）の純粋関数
- `config/story/stage1,2`: 必要なキー（intro/log×3/voice/inner）が揃っている

### 統合テスト
- ログトリガー overlap でテキストが出てポーズ→再開できる（既存テスト基盤の範囲で）

## ディレクトリ構造

```
src/
├── types/story.ts              # 新規: テキスト種別・データ型
├── config/story/
│   ├── index.ts                # 新規: getStageStory(stageId)
│   ├── stage1.ts               # 新規: Stage 1 確定テキスト
│   └── stage2.ts               # 新規: Stage 2 確定テキスト
├── systems/storyDirector.ts    # 新規: イベント→表示要求（純粋）
├── ui/StoryOverlay.ts          # 新規: 5種テキスト描画・ポーズ連動
├── entities/LogTrigger.ts      # 新規: ログトリガーオブジェクト
├── scenes/GameScene.ts         # 変更: storyEvent 発火点の追加
├── scenes/UIScene.ts           # 変更: StoryOverlay の組み込み
└── config/stage1.ts            # 変更: StageData interface に logTriggers? を追加
```

## 実装の順序

1. `types/story.ts`（型）と `config/story/`（Stage 1-2 データ）を定義
2. `storyDirector.ts`（純粋ロジック）＋ユニットテスト
3. `StoryOverlay.ts`（描画・ポーズ連動）
4. `LogTrigger.ts` ＋ `StageData` 拡張
5. `GameScene` / `UIScene` / `SpawnSystem` への発火点組み込み
6. Stage 1-2 で実表示を確認
7. `functional-design.md` 更新
8. テスト・lint・typecheck・build

## セキュリティ考慮事項

- 外部通信なし。テキストは静的データのみ。リスクなし

## パフォーマンス考慮事項

- テキスト表示はイベント時のみ生成。常時更新はしない
- オーバーレイのテキストオブジェクトは使い回す（毎回生成しない）

## 将来の拡張性

- `StoryTextKind` に種別を増やせば新しいテキスト種に対応可能
- `config/story/stageN.ts` を追加するだけで Stage 3以降のテキストを登録できる（ブロック2以降の前提）
- フォント（手書き風/等幅）は後から差し替えられるよう、kind→style マップに集約
