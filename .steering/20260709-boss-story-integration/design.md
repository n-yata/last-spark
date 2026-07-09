# 設計: boss-story-integration

要求: [requirements.md](./requirements.md)

## 方針

既存の stage4(Purifier) / stage5(Envoy) の固有ギミックは活かし、今回の実装では次の3本柱で `stage3〜stage6` を横断的に強化する。

1. `stage3` に「収容・拘束」を感じる新ギミックを追加する
2. `stage6` に「弱点露出を作って叩く」攻略構造を追加する
3. `stage3〜stage6` に共通のボス演出(登場 / phase移行 / 撃破余韻)を入れる

## 変更詳細

### 1. stage3: WardenBoss に containment ギミックを追加

- `BossAction` に `containment` を追加し、`WardenBoss` 専用テーブルへ閉じ込める
- `WardenBossConfig` に containment 用の幅・持続時間・ミサイル本数を追加する
- `WardenBoss` は新アクション `containment` 開始時に `GameScene` へ一時拘束フィールド生成を依頼する
- 拘束フィールドはプレイヤー周辺へ左右のエネルギー柱を一定時間立て、横移動の自由を狭める
- containment 中はプレイヤーの現在位置帯へミサイルを落とし、「収容される前に読み切って動く」体験にする

#### 実装責務

- `src/entities/WardenBoss.ts`
  - `containment` の行動選択と発火
  - `GameScene` へ渡す疎結合コンテキストの保持
- `src/scenes/GameScene.ts`
  - 一時拘束フィールドの生成・プレイヤー collider 登録・時限破棄
- `src/config/balance.ts`
  - containment の定数集約
- `src/systems/bossAi.ts`
  - Warden 専用重みテーブル更新

### 2. stage6: CoreBoss に exposed window を追加

- `CoreBoss` に `awaitingExpose` / `exposedUntil` 状態を追加する
- phase1 は summon 後に「配下を掃除するとコアが一定時間露出する」構造へ変更する
- 露出していない phase1 のコアは HP ダメージを通さず、視覚効果だけ返す
- phase2 は従来どおり直接攻撃主体で常時ダメージを通し、最終決戦の押し込みへ移る

#### 実装責務

- `src/entities/CoreBoss.ts`
  - summon 後の露出待ち状態管理
  - phase1 非露出時のダメージ遮断
  - 露出中/非露出中の見た目差分
- `src/config/balance.ts`
  - exposure 時間、非露出時の見た目・テンポ用定数

### 3. ボス演出の共通化

- `EffectsManager` に以下を追加する
  - ボス登場時のシネマティック演出
  - phase移行時の強調演出
  - 撃破直後の余韻発光
- `Boss` に短時間の行動停止 API を追加し、登場演出中は即行動しないようにする
- `GameScene` でボス出現時に演出を起動し、ボス phase の変化を監視して phase 演出を出す
- 演出色は stage3〜stage6 で分け、物語の転換点を視覚でも区別する

### 4. ドキュメント更新

- `docs/functional-design.md`
  - `BossAction` に `containment` / `blink` / `bloom` を反映
  - `WardenBoss` / `CoreBoss` の攻略構造更新
  - ボス演出の責務を `EffectsManager` / `GameScene` に追記
- `docs/glossary.md`
  - `ボスアクション` の一覧更新
  - `containment` / `exposed window` 相当の用語説明を追加

## テスト

- `tests/unit/systems/wardenBossAi.test.ts`
  - `containment` が Warden 専用で、他系統へ混入しない
- `tests/unit/systems/coreBossAi.test.ts`
  - phase1/phase2 の役割差(phase1=露出待ち、phase2=直接攻撃)を壊さない
- `tests/unit/systems/wardenBoss.test.ts`
  - containment 設定の妥当性
- `tests/unit/entities` or `tests/unit/systems`
  - 露出判定・非露出時ダメージ遮断の純粋ロジックを追加

## 検証

- `npm test`
- `npm run typecheck`
- `npm run build`

コミット前にクルトワ視点のセキュリティレビューを必須とする。
