# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: 演出基盤

- [x] `src/config/effects.ts` を新規作成(爆発/シェイク/ヒットストップ/フラッシュ/フェード/HUD/タッチの全チューニング値)
- [x] `src/systems/hudFx.ts` を新規作成(entranceFillRatio / damageFlashActive / flashBlinkOn の純粋関数)
- [x] `tests/unit/systems/hudFx.test.ts` を作成(境界値含む)
- [x] `TEX.spark` を `assetKeys.ts` に追加し、`PreloadScene` でパーティクル用テクスチャを生成

## フェーズ2: 戦闘演出・手応え強化

- [x] `src/systems/EffectsManager.ts` を新規作成(explodeSmall / explodeBoss / shake / hitStop / playerDamageFlash / bossDeathSequence、SHUTDOWN でのタイマー破棄)
- [x] `CharacterRig` に被弾白フラッシュ(`setTintFill`)を追加
- [x] `CombatSystem.onHit` に shotKind(弾種)を追加し、衝突ハンドラから渡す
- [x] `GameScene` に EffectsManager を配線
  - [x] 敵撃破時にパーティクル爆発(`onEnemyDefeated` で位置を使用)
  - [x] プレイヤー被弾時にカメラシェイク+赤フラッシュ
  - [x] チャージ弾命中時にヒットストップ
  - [x] ボス撃破時に撃破シーケンス(多段爆発+大シェイク+ヒットストップ)→完了後にクリア遷移
- [x] 既存統合テスト(`damage-flow.test.ts` 等)が onHit 拡張へ追従していることを確認・修正(onHit を直接参照するテストはなく、全 200 件パスを確認)

## フェーズ3: シーン遷移・HUD演出

- [x] `src/systems/sceneTransition.ts` を新規作成(transitionTo / fadeIn、多重発火ガード)
- [x] 全シーン遷移をフェード化(Title→Game、Game→Clear/GameOver、Clear→Game/Title、GameOver→Game/Title)+各シーン create でフェードイン
- [x] `LifeBar` に被ダメフラッシュ(失ったセグメントの点滅)を追加
- [x] `BossHpBar` に出現時の 0→満タンフィル演出を追加

## フェーズ4: タッチUIの磨き込み

- [x] `registryKeys.ts` に `HUD.shootHeld` / `HUD.jumpHeld` を追加し、GameScene から publish
- [x] `TouchControls` に押下中の視覚フィードバック(塗りアルファ増+半径拡大)を追加

## フェーズ5: 難易度・バランス調整

- [x] `balance.ts` に `STAGE_TUNING` と `getStageTuning(stageId)` を追加(stage1 中立 / stage2 強化、未知 ID フォールバック)
- [x] `SpawnSystem` → `Enemy` へ tuning を伝搬し、walker 速度・turret 発射間隔へ適用
- [x] `tests/unit/config/stageTuning.test.ts` を作成(stage2 が stage1 より厳しいこと・フォールバックを検証)

## フェーズ6: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`(18 ファイル・205 件パス)
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`(チャンクサイズ警告は既存の Phaser 同梱由来で今回の変更とは無関係)

## フェーズ7: ドキュメント更新

- [x] docs/ への影響を確認し、必要なら更新(architecture.md / repository-structure.md に「純粋関数モジュールは ui からも参照可」の原則を明文化)
- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-12

### 計画と実績の差分

**計画と異なった点**:
- ui/ レイヤーは docs 上 systems/ への依存禁止だったが、純粋関数 `hudFx.ts` の参照が必要になった。entities に既にあった「Phaser 非依存の純粋関数モジュールは最下位扱い」の原則を ui にも拡張し、`docs/architecture.md` / `docs/repository-structure.md` に明文化して整合させた。
- クリアタイムの確定タイミングを「ボス撃破の瞬間」に明示した(撃破シーケンス約 1.4 秒をタイムに含めるとベストタイム記録が既存セーブと不公平になるため)。

**新たに必要になったタスク**:
- implementation-validator の指摘対応: `CharacterRig` にモジュールローカルで残っていた演出定数(ATTACK/HIT duration)を `config/effects.ts` の `EFFECTS.rig` へ移動(受け入れ条件「演出値の config 集約率 100%」の充足)。
- 同レビューで判明した既存の軽微なリーク(GameScene の orientation RESIZE リスナーが SHUTDOWN で解除されない)を修正。
- E2E(Playwright 9 件)を実行したところ 2 件失敗。原因は EffectsManager の SHUTDOWN フックが `scene.physics.world` を null ガードなしで参照していたこと(SHUTDOWN 時は物理プラグインが先に破棄されるため throw し、scene.start の遷移ごと壊れて ClearScene が起動しない)。ガード追加で全 9 件パスを確認済み。

**技術的理由でスキップしたタスク**: なし(全タスク完了)。

### 学んだこと

**技術的な学び**:
- Phaser の `setTint` は乗算ティントのため白では発光フラッシュにならない。被弾の白フラッシュは `setTintFill`(塗り潰し)を使う必要がある。
- ヒットストップは `physics.world.pause()` + `delayedCall` 復帰で十分成立する(60〜140ms なら AI タイマーの進行は体感不能)。多重発火は「復帰予定時刻を後ろへ伸ばすだけ」にすると二重 resume を防げる。
- Phaser 3.60+ のパーティクル API は `scene.add.particles(x, y, tex, config)` + `explode(count)` の使い捨て emitter が単発爆発に最適。寿命+余白での遅延 destroy を忘れない。
- シーン再利用(リトライ/周回)があるため、フェード遷移の多重発火ガードは scene.data に置き、`fadeIn` 時に必ずリセットする必要がある。

**プロセス上の改善点**:
- /plan-feature で受け入れ条件を検証可能な粒度まで詰めてあったため、実装中の判断(チャージ弾のみヒットストップ等)に迷いがなかった。
- 純粋関数(hudFx)を先に作りテストで固めてから UI に組み込む順序は手戻りがなく有効だった。

### 次回への改善提案
- 演出値(`EFFECTS`)はテストプレイによる微調整が前提。実機(タッチ端末)での体感確認を別途行い、シェイク強度・点滅間隔を調整するとよい。
- Phaser のシーン SHUTDOWN イベントでは物理等のプラグインが先に破棄されている場合がある。SHUTDOWN フック内でシーンのサブシステムへ触る時は必ず null ガードすること(今回 E2E が検出。ユニットテストでは捕捉できない領域なので、シーン遷移に触る変更では E2E まで回すのが安全)。
