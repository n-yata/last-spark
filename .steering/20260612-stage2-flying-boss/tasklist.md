# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 実装可能なタスクのみを計画
- 計画段階で「実装可能なタスク」のみをリストアップ
- 「将来やるかもしれないタスク」は含めない
- 「検討中のタスク」は含めない

### タスクスキップが許可される唯一のケース
以下の技術的理由に該当する場合のみスキップ可能:
- 実装方針の変更により、機能自体が不要になった
- アーキテクチャ変更により、別の実装方法に置き換わった
- 依存関係の変更により、タスクが実行不可能になった

スキップ時は必ず理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

### タスクが大きすぎる場合
- タスクを小さなサブタスクに分割
- 分割したサブタスクをこのファイルに追加
- サブタスクを1つずつ完了させる

---

## フェーズ1: 型・設定の拡張

- [x] `src/types/boss.ts` を拡張
  - [x] `BossAction` に `'dive' | 'hover'` を追加
  - [x] `BossKind = 'ground' | 'flying'` を追加
- [x] `src/config/balance.ts` に設定を追加
  - [x] `BossConfig` インターフェースを定義（共通必須 + 任意 `jumpVelocity?`、`actionDurationMs` は `Partial<Record<BossAction, number>>`）
  - [x] 既存 `BOSS` が `BossConfig` を満たすことを確認（`satisfies BossConfig` を付与）
  - [x] `FLYING_BOSS` を追加（maxHp=24 で同等、bulletSpeed/moveSpeed をやや強化、飛行固有: `hoverAltitude / hoverAmplitude / hoverPeriodMs / diveSpeed / climbSpeed / diveBottomMargin`、`actionDurationMs`= hover/move/shoot/dive/stagger）

## フェーズ2: 行動抽選の汎用化（bossAi.ts）

- [x] `src/systems/bossAi.ts` を汎用化・拡張
  - [x] 内部に汎用 `pickWeightedAction(table, last, rng)` を切り出し、`pickNextBossAction` のシグネチャ・挙動を維持（接地 `GROUND_WEIGHTS` を使用）
  - [x] `FLYING_WEIGHTS`（dive は phase1/2 双方、phase2 で増量）を追加
  - [x] `pickNextFlyingBossAction(phase,last,rng)` / `allowedFlyingActions(phase)` を追加
  - [x] `bossActionDuration(map, action, fallback)` 純粋関数を追加

## フェーズ3: 見た目リグ（bossFlying）

- [x] `src/config/assetKeys.ts` に `PART.bossFlying` キー（head/core/wingBack/wingFront/cannon）を追加
- [x] `src/config/characterRig.ts` に飛行リグを追加
  - [x] `PALETTE.bossFlying`（寒色: シアン主 × バイオレット副）を追加
  - [x] `bossFlying` リグ（脚なし・本体+センサー頭+左右ウィング+下部キャノン、`swingRad:0/walkCycleMs:0`）を定義し、新 `PartShape` は追加しない（既存形状を流用）
  - [x] `RIGS` と `RIG_BODY_SIZE` に `bossFlying` を登録（`FLYING_BOSS` を import）、`RigSpec.family` 型に `'bossFlying'` を追加

## フェーズ4: Boss のコンフィグ駆動リファクタ

- [x] `src/entities/Boss.ts` をコンフィグ駆動へ
  - [x] コンストラクタに `options?: { config?: BossConfig; rigFamily?: RigFamily; gravity?: boolean }` を追加（既定 `BOSS / 'boss' / true`）
  - [x] インスタンス可変値の参照を `BOSS.*` → `this.cfg.*` に置換
  - [x] サブクラス上書き用に対象メソッド/フィールドを `protected` 化
  - [x] 行動継続時間取得を `bossActionDuration(this.cfg.actionDurationMs, next, fallback)` に変更
  - [x] stage1（既定引数）の挙動が従来と同一であることをコード上で確認

## フェーズ5: FlyingBoss 実装

- [x] `src/entities/FlyingBoss.ts` を新規作成
  - [x] `super(scene,x,y,{ config: FLYING_BOSS, rigFamily:'bossFlying', gravity:false })`
  - [x] 高度域（基準高度・バブ振幅・dive 最下点）の保持と上下クランプ
  - [x] `update()` は基底を再利用（フェーズ→targetY→アクション→クランプ→リグ同期）
  - [x] `beginNextAction()` 上書き（`pickNextFlyingBossAction`、dive は executeAction で処理）
  - [x] `executeAction()` 上書き（hover/move=高度追従、dive=降下接近、shoot=水平発射、stagger=停止）
  - [x] `updateRig()` 上書き（idle 基調、dive=fall 姿勢、stagger=被弾色）

## フェーズ6: ステージ統合

- [x] `src/config/stage1.ts` を更新
  - [x] `StageData` に `bossKind?: BossKind` を追加
  - [x] stage2 を `bossKind:'flying'` にし、`bossSpawn.y` を空中（基準高度）へ変更
- [x] `src/scenes/GameScene.ts` の `spawnBoss()` を分岐
  - [x] flying は `FlyingBoss` を生成し地面コライダを付けない（高度域を設定）
  - [x] ground は従来どおり `Boss` + 地面コライダ
  - [x] HUD `bossMaxHp` を `this.boss.maxHp` に変更（設定値非依存）

## フェーズ7: テスト

- [x] `tests/unit/systems/flyingBossAi.test.ts` を新規作成
  - [x] 飛行重みに dive/hover を含む
  - [x] 接地（`pickNextBossAction`）に dive/hover が混入しない
  - [x] dive は phase2 でより出やすい
  - [x] `allowedFlyingActions` と抽選結果の整合
  - [x] 連続抑制が飛行でも効く
  - [x] `bossActionDuration` のマップ取得・欠損 fallback
- [x] `tests/unit/systems/flyingBossHittable.test.ts` を新規作成
  - [x] dive 最下点でボス上下範囲が地上プレイヤーのショット高さを含む
  - [x] `FLYING_BOSS` の高度・振幅・dive 最下点が地面より上で妥当

## フェーズ8: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`（183 件全パス、新規 15 件含む）
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`

## フェーズ9: 検証・ドキュメント

- [x] `implementation-validator` で実装品質を検証（総合 5.0/5。リグレッション無し・dive 当たり判定の整合を確認）
- [x] コミット前に `security-engineer`（クルトワ）レビュー（Critical/High ゼロ、ハードコーディング4観点クリア）
- [x] `docs/functional-design.md` を更新（シャビ承認済み）: MVP スコープ表記、`BossAction` に dive/hover、`BossKind` 追加、`FlyingBoss`/系統分岐・StageData.bossKind・飛行ボスの地形非衝突を反映
- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-12

### 計画と実績の差分

**計画と異なった点**:
- `FlyingBoss.update()` は基底の `Boss.update()` をそのまま再利用し、オーバーライドは
  `beginNextAction / executeAction / clampToArena / updateRig` の 4 メソッドに限定できた
  （計画では update 自体の上書きも視野に入れていたが不要だった）。
- 飛行固有のチューニング値（hoverAltitude 等）は `BossConfig` に直接足すと接地ボスに
  無関係なフィールドが混ざるため、`FlyingBossConfig extends BossConfig` を新設して分離した。

**新たに必要になったタスク**:
- `as const satisfies BossConfig` が飛行固有キーを余剰プロパティとして弾いたため、
  `FlyingBossConfig` を導入して `FLYING_BOSS` を `satisfies FlyingBossConfig` に変更（typecheck で検出）。
- `Boss.DEFAULT_ACTION_DURATION_MS` をサブクラスから使うため export 化。

**技術的理由でスキップしたタスク**（該当する場合のみ）:
- なし（全フェーズ完了）。

### 学んだこと

**技術的な学び**:
- 継承で挙動を差し替える場合、フィールド/メソッドの `protected` 化と「設定オブジェクト注入 +
  既定引数」を組み合わせると、基底クラス（stage1 ボス）の挙動を一切変えずに派生を足せる。
- `satisfies` は object literal の excess property check が効くため、共通型に無いキーを持つ
  派生設定は専用のサブインターフェースを用意する必要がある。

**プロセス上の改善点**:
- 純粋ロジック（bossAi）を Phaser 非依存に保ったことで、飛行ボスの行動抽選・継続時間・
  当たり判定をブラウザ無しの高速ユニットテストで検証でき、回帰の安全網になった。

### 次回への改善提案
- `functional-design.md` がドリフトしていた点は本作業で反映済み（MVP 表記・BossAction・BossKind・FlyingBoss）。
  永続ドキュメントの更新タイミングを機能追加フローに組み込むと、ドリフトを未然に防げる。

### 追加対応（シャビ指示）
- `docs/functional-design.md` を飛行ボス追加に合わせて更新。
- `Boss.fireVolley` の発射 Y を `STAGE.groundY - SHOT.normalSize/2` でクランプし、phase2 最下弾が
  地面をすり抜けて見える問題を接地/飛行ボス共通で解消（183 テスト・lint・typecheck・build 再確認済み）。
