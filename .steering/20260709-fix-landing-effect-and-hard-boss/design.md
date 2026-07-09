# 設計書

## アーキテクチャ概要

既存アーキテクチャ(Scene / Entity / System の3層)を変更しない。今回はバグ修正のため、責務境界はそのまま維持し、以下2系統の既存コンポーネント内で最小限の修正を行う。

```
[問題1] balance.ts(閾値定義) → Player.ts(着地イベント発火) → GameScene.ts(購読) → EffectsManager.ts(演出実行)
[問題2] GameScene.ts(handleClear → shouldStartHardSecretBoss → spawnHardSecretBoss) を軸に、
        playerMovement.ts / EffectsManager.ts の副作用有無を調査してから特定箇所を修正
```

## コンポーネント設計

### 1. 着地演出の閾値・演出量調整(`balance.ts` / `effects.ts`)

**責務**:
- 「どの落下速度から演出を出すか」「どこからが強い着地か」を集中管理する既存の責務は変更しない。

**実装の要点**:
- `PLAYER.landingEffectMinSpeed`(現行260)を引き上げ、段差程度の着地(通常ジャンプの短い落下)では発火しないようにする。
- `PLAYER.hardLandingMinSpeed`(現行520)も合わせて見直し、「本当に高い所からの着地」だけが強い演出になるようにする。
- 具体的な数値は、`jumpVelocity`(-620px/s)・`fallGravityMultiplier`(1.18)・`maxFallSpeed`(760px/s)から算出される「通常ジャンプの着地速度レンジ」を実測(ユニットテストのシミュレーションログ、または実機プレイ)した上で決定する。目安として、通常ジャンプの着地では発火せず、奈落越え等の長い落下でのみ発火する水準を狙う。
- `EFFECTS.landing`(ダスト数・shake強度)自体は据え置きを基本とし、閾値調整だけで体感を改善する。閾値調整だけでは過剰感が残る場合のみ、`dustCount`や`shake.landingSoft/landingHard`の強度も控えめに調整する。

### 2. ハードモード裏ボス不出現の原因調査・修正(`GameScene.ts` 他)

**責務**:
- ハードモードでのstage6撃破後、`ShadowRayBoss`を確実に起動する。既存の責務(`handleClear`→`shouldStartHardSecretBoss`→`spawnHardSecretBoss`)の構造は変えない。

**実装の要点**:
- **原因調査を実装の最初のステップとする。** 判定ロジック自体はPR#129で無変更のため、以下の観点で副作用を疑って調査する:
  1. `handleClear`に到達する前提条件(`boss instanceof CoreBoss`)が満たされているか。`CoreBoss`のフェーズ遷移・HP0判定がPlayer側の移動/攻撃変更(加減速化、ダメージ判定タイミング)によって変化し、`handleClear`自体が呼ばれていない可能性。
  2. `this.difficulty`の初期化(`GameScene.ts:171`、`SaveManager`経由)が正しく`'hard'`になっているか。設定画面(`optionsMenu.ts`)からのハードモード切り替えが保存・反映されているか。
  3. `bossAfterglow`→`bossDeathSequence`のコールバックチェーン(`EffectsManager`)が、新しく追加された`screenFlash`等の内部処理で例外を投げてコールバックが実行されずに終わっていないか。
  4. `this.shadowRaySpawned`のリセットタイミング(`GameScene.ts:163`)がシーン再起動・リトライ時に正しく行われているか。
- 原因が特定でき次第、該当箇所のみを最小修正する。判定ロジック自体(`shouldSpawnHardModeSecretBoss`)の仕様は変えない(既存の「difficulty==='hard' && stageId==='stage6'」という条件は正しいものとして扱う)。
- 再現手順が実機依存(タッチ操作、フレームタイミング)である場合は、可能な範囲でユニット/統合テストとして固定し、以後の回帰を防ぐ。テストで再現できない場合は手動再現手順をtasklist/retrospectiveに残す。

## データフロー

### 着地演出発火(修正後)
```
1. Player.applyInput() が空中での最大落下速度(strongestFallSpeed)を記録
2. 着地フレームで strongestFallSpeed が新しい landingEffectMinSpeed 以上のときのみ 'player-landed' を発火
3. GameScene が購読し、hard フラグ(hardLandingMinSpeed 以上か)を伴って effects.landingDust() を呼ぶ
4. EffectsManager.landingDust() がダスト+シェイクを実行(強度は hard で分岐、据え置き)
```

### ハードモード裏ボス出現(調査後に確定)
```
1. stage6 で CoreBoss(ECLIPSE) を撃破 → handleClear(boss) が呼ばれる
2. shouldStartHardSecretBoss(boss) が true(hard かつ stage6 かつ未発生)なら
   bossAfterglow → bossDeathSequence → spawnHardSecretBoss() の順でコールバックチェーンを実行
3. spawnHardSecretBoss() が ShadowRayBoss を生成し、this.boss に差し替える
```

## エラーハンドリング戦略

今回は例外系の新規ハンドリングは追加しない。ただし、問題2の調査でコールバックチェーンの例外握りつぶし(silent failure)が見つかった場合は、原因箇所を修正しつつ、同様の問題が再発しないことをテストで担保する。

## テスト戦略

### ユニットテスト
- `tests/unit/entities/playerLanding.test.ts`: 新しい`landingEffectMinSpeed`/`hardLandingMinSpeed`に合わせて期待値を更新。「段差程度の着地では発火しない」「高所着地では発火する」の境界値テストを追加する。
- `tests/unit/config/gameFeelEffects.test.ts`: 閾値・演出量の設定値検証を更新。
- ハードモード裏ボスの判定ロジック(`shouldSpawnHardModeSecretBoss`, `shouldStartHardSecretBoss`相当)に対する既存/追加のユニットテストで、原因箇所を再現できる場合はテストケースを追加する。

### 統合テスト
- `tests/unit/scenes/gameSceneEffectsWiring.test.ts`: `player-landed`イベント配線が新閾値でも正しく動作することを確認。
- 可能であれば、`handleClear`→`shouldStartHardSecretBoss`→`spawnHardSecretBoss`の一連のフローを疑似`Boss`インスタンスで駆動する統合テストを追加し、ハードモード×stage6での`ShadowRayBoss`起動を固定する。

## 依存ライブラリ

新規ライブラリの追加なし。

## ディレクトリ構造

変更対象ファイル(新規ファイル追加なし):
```
src/config/balance.ts
src/config/effects.ts (必要な場合のみ)
src/entities/Player.ts (原因調査の結果次第で修正の可能性)
src/scenes/GameScene.ts (原因調査の結果次第で修正)
src/systems/EffectsManager.ts (原因調査の結果次第で修正)
tests/unit/entities/playerLanding.test.ts
tests/unit/config/gameFeelEffects.test.ts
tests/unit/scenes/gameSceneEffectsWiring.test.ts
(調査結果に応じて統合テストを追加する可能性あり)
```

## 実装の順序

1. 問題2(裏ボス不出現)の再現確認・原因調査を先に行う(原因不明のまま着地演出側の修正だけ進めると、後で調査結果によって手戻りが出るため)。
2. 原因特定後、裏ボス出現の修正を実装し、テストで固定する。
3. 着地演出の閾値・演出量を調整し、テストを更新する。
4. 両修正を合わせて lint / typecheck / test / build を実行する。
5. クルトワ(security-engineer)のセキュリティレビューを実施する。
6. retrospective.md を作成し、コミット・PR作成に進む。

## セキュリティ考慮事項

- 今回の変更はいずれもクライアント内のゲームロジック調整であり、外部入出力・認証・シークレットに関わらない。コミット前レビューは通常フローに従う。

## パフォーマンス考慮事項

- 着地演出の発火頻度が下がる(閾値引き上げ)ため、パーティクル生成回数はむしろ減る方向。パフォーマンス劣化の懸念はない。
- 裏ボス調査で処理自体を追加する場合も、ボス撃破という低頻度イベントに限定されるため影響は軽微。

## 将来の拡張性

- 着地演出の閾値は今後もプレイフィール調整で変わりうるため、`balance.ts`への集中管理を維持する(ハードコードしない)。
