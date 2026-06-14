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

- [ ] `EnvoyBoss extends FlyingBoss` を新規作成
  - [ ] `fireLance()` 実装（時間差で複数の高速槍弾を発射・非貫通）
  - [ ] `doBlink()` 実装（逆サイドへ瞬間移動・残像）
  - [ ] `beginNextAction` を override し `pickNextEnvoyBossAction` を使用
- [ ] lance 弾の追加
  - [ ] `assetKeys.ts` に `projectileLance` テクスチャキー追加
  - [ ] `Projectile.ts` / `shot.ts` に lance 分岐追加
  - [ ] `PreloadScene.ts` で lance 弾の描画
- [ ] `GameScene.spawnBoss` を `EnvoyBoss` 生成に差し替え（ENVOY 分岐）
- [ ] 動作確認（ビジュアルは bossFlying 流用のまま）

## フェーズ C: ENVOY ビジュアル実装

- [ ] `characterRig.ts` に `bossEnvoy` リグを追加
  - [ ] `RigSpec.family` 型・`PALETTE`・`RIGS`・`RIG_BODY_SIZE` に追加
  - [ ] 既存 shape の組み合わせで槍/矢じり型を構成
  - [ ] `assetKeys.ts` に bossEnvoy パーツキー追加
- [ ] `stage1.ts` の Stage5 に `bossRig: 'bossEnvoy'` を指定
- [ ] 動作確認（専用リグ表示）

## フェーズ D: PURIFIER bloom 実装

- [ ] `Hazard.ts` / `GameScene.buildHazards()` の精査（着手前・最重要）
  - [ ] 動的 Hazard 生成方式（プール化 or 動的add）を確定
- [ ] `PurifierBoss.fireBloom()` 実装
  - [ ] GameScene からの hazard コンテキスト注入（setBloomContext 等）
  - [ ] 動的 Hazard の生成・当たり判定登録・時限破棄
  - [ ] phase2 で枚数増・存続時間延長
- [ ] `spray` の phase2 強化（2連射化）
- [ ] 動作確認（汚染床の生成・消滅・スリップダメージ）

## フェーズ E: PURIFIER ビジュアル実装

- [ ] `characterRig.ts` に `bossPurifier` リグを追加
  - [ ] `RigSpec.family` 型・`PALETTE`・`RIGS`・`RIG_BODY_SIZE` に追加
  - [ ] タンク背負いの接地機シルエットを構成
  - [ ] `assetKeys.ts` に bossPurifier パーツキー追加
- [ ] `stage1.ts` の Stage4 に `bossRig: 'bossPurifier'` を指定
- [ ] 動作確認（placeholder 解消）

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
