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

## フェーズ0: 基盤定数・キー（他全タスクの土台）

- [x] `src/config/balance.ts` の `SHOT` に強化系定数を追加
  - [x] `splitAngleRad`（通常弾を上下に分ける半角・約18°＝`Math.PI/10`）
  - [x] beam系定数（`beamDamage`, `beamTickMs`, `beamLifespanMs`, `beamThickness`, `beamLength`）。コメントで「ワールド生px・画面端非依存」「総威力≒チャージ弾(3)」を明記
- [x] `src/config/registryKeys.ts` に `PROGRESS.playerEmpowered` を追加（セーブ非保存の揮発フラグである旨をコメント）

## フェーズ1: Player の強化状態（変更1・2共通土台）

- [x] `src/entities/Player.ts` に強化状態フィールドとメソッドを追加
  - [x] `empowered: boolean` と `setEmpowered(v: boolean)`
  - [x] `beams?: Phaser.GameObjects.Group` と `setBeams(group)`
  - [x] `beamActiveUntil: number`（ビーム発動中の再発火抑止用）

## フェーズ2: Beam エンティティ（変更1中核）

- [x] `src/entities/Beam.ts` を新規作成（`Phaser.GameObjects.Rectangle` 継承）
  - [x] `configureBody()`（重力なし・immovable）。bodyはネイティブサイズ（1x1+setDisplaySize禁止）
  - [x] `fire(owner)`：マズルから `facing` 方向へ `beamLength`×`beamThickness` の帯を配置
  - [x] UPDATE 購読で原点・向きをプレイヤーのマズルに追従（発動中移動可のため）
  - [x] per-target tick：`Map<Damageable, number>` + `tryHit(target, now)`（`hazardRules.shouldHazardTick` 再利用）
  - [x] 寿命（`beamLifespanMs`）で自破棄。破棄時に Map・tween・UPDATE 購読を解放
  - [x] 発光描画（発光色・`ADD` ブレンド・depth）＋フェードイン/アウト tween

## フェーズ3: CombatSystem 連携（変更1）

- [x] `src/systems/CombatSystem.ts` にビーム当たり判定を追加
  - [x] `CombatRefs` に `playerBeams?: Group` を追加（既存呼び出し非破壊）
  - [x] `asBeam` ヘルパ
  - [x] `registerColliders` にビーム⇔敵 overlap（`tryHit` 多段・命中で消さない・撃破コールバック）
  - [x] `registerBoss` にビーム⇔ボス overlap
  - [x] `onHit` の `shotKind` を `ProjectileKind | 'beam'` に拡張（`ProjectileKind` は汚さない＝`HitKind` 別名）
  - [x] 既存の弾 overlap（deactivate経路）が無傷であることを確認

## フェーズ4: 発動接続（変更1）

- [x] `src/entities/Player.ts` の `fire()` を分岐
  - [x] `empowered && 通常弾` → 上下2発（`±splitAngleRad`、`cos/sin` で vx/vy 分配、velocityY 利用）
  - [x] `empowered && fireCharged` → Beam 発動（`beamActiveUntil` ロック）。非強化/通常は従来単発
  - [x] 発動中も移動・ジャンプ可（`applyInput` の移動抑止は入れない）
- [x] `src/scenes/GameScene.ts` の生成系を更新
  - [x] `createGroups` に `playerBeams` グループを生成
  - [x] `createPlayer` で `player.setBeams(...)`
  - [x] `registerColliders` 呼び出しに `playerBeams` を渡す

## フェーズ5: 強化フラグのライフサイクル（変更2）

- [x] `GameSceneData` に `fromStageSelect?: boolean` を追加
- [x] `GameScene.init` で `fromStageSelect === true` のとき `registry.set(PROGRESS.playerEmpowered, false)`
- [x] `src/scenes/TitleScene.ts` のステージ選択／START の game 起動に `fromStageSelect: true` を付与
- [x] `GameScene.createPlayer` で registry を**読むだけ**（消費しない）→ `setEmpowered`
- [x] `finalizeEnding`（全クリア）で `registry.set(PROGRESS.playerEmpowered, false)`

## フェーズ6: Stage5演出組み込み（変更2・前回確定の一般化）

- [x] `GameScene.handleClear` を cage 非依存に一般化（`postBossCutsceneKey` 単独で post-boss 演出へ。ケージ解錠は cage 時のみ）
- [x] `enterPostBossCutscene` / `finalizePostBossClear` を新設（`startRescueCutscene` を雛形にケージ無し版）
- [x] `finalizePostBossClear`（onComplete）で `registry.set(PROGRESS.playerEmpowered, true)` → ClearScene → Stage6
- [x] Stage3 の救出フロー（rescue）が回帰しないことを確認（handleClear は cage 有無で分岐、rescue 経路は不変）
- [x] `src/config/stage1.ts` STAGE5 に `postBossCutsceneKey: 'stage5-awakening'`（旧コメントの科学者ログ記述も是正）
- [x] `src/config/story/cutscenes.ts` に `stage5-awakening` を登録（休眠コア共鳴・RAY内心のみ・科学者ログなし・監督承認テキスト）
- [x] `src/config/story/stage5.ts` の `inner.bossDefeated` を演出冒頭へ移設（postBoss 分岐で未発火になるため削除）

## フェーズ7: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`（458 passed / 41 files）
- [x] リントエラーがないことを確認
  - [x] `npm run lint`（クリーン）
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`（エラーなし）
- [x] ビルドが成功することを確認
  - [x] `npm run build`（成功・chunk size 警告は既存で無害）

## フェーズ8: 実機検証（実プレイ挙動まで・メモリ準拠）

Playwright + `window.lastSpark` でランタイムを直接検査（描画だけでなく実挙動を検証）。

- [x] 正規クリア相当: Stage6（empowered）で通常弾=上下2発（vy=±130, π/10スプリット）＋チャージ=ビーム発動を確認
- [x] リトライ維持: `fromStageSelect` なしで起動→registry 維持→`player.empowered=true` を確認
- [x] 単体選択は素: `fromStageSelect:true` で起動→registry=false→`player.empowered=false` を確認（全クリア後タイトル発も同経路）
- [x] ビーム当たり判定: body=720×22（**膨張なし**）・敵 hp3→0 撃破（per-target 3tick×1=総威力チャージ弾3相当）・同一対象300ms間引き/別対象独立/命中で消えない・寿命後に自破棄＋グループ除去（リークなし）
- [x] 既存弾は従来どおり消える: 通常弾→敵 overlap 経路は diff 上**完全無変更**（onHit型を `HitKind` に拡張したのみ）＝回帰は原理的に不可。非強化=単発・vy=0 を実測確認
- [x] 複数アスペクト比で射程一定: `beamLength=720`（ワールド生px・カメラがズーム吸収）。ビューポート変更でビーム長不変を確認
- [x] 描画視認: ビーム発光（シアン・ADD）が正常描画（黒画面なし）。要素スクショで確認

## フェーズ9: セキュリティレビューとマージ準備

- [x] クルトワ（security-engineer）によるセキュリティレビュー（前セッションで実施・Critical/High/Medium/Low すべてゼロ＝GO。本セッションでソース変更なしを Read で確認済み）
- [x] Critical/High 指摘があれば修正（指摘なしのため修正不要）
- [ ] 最新 master を feature ブランチへ取り込み（コンフリクト解消）
- [ ] push → PR 作成 → master へマージ（Merge commit）→ worktree 削除

---

## 実装後の振り返り

### 実装完了日
2026-06-14

### 計画と実績の差分

**計画と異なった点**:
- 実機検証は「実際にプレイ操作する」のではなく、`window.lastSpark` 経由でランタイムを直接検査する方式を採用。発射数・velocity・body サイズ・registry 値・敵hp 推移を直接読むことで、描画スクショより強い「実挙動」検証ができた。

**新たに必要になったタスク**:
- なし（計画どおり）。

**技術的理由でスキップしたタスク**（該当する場合のみ）:
- なし。

### 学んだこと

**技術的な学び**:
- Beam を `Phaser.GameObjects.Rectangle` で実装したことで body=720×22 がネイティブに一致し、1x1+setDisplaySize の Arcade body 膨張落とし穴を回避できた（実機で body 非膨張を確認）。
- per-target tick（`shouldHazardTick` 再利用）により、ビーム持続中に 1 体を 3tick×1 で撃破＝総威力チャージ弾3相当に収まることを実測で確認。

**プロセス上の改善点**:
- Playwright 検証時、headless ブラウザが縦持ち判定されて GameScene が OrientationScene により pause され、物理が止まる（collider が pending のまま active 化しない）。検証時は scene status と time 進行を必ず確認し、必要なら明示 resume する。

### 次回への改善提案
- Phaser ゲームのランタイム検査は `window.lastSpark` 公開＋`browser_evaluate` での状態直読が有効。シーン pause 状態のチェックを検証手順の冒頭に入れると取りこぼしを防げる。
