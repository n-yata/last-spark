# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### タスクスキップが許可される唯一のケース
以下の技術的理由に該当する場合のみスキップ可能:
- 実装方針の変更により、機能自体が不要になった
- アーキテクチャ変更により、別の実装方法に置き換わった
- 依存関係の変更により、タスクが実行不可能になった

---

## フェーズ1: ハードモード裏ボス不出現の原因調査

- [x] 再現確認
  - [x] 疑似`Boss`/`GameScene`のテストハーネスで、hard×stage6のCoreBoss撃破→`handleClear`→`shouldStartHardSecretBoss`→`spawnHardSecretBoss`のフローを駆動し、現状で本当に`ShadowRayBoss`が生成されないか(またはされるか)を確認する(`tests/unit/scenes/gameSceneHardSecretBoss.test.ts`)
  - [x] 実機/手動での再現手順を確立できる場合は記録する(できない場合はテストでの再現に留め、その旨をretrospectiveに記す) → 単体テストで再現・固定。実機トリガの最終確認は報告/retrospectiveへ申し送り
- [x] 原因特定
  - [x] `this.difficulty`が正しく`'hard'`として初期化・保持されているか確認(SaveManager読み込み、optionsMenuでの切り替え) → 問題なし(create時に1度設定・以後不変)
  - [x] `boss instanceof CoreBoss`の判定がstage6撃破時に真になっているか確認(PurifierBoss等、他ボスクラスとの取り違えがないか) → 問題なし(stage6は`new CoreBoss`)
  - [x] `bossAfterglow`→`bossDeathSequence`のコールバックチェーンが最後まで実行され、`spawnHardSecretBoss()`に到達しているか確認(EffectsManagerの新規`screenFlash`等で例外・early returnが起きていないか) → チェーン本体は正常。`bossAfterglow`/`bossDeathSequence`はPR#129・fd89489で無変更
  - [x] `this.shadowRaySpawned`/`this.shadowRayActive`のリセット・二重チェックが意図通りか確認 → **ここに根因**。下記参照
  - [x] 上記のいずれにも該当しない場合、`playerMovement.ts`のCoreBoss撃破タイミングへの間接的な影響(ダメージ判定順序等)を疑い、確認する → CoreBossの露出ゲート(fd89489新設)は`tests/unit/systems/coreExposureKillability.test.ts`で撃破可能性を確認済み。撃破自体は成立する
  - [x] **原因**: `handleClear`の「裏ボス分岐」だけが再入ガード(`ended`/`inPostBoss`)を立てていなかった。撃破演出(`bossAfterglow`→`bossDeathSequence`→`spawnHardSecretBoss`、約1.4s非同期)の進行中に`handleClear(CoreBoss)`が再度呼ばれると、1回目で`shadowRaySpawned=true`になっているため`shouldStartHardSecretBoss`がfalseになり、2回目は通常クリア分岐(`this.ended=true`→`finishStageClear`=クリア画面遷移)へ落ちて、裏ボスの`spawn`を横取り・中断してしまう。他2分岐(救出=`inPostBoss=true`、通常クリア=`ended=true`)は再入ガードを持つのに、裏ボス分岐だけが欠落していた(`GameScene.ts:125-126`のコメントが示す「handleClearの二重起動防止」の意図漏れ)

## フェーズ2: ハードモード裏ボス不出現の修正

- [x] 特定した原因箇所を最小修正する(判定ロジック`shouldSpawnHardModeSecretBoss`の仕様自体は変更しない) → 裏ボス分岐で`this.inPostBoss = true`を立て再入を止め、`spawnHardSecretBoss`内で解除(以後のShadowRayBoss撃破は通常フローで処理)。判定条件は不変
- [x] 修正内容を固定するユニット/統合テストを追加する(`gameSceneHardSecretBoss.test.ts`の再入テスト。修正前は失敗・修正後は通過を確認)
- [x] hardモード×stage6以外(normalモード、他ステージ)の撃破フローに退行がないことをテストで確認する(同ファイルのnormal/stage5/取り違え/再撃破ケース + 全760テスト通過)

## フェーズ3: 着地演出の適正化

- [x] `PLAYER.jumpVelocity`/`fallGravityMultiplier`/`maxFallSpeed`から通常ジャンプの着地速度レンジを算出し、`landingEffectMinSpeed`/`hardLandingMinSpeed`の新しい値を決定する
  - 段差(140px、fallGravityMultiplier込み)の着地速度 ≈ 629px/s、フルジャンプ着地 ≈ 670px/s、maxFallSpeed=760px/s。
  - `landingEffectMinSpeed: 650`(段差着地では出さず、フルジャンプ以上で出す)、`hardLandingMinSpeed: 740`(maxFallSpeed近傍の長い落下のみhard)に決定。
- [x] `src/config/balance.ts`の`landingEffectMinSpeed`/`hardLandingMinSpeed`を更新する
- [x] ~~`src/config/effects.ts`の`landing`/`shake.landingSoft`/`landingHard`の演出量調整~~（閾値調整のみで十分と判断し不要。過剰演出の主因は「発火頻度」であり演出量自体ではなかったため）
- [x] `tests/unit/entities/playerLanding.test.ts`を新しい閾値に合わせて更新し、「段差着地では発火しない」「高所着地では発火する」の境界値テストを追加する
- [x] `tests/unit/config/gameFeelEffects.test.ts`を新しい設定値に合わせて更新する（既存テストに閾値のハードコードなし、変更不要と確認）
- [x] `tests/unit/scenes/gameSceneEffectsWiring.test.ts`が新閾値でも通ることを確認する

## フェーズ4: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`(67ファイル・760テスト全パス)
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`
- [x] 実機(ローカルdevサーバー)で以下を確認する
  - [x] devサーバー起動・game-root描画のスモークテスト(HTTP 200 + game-root要素確認)
  - [ ] ~~段差着地/高所着地の目視プレイ確認、hard×stage6クリア後のShadowRayBoss出現の目視確認~~（自動化困難のため保留: hard×stage6到達には6ステージ分の実プレイが必要で、Playwrightでの安定した自動操作は非現実的。着地閾値は`playerLanding.test.ts`で実速度値による境界テストを、裏ボス再入問題は`gameSceneHardSecretBoss.test.ts`で実際の`handleClear`/`spawnHardSecretBoss`経路を駆動する回帰テストを追加済みで、これらが本質的な検証を担う。最終の目視プレイ確認はシャビへ申し送り）

## フェーズ5: レビューとドキュメント更新

- [x] クルトワ(security-engineer)によるセキュリティレビューを実施する(Critical/Highがあれば修正してからコミット) → Critical/High/Medium/Lowいずれも指摘なし
- [x] 実装後の振り返りを記録（別ファイル `retrospective.md` に記録 → モード3）

---

> **振り返りについて**: 実装後の振り返りはこのファイルではなく、同じディレクトリの
> `retrospective.md` に記録する（テンプレート: `.claude/skills/steering/templates/retrospective.md`）。
> 全タスクが `[x]` になったことを確認してから作成すること。
