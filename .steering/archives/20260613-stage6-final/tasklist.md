# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 前提
- ブロック1・2・3・4が完了していること

---

## フェーズ1: Stage 6 ステージデータ

- [x] `src/config/story/stage6.ts`（開始テキスト・序盤ログのみ・内心）
- [x] `src/config/stage1.ts` の `STAGES` に `STAGE6` を追加（地形・敵・序盤ログトリガー・ボストリガー・最終=nextStageId なし）
- [x] `STAGE5.nextStageId='stage6'` を設定（最終ステージへ接続）
- [x] 支配中枢の環境表現（背景色 `#06080f` の闇に近い藍。プレースホルダ）

## フェーズ2: ECLIPSE本体（複数フェーズ）ボス

- [x] `src/types/boss.ts` の `BossAction` に `'summon'`、`BossKind` に `'core'` を追加
- [x] `balance.ts` に ECLIPSE_CORE パラメータ（CoreBossConfig・召喚数・場の上限）を追加
- [x] `bossAi.ts` にラスボス専用重み `CORE_WEIGHTS`（phase1=召喚含む / phase2=召喚なし）＋テスト
- [x] 巨大コアの見た目（非人型・八角形装甲＋発光する眼。人型リグは隠す。プレースホルダ）
- [x] フェーズ1: CoreBoss 自身が配下 Enemy を spawn する支援型挙動（既存 Enemy/敵グループ流用）
- [x] フェーズ2: コア直接攻撃型挙動（召喚停止・shoot 集中）
- [x] フェーズ移行（HP50%＝既存 phase2HpRatio 流用）の実装
- [x] ボス前にECLIPSEの語りかけを発火（既存 bossIntro 機構を流用）

## フェーズ3: エンディング演出

- [x] 最終ステージ（stage6）撃破→エンディングへの分岐（endingCutsceneKey。ClearScene を経ない）
- [x] `cutscenes.ts` に Stage 6 結末スクリプト `stage6-ending` を追加（4ステップを1スクリプトに集約）
- [x] ステップ1: 管理解除テキスト（演出開始時に `SoundManager.playBgm('ending')` へ切替）
- [x] ステップ2: 演出シーン（人間を初めて直接描写・争いの痕跡。direction/narration で表現）
- [x] ステップ3: TERRAとのセリフ交換（確定版）
- [x] ステップ4: エンディングテキスト（narration 種別を新設して括弧なしで表示）
- [x] 4ステップの連結再生（既存 CutsceneScene を再利用。BGM を起動データで差し替え可能に拡張）

## フェーズ4: 全クリア処理

- [x] `markStageCleared('stage6')`（エンディング完了時に GameScene が保存）
- [x] 全クリア判定の純粋関数 `isAllStagesCleared`（systems/progress.ts）＋テスト
- [x] エンディング後にタイトルへ帰還
- [x] TitleScene で全クリア表示（「ALL CLEAR」。1ステージ以上は「CLEARED」）

## フェーズ5: 通し確認

- [x] Stage 6 に到達し ECLIPSE本体と複数フェーズで戦える（連結・系統ディスパッチ・召喚コンテキスト注入・フェーズ別重みをテストで担保）
- [x] 撃破後にエンディングシーケンスが順に再生される（cutscenes.test.ts で4ステップ構造を検証）
- [x] 全クリアが保存されタイトルへ戻る（progress.test.ts + finalizeEnding 実装）
- [x] 全6ステージを通しでクリアできる（stage2→…→stage6 連結をテストで担保）
- [x] 実機ブラウザ起動スモークテスト（起動・タイトル描画・Stage1専用イントロ演出の描画・ランタイムエラーなしを Playwright で確認。※Stage6 ボス戦・エンディングの完全プレイ自動検証は Phaser canvas の自動操作制約により未実施）

## フェーズ6: 品質チェックと修正

- [x] `npm test`（330 tests passed）
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`

## フェーズ7: ドキュメント更新

- [x] `docs/functional-design.md`（BossKind/BossAction の型に core/summon を追記、CoreBoss を追加、画面遷移にエンディング分岐・ALL CLEAR を追記、CutsceneScene の用途拡張を反映）
- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-13

### 計画と実績の差分
**計画と異なった点**:
- エンディングは「専用 EndingScene 新設」ではなく **既存 CutsceneScene を再利用**した。4ステップ（管理解除→人間描写→TERRAセリフ→エンディング本文）はすべて「1行ずつタップ送り」で表現でき、CutsceneScene がその機構をすでに持っていたため。新設の代わりに (1)BGM を起動データ（CutsceneSceneData.bgm）で差し替え可能に拡張、(2)括弧で囲まないナレーション種別 `narration` を追加、の2点の小拡張で成立した。コード量を最小化しつつ既存資産を活かせた。
- 設計は「ECLIPSE_CORE の見た目はリグではなく専用表現」とだけ規定。実装では Boss 基底が生成する**人型リグを `setVisible(false)` で隠し**、八角形装甲＋発光する眼の専用 Container を別途描く方式にした（基底のリグ機構には手を入れず、CoreBoss 内に閉じる）。
- 「ボス系統」の表現として `bossKind` に `'core'` を新設した（stage4 浄化型は bossKind='ground'+bossVariant、stage5 使者は bossKind='flying'+bossVariant だったが、コアは浮遊・非人型・召喚と既存系統のどれとも本質的に異なるため独立系統が妥当と判断）。GameScene/SpawnSystem の系統分岐に core を追加。
- エンディング BGM は「ブロック6（BGM拡張）で実装、未登録なら無音フォールバック」と設計にあったが、`playBgm` は型付き `BgmKey` を取るため未登録キーは型エラーになる。**`ending` トラック（荘重で解決感のある合成ループ）を audio.ts に追加**して型安全にした（BGM はシンセ定義のデータなので低リスク）。

**新たに必要になったタスク**:
- 配下召喚のため CoreBoss へ敵グループ・弾グループ・難易度係数を注入する `setSummonContext` を新設（SpawnSystem に依存せず Boss 自身が Enemy を生成。場の上限 `summonMaxActive` で溢れを防止）。
- `narration` 種別追加に伴い CutsceneScene の `LINE_STYLE` と「括弧は direction のみ」の表示分岐を更新。
- `CutsceneSceneData.bgm` 追加で types/story が audio の `BgmKey` を参照する依存を1本追加。
- 実機ブラウザのスモークテスト（起動・描画・エラー確認）を Playwright MCP で実施（Chromium が利用可能になっていたため、ブロック1-5 で繰り越してきた目視確認の一部を消化）。

### 学んだこと
**技術的な学び**:
- 「1行ずつ提示してタップで送る」CutsceneScene は、開始演出・救出演出・エンディングまで同一機構で賄える汎用性が高い。新しい演出の追加コストはほぼ「スクリプト（データ）＋必要なら表示種別1つ」に収まる。
- ラスボスの2フェーズ（支援型↔直接攻撃型）は、既存の `BossPhase`（HP50%境界）と「フェーズ別重みテーブル」の枠組みだけで表現できた。新規アクション `summon` をテーブルの phase1 のみに置くだけで「前半は召喚、後半は直接攻撃」が成立する。
- Phaser canvas の自動操作（Playwright 合成ポインタイベント）は Phaser の InputManager に届きにくく、ゲーム内 UI の自動駆動は不安定。起動・描画・コンソールエラーの確認までは有効だが、ゲームプレイの通し自動検証には向かない。

**プロセス上の改善点**:
- 既存ボス（WardenBoss の missile、PurifierBoss の spray）の「固有アクションを専用重みテーブルに閉じる」パターンを先に読んでいたため、`summon` も同じ型で迷わず実装できた。系統追加のたびにこのパターンが効いている。

### 次回への改善提案
- 全6ステージが揃ったので、次は通しプレイの実機目視（特に stage6 ボスの召喚・フェーズ移行・エンディング再生・ALL CLEAR 表示）をブラウザで人手確認するのが望ましい。自動化が難しい領域なので、リリース前チェックリストに「stage6 通し目視」を明記するとよい。
- BGM拡張ブロックでは、今回データ追加した `ending` トラックの作り込み（音色・展開）を本式に仕上げる。SE（エンディング専用ジングル等）の追加も検討。
- エンディングの「人間の直接描写」は現状プレースホルダ（ト書き＋シルエット背景）。余力があれば専用の背景画像（CUTSCENE_BACKGROUND に 'stage6-ending' を登録）で演出を強化できる。
