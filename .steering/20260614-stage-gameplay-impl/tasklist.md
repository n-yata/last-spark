# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: ログ系撤去（利用箇所→定義の順・各ステップで typecheck）

- [x] GameScene のログ生成・接触処理を削除
  - [x] `import LogTrigger` を削除
  - [x] `logTriggers` グループフィールドを削除（firstLogDone フラグも）
  - [x] `buildLogTriggers()` を削除
  - [x] `onLogOverlap()` を削除
  - [x] overlap 登録（physics.add.overlap）を削除
- [x] `systems/storyDirector.ts` の `logFound` 処理と `scientistLog` スタイルを削除
- [x] `ui/StoryOverlay.ts` の `scientistLog` 描画分岐（暖色 serif）を削除
- [x] `types/story.ts` の型を削除（`scientistLog`/`LogSlot`/`logFound`/`StageStory.logs`）
- [x] `config/stage1.ts` の `LogTriggerSpawn` 型・`StageData.logTriggers`・全6ステージの `logTriggers` 配列を削除
- [x] `config/story/stage1〜6.ts` の各 `logs` フィールドを削除（発火しなくなった firstLogFound/firstLogRead 内心キーも削除）
- [x] ログ系テストを撤去・修正
  - [x] `tests/unit/entities/LogTrigger.test.ts` を削除
  - [x] `storyDirector.test.ts` のログ関連assertionを削除
  - [x] `config/storyData.test.ts` の「ログトリガー配置」describeを削除
  - [x] `config/coreBoss.test.ts` の logTriggers slot 検証を削除
- [x] `entities/LogTrigger.ts` 本体を削除
- [x] `npm run typecheck` でログ系の残参照が0であることを確認（型チェック通過）
- [x] grep で `LogTrigger`/`scientistLog`/`logFound`/`LogSlot`/`logTriggers` がコードから消えたことを確認（src で 0 件）
- [x] 全テスト（373件）が通ることを確認

## フェーズ2: stage6-ending 群衆描写削除

- [x] `config/story/cutscenes.ts` のエンディングから群衆描写ステップ（施設から人間たちが姿を見せる）を削除
- [x] 争った跡のト書き（落書き・崩れたバリケード）が残っていることを確認
- [x] `tests/unit/config/cutscenes.test.ts` を群衆削除後の構成に追従修正（群衆が無いことを検証する回帰テストを追加）

## フェーズ3: ボスの安い手当て（挙動は変えない）

- [x] S2 哨戒機: 単眼／サーチライトのモチーフを強調
  - [x] sensor 描画は walker と共用のため、専用形状 `cyclops`（大きな丸い単眼レンズ）を新設し `PreloadScene.ts` に描画追加
  - [x] `characterRig.ts` の bossFlying 頭だけ `sensor`→`cyclops` に差し替え（主/副2色でサーチライトのコントラスト）
  - [x] FlyingBoss の挙動は不変（figure のみ変更。rig 任せで挙動コードは触らない）
  - [x] walker など雑魚への波及がないことを回帰テストで保証（characterRig.test.ts）
- [x] S4 環境管理機: 毒弾を汚染トーンと地続きの色に
  - [x] `assetKeys.ts` + `PreloadScene.ts` に毒弾専用テクスチャ `projectilePoison`（毒々しい黄緑 `0xaef03a`・背景`#151a0c`と地続き）を追加
  - [x] `PurifierBoss.fireSpray` が `fire()` 後に `setTexture(projectilePoison)` で見た目だけ差し替え
  - [x] 通常敵の弾色に影響していないことを確認（専用テクスチャ・弾種は normal のまま）
  - [x] `balance.ts` の攻撃パラメータ（弾数・角度・速度）は未変更（ダメージ・挙動不変）

## フェーズ4: Hazard（S4汚染床）新規実装

> **設定整合（シャビ確認 2026-06-14）**: 「毒」は人間を殺すための設置物ではない（人類はほぼ絶滅・殺す相手がいない）。
> 汚染床＝**人間の環境破壊が残した荒廃＝死んだ世界そのもの**（殺意の罠ではない）。腐食性なので機械のRAYも蝕む。
> 「毒（生物毒・殺意）」の連想を消すため、内部表現を `poison`→`pollution`（汚染）に統一リネーム。
> ボスの環境管理機が撒く弾も「汚染霧」で一貫（管理AIの「浄化の名の汚染」）。

- [x] `entities/Hazard.ts` を新規作成（LogTrigger を雛形に）
  - [x] 重力OFF・immovable・overlap判定のみ（configureBody再適用パターン）
  - [x] 多重ヒット防止のクールダウン（tryHit。純粋ロジックは `systems/hazardRules.ts` に切り出し）
  - [x] 汚染色（`0xaef03a`）の半透明矩形＋脈打ちアニメの見た目
- [x] プレイヤーの被ダメージAPI（`Player.takeDamage` 経由）を特定し、`CombatSystem.applyPlayerDamage` を新設（死亡・被弾エフェクトを共通経路で扱う）
- [x] `config/stage1.ts` の `StageData` に `hazards?: HazardRect[]` を追加し S4 に配置（1つ目の奈落を地面で埋めて汚染床化、走行区間にもう1つ。2つ目の奈落は実落下死として残す）
- [x] GameScene で Hazard 生成 ＋ overlap → 被ダメージ経路を接続（`buildHazards`）
- [x] `balance.ts` に汚染床ダメージ量（`pollutionDamage`）・クールダウン（`pollutionTickMs`）の定数を追加
- [x] `tests/unit/systems/hazardRules.test.ts` を作成
  - [x] クールダウンで多重ヒットが抑制されること
  - [x] クールダウン経過後は再度ヒットすること
  - [x] 初回（lastHitAt=-Infinity）は必ず発火すること
- [x] `tests/unit/config/stage4Hazards.test.ts` を作成（汚染床が地面の上に乗る位置にあり、奈落の上に浮いていないこと＝踏む前に落下死しない）
- [x] 設定整合: `poison`→`pollution` リネーム＋コメント整備（殺意の罠ではない・荒廃の遺産・機械も腐食）

## フェーズ5: 各ステージ構成の再配置（②の手触り・クリア可能性最優先）

> **方針**: ②設計「安く・最小・クリア可能性最優先」に従い、proven な既存レイアウトを壊さない安全な
> 範囲で手触りを補強。構造変更は S1(まばら化)・S5(足場密集)に絞り、既にテーマを体現している
> S2(梯子)/S3(檻)/S4(汚染床)/S6(最小)は構造を据え置き。全ステージのクリア可能性をガードテストで保証。

- [x] S1: 開けて静か・敵まばら（孤独）— 敵を 8→6 体に間引き、静かな空白を作る
- [x] S2: 既存梯子の縦攻略を強調（謎・上へ）— 既に梯子主役の縦攻略。構造据え置き
- [x] S3: 足場で狭く囲んだ通路感（閉じ込め）・奥に檻 — 檻(cage)が閉じ込めの主役。構造据え置き
- [x] S4: 奈落の一部を汚染床に置換/併設（揺らぎを足元で）— フェーズ4で実装済み
- [x] S5: 足場を詰めて機械密集（冷たく硬い）— 任意足場を 5→8 枚に増やし密集感を出す（地上ルートは不変）
- [x] S6: ギミック抑えめ・ボス集中（対決）— 既に最小構成。据え置き
- [x] 各ステージが詰み・即死・到達不能なくクリア可能であることを確認（`stageClearability.test.ts` で全奈落がジャンプ可 or 梯子迂回可を保証）

## フェーズ6: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`（394件 全通過）
- [x] リントエラーがないことを確認
  - [x] `npm run lint`（エラーなし）
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`（エラーなし）
- [x] ビルドが成功することを確認
  - [x] `npm run build`（✓ built・PWA生成。チャンクサイズ警告は Phaser 由来の既存事項）

## フェーズ7: セキュリティレビューとPR

- [ ] クルトワ（security-engineer）のセキュリティレビューを実施（変更ファイル全件）
- [ ] Critical/High の指摘があれば修正
- [ ] master を pull して feature ブランチに取り込み（コンフリクト解消）
- [ ] feature ブランチを push
- [ ] PR 作成（`gh pr create`）
- [ ] 実装後の振り返り（このファイル下部に記録）

---

## 実装後の振り返り

### 実装完了日
{YYYY-MM-DD}

### 計画と実績の差分

**計画と異なった点**:
- {記入}

**新たに必要になったタスク**:
- {記入}

**技術的理由でスキップしたタスク**（該当する場合のみ）:
- {記入}

### 学んだこと

**技術的な学び**:
- {記入}

**プロセス上の改善点**:
- {記入}

### 次回への改善提案
- {記入}
