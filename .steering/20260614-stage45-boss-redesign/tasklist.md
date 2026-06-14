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

スキップ時は必ず理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

---

## フェーズ A: ロジック土台（型・balance・AI抽選 / テスト先行）

- [x] 既存実装の精読（着手前）
  - [x] `bossAi.ts` の重み抽選・既存テーブル構造を確認
  - [x] `balance.ts` の PURIFIER/ENVOY/各Config 構造を確認
  - [x] `types/boss.ts`・`types/combat.ts` を確認
- [x] 型定義の拡張
  - [x] `types/boss.ts` の `BossAction` に `bloom`/`lance`/`blink` を追加
  - [x] `types/combat.ts` の `ProjectileKind` に `lance` を追加
- [x] balance.ts のパラメータ追加
  - [x] `PurifierBossConfig` に `bloom` フィールドを追加し PURIFIER 値を改訂（width96/height92、bloom設置値、bloom.damageはHAZARDを正本に共有）
  - [x] `EnvoyBossConfig extends FlyingBossConfig` を新設し ENVOY 値を改訂（lance/blink、move継続時間を撤去しblink/lanceへ）
  - [x] `HAZARD` をワールド系チューニング（ENEMY直後）へ移動しTDZ回避＋単一正本を維持
- [x] bossAi.ts の抽選ロジック拡張
  - [x] `PURIFIER_WEIGHTS` に `bloom` を追加（phase1/phase2）
  - [x] `ENVOY_WEIGHTS` + `pickNextEnvoyBossAction` + `allowedEnvoyActions` を新設
- [x] ユニットテスト（先行・Red-Green）
  - [x] `pickNextEnvoyBossAction` が許可アクションのみ返すテスト
  - [x] `blink`/`lance`/`bloom` が他系統の抽選に混入しない封じ込めテスト
  - [x] 改訂 PURIFIER_WEIGHTS に bloom が含まれ phase2 で重みが増えるテスト
  - [x] 既存 envoyBoss/purifierBossAi テストの改訂
  - 検証: `npm test` 428件 / `npm run typecheck` / `npm run lint` / `npm run build` すべて green

## フェーズ B: ENVOY メカニクス実装

- [x] `EnvoyBoss extends FlyingBoss` を新規作成
  - [x] `fireLance()` 実装（時間差で複数の高速槍弾を発射・非貫通。delayedCall で intervalMs 間隔）
  - [x] `doBlink()` 実装（startBlink で向き決定＋executeAction の blink 分岐で dashSpeed ダッシュ＋残像。残像は tween 自己破棄・間引き付き）
  - [x] `beginNextAction` を override し `pickNextEnvoyBossAction` を使用
- [x] lance 弾の追加
  - [x] `assetKeys.ts` に `projectileLance` テクスチャキー追加
  - [x] `Projectile.ts` / `shot.ts` に lance 分岐追加（fire で回転リセット＋lanceテクスチャ、地面到達で回収、createProjectileSpec で damage/size）
  - [x] `PreloadScene.ts` で lance 弾の描画（makeLance: 右向きの槍シルエット）
  - [x] `FlyingBoss.followAltitude` を protected 化（blink 中の高度維持に流用）
  - [x] `SHOT.lanceDamage/lanceSize` 追加
- [x] `GameScene.spawnBoss` を `EnvoyBoss` 生成に差し替え（ENVOY 分岐。未使用になった ENVOY import を除去）
- [x] 動作確認（ビジュアルは bossFlying 流用のまま）
  - playwright で stage5 実機検証: EnvoyBoss 実体化・lance(kind/texture/回転/damage2/命中)・blink(425px ダッシュ)・残像生成＆破棄を確認。ランタイムエラーゼロ
  - データ層テスト追加（envoyBoss.test.ts に stage5 配線＋撃破可能性）

## フェーズ C: ENVOY ビジュアル実装

- [x] `characterRig.ts` に `bossEnvoy` リグを追加
  - [x] `RigSpec.family` 型・`PALETTE`・`RIGS`・`RIG_BODY_SIZE` に追加（ENVOY を balance から import）
  - [x] 既存 shape の組み合わせで槍/矢じり型を構成（後退翼×2=roundedBox / 紡錘形 core=roundedBox / 前方の槍=barrel(armFront・攻撃時リコイル) / 鋭い単眼=cyclops。新 PartShape は追加せず）
  - [x] `assetKeys.ts` に bossEnvoy パーツキー追加
  - [x] `FlyingBoss` に rigFamily 引数を追加、`EnvoyBoss` が `'bossEnvoy'` を渡す
  - [x] characterRig.test 改訂（cyclops は飛行系ボス2種=哨戒機/使者の頭に限定）＋ bossEnvoy 構造テスト追加
- [x] ~~`stage1.ts` の Stage5 に `bossRig: 'bossEnvoy'` を指定~~（実装方針変更により不要: 専用クラス EnvoyBoss が自身のリグ系統を保持する規約に従う。stage.bossRig は GameScene の generic Boss 分岐専用で EnvoyBoss には適用されず、指定すると dead config になる。FlyingBoss/WardenBoss/PurifierBoss と同じ方式）
- [x] 動作確認（専用リグ表示）
  - playwright introspection で bossEnvoy リグ採用を確認: 5パーツのテクスチャ(part-bossenvoy-*)が指定実寸(wingback30x9/wingfront30x9/core34x20/spear30x11/head16x10)で生成・visible・boss に attach。ランタイムエラーゼロ。bossFlying 流用を解消
  - 注: force-jump+pause+レターボックスカメラの合成制約でピクセルスクショは取得できず。実寸一致の data 検証＋構造テストで担保（最終ビジュアル目視は Phase F の通しプレイで実施）

## フェーズ D: PURIFIER bloom 実装

- [x] `Hazard.ts` / `GameScene.buildHazards()` の精査（着手前・最重要）
  - [x] 動的 Hazard 生成方式を確定: hazards グループへ動的 add（overlap は group 単位で登録済みのため後追加の床も自動でダメージ判定対象）。プール化は不要と判断（時限破棄で蓄積しない・生成頻度も低い）
- [x] `PurifierBoss.fireBloom()` 実装
  - [x] GameScene からの hazard コンテキスト注入（`setBloomContext` / `BloomContext.spawnPatch`。CoreBoss.setSummonContext と同型の疎結合。未注入なら no-op=安全側）
  - [x] 動的 Hazard の生成・当たり判定登録・時限破棄（`GameScene.spawnBloomPatch`: Hazard 生成→group add→configureBody→delayedCall で lifespan 破棄。Hazard.destroy で脈動 tween を確実停止しリーク防止）
  - [x] phase2 で枚数増・幅拡大・存続時間延長（countP1/P2・patchWidthP1/P2・lifespanMsP1/P2）
- [x] `spray` の phase2 強化（2連射化）（fireSpray を fireSprayOnce に分離、phase2 は SPRAY_SECOND_BURST_MS 後に2発目。撃破/無効化後は撃たない）
- [x] 動作確認（汚染床の生成・消滅・スリップダメージ）
  - playwright で stage4 隔離検証: ①ボス fireBloom で hazards 2→3（中心x/幅90/高さ16・地面接地）②床単独でスリップダメージ hp16→12（pollutionDamage2 × 2tick・共有overlap経路）③lifespan(1500ms)後に3→2へ時限破棄（リークなし）。ランタイムエラーゼロ
  - 設定テスト追加（purifierBoss.test.ts: bloom phase2強化・damage=HAZARD・HP序列・stage4配線）

## フェーズ E: PURIFIER ビジュアル実装

- [x] `characterRig.ts` に `bossPurifier` リグを追加
  - [x] `RigSpec.family` 型・`PALETTE`・`RIGS`・`RIG_BODY_SIZE` に追加（PURIFIER を balance から import）
  - [x] タンク背負いの接地機シルエットを構成（背面タンク=roundedBox縦長(z最背面) / 幅広胴=roundedBox / 太短脚×2=leg / 低い作業頭=sensor / 散布ノズル=cannon(armFront・攻撃時リコイル)。新 PartShape は追加せず。色は浄化を装う白緑×漏出毒の黄緑=Hazard 0xaef03a と地続き）
  - [x] `assetKeys.ts` に bossPurifier パーツキー追加
  - [x] `PurifierBoss` の rigFamily を 'boss' → 'bossPurifier' に変更（placeholder 解消）
  - [x] characterRig.test に bossPurifier 構造テスト追加（二脚/歩行スイング/sensor頭/背面タンク/boss非共有）
- [x] ~~`stage1.ts` の Stage4 に `bossRig: 'bossPurifier'` を指定~~（実装方針変更により不要: Phase C の EnvoyBoss と同じく専用クラス PurifierBoss が自身のリグ系統を保持する規約に従う。stage.bossRig は generic Boss 分岐専用で指定すると dead config になる）
- [x] 動作確認（placeholder 解消）
  - playwright introspection で bossPurifier 採用を確認: 6パーツ(part-bosspurifier-tank/legback/torso/legfront/head/nozzle)が指定実寸(tank34x64縦長/torso60x50/脚26x22/頭30x18/ノズル40x24)で生成・visible・attach。'boss' 流用解消。エラーゼロ
  - 注: ピクセルスクショは Phase C 同様カメラ制約で取得できず、実寸一致 data 検証＋構造テストで担保（最終目視は Phase F の通しプレイ）

## フェーズ F: 品質チェックと仕上げ

- [ ] 難易度カーブの通し調整（HP序列 使者26<浄化28<番人30<コア40 を維持）
- [ ] すべてのテストが通ることを確認
  - [ ] `npm test`
- [ ] リントエラーがないことを確認
  - [ ] `npm run lint`
- [ ] 型エラーがないことを確認
  - [ ] `npm run typecheck`
- [ ] ビルドが成功することを確認
  - [ ] `npm run build`
- [ ] クルトワ（security-engineer）によるセキュリティレビュー
- [ ] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
{YYYY-MM-DD}

### 計画と実績の差分

**計画と異なった点**:
- {実装時に追記}

**新たに必要になったタスク**:
- {実装時に追記}

### 学んだこと

**技術的な学び**:
- {実装時に追記}

### 次回への改善提案
- {実装時に追記}
