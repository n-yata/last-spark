# 要求内容

## 概要

PR#129(`feat: polish game feel and stage presentation`、codexへの一時移行時に作成・master取り込み済み)で混入した2件の不具合を修正する。ジャンプ着地演出が過剰に発生する問題と、ハードモードで裏ボス(ECLIPSE/ShadowRayBoss)が出現しなくなった問題。

## 背景

codexへの一時的な移行を試みた際、既存機能に対して意図しない劣化(リグレッション)が入った。現在はmasterにマージ済みのため、他の開発作業に影響が広がる前に切り出して修正する。

- **問題1(着地エフェクト過剰)**は静的解析で原因箇所を特定済み。
- **問題2(裏ボス不出現)**はPR#129の差分を精査したが、裏ボス出現判定ロジック自体(`src/systems/difficulty.ts`, `src/scenes/GameScene.ts`の該当関数)には変更が見当たらず、静的解析だけでは原因を特定できていない。同PRで大きく変更されたプレイヤー移動ロジック・演出強化のいずれかが間接的な副作用(タイミング、イベント配線順など)を及ぼしている可能性がある。**実機/自動テストでの再現確認と原因特定を最初のタスクとする。**

## 実装対象の機能

### 1. ジャンプ着地エフェクトの適正化

- 現状: `src/config/balance.ts:37-38` の `landingEffectMinSpeed`(260px/s)が低すぎるため、段差を下りる程度の着地でもダストパーティクル10個(`src/config/effects.ts:57-65`)とカメラシェイクが毎回発生している。
- 期待動作: 演出は「本当に高所から落ちた強い着地」の時だけ、控えめに発生するようにする。段差程度の着地では演出が出ない、または現状より大幅に控えめになる。
- 関連実装箇所:
  - `src/config/balance.ts`(`landingEffectMinSpeed`, `hardLandingMinSpeed`)
  - `src/config/effects.ts`(`landing`設定, `shake.landingSoft`/`landingHard`)
  - `src/entities/Player.ts`(着地速度の記録、`player-landed`イベント発火)
  - `src/scenes/GameScene.ts`(`player-landed`購読、`effects.landingDust()`呼び出し)
  - `src/systems/EffectsManager.ts:243-261`(`landingDust`本体)

### 2. ハードモード裏ボス出現の復旧

- 現状: ハードモードでstage6(ECLIPSE)を撃破しても、本来出現するはずの裏ボス(ShadowRayBoss)が出現しない。
- 判定ロジック自体はPR#129で変更されておらず、コード上は正しく見える:
  - `src/systems/difficulty.ts:110-112` `shouldSpawnHardModeSecretBoss(difficulty, stageId)`
  - `src/scenes/GameScene.ts:958-964` `shouldStartHardSecretBoss(boss)`
  - `src/scenes/GameScene.ts:786-799` `spawnHardSecretBoss()`
- PR#129で大きく変更された箇所(疑わしい副作用の発生源候補):
  - `src/systems/playerMovement.ts`(新設、プレイヤー移動を加減速ベースに変更)
  - `src/entities/Player.ts`(ジャンプ・着地イベント配線の変更)
  - `src/systems/EffectsManager.ts`(演出強化。`bossAfterglow`/`bossDeathSequence`自体は無変更だが、呼び出しチェーン内の副作用は要確認)
- 期待動作: ハードモードでstage6のECLIPSE(CoreBoss)を撃破すると、これまで通りShadowRayBossが出現する。ノーマルモードや他ステージの挙動には影響しない。

## 受け入れ条件

### ジャンプ着地エフェクトの適正化
- [ ] 段差程度の着地(軽い落下速度)ではダストパーティクル・カメラシェイクが発生しない、または現状より明確に控えめになっている。
- [ ] 高所からの強い着地では、これまで通り着地演出(ダスト+シェイク)が体感できる。
- [ ] 閾値・演出量の変更根拠(数値)がsteeringドキュメントまたはコードコメントで追跡できる。
- [ ] 既存の自動テスト(`tests/unit/entities/playerLanding.test.ts` 等)が新しい閾値・仕様に合わせて更新され、パスする。

### ハードモード裏ボス出現の復旧
- [ ] 原因を再現・特定できている(再現手順と根本原因がtasklist/retrospectiveに記録される)。
- [ ] ハードモードでstage6のECLIPSEを撃破すると、ShadowRayBossが出現することを自動テスト(可能な範囲)または手動再現手順で確認できる。
- [ ] ノーマルモード、stage6以外のステージでの撃破フローに退行がない。
- [ ] 修正により、着地エフェクト側の変更と副作用が混線していない(2つの修正が互いに独立して検証できる)。

## 成功指標

- プレイ確認時、段差着地では控えめ/無演出、高所着地では明確な演出という体感差がついている。
- プレイ確認時、ハードモードでstage6クリア後にShadowRayBossが必ず出現する。
- `npm run lint` / 型チェック / `npm test` / `npm run build` が全て通る。

## スコープ外

今回は次の項目は実装対象に含めない:

- PR#129で導入された操作感(加減速ベース移動、apex hang等)そのものの再チューニング・仕様変更(バグでない限り現状仕様を維持する)。
- 着地エフェクト・裏ボス以外の演出(bossIntro, bossPhaseShift, impactSpark等)の見直し。
- 新規ステージ・ボス・ストーリー・UI画面の追加。
- codex移行の是非そのものの検証・比較。

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/functional-design.md` - 機能設計書
- `docs/architecture.md` - アーキテクチャ設計書
- `.steering/20260709-game-feel-stage-presentation-polish/` - 問題混入元のPR#129のステアリング一式(requirements/design/retrospective)

## 未決事項

- 着地エフェクトの新しい閾値・演出量の具体的な数値(実機プレイで調整しながら決定する)。
- 裏ボス不出現の根本原因(調査タスクの結果次第で、修正方針・影響範囲が変わる可能性がある)。
