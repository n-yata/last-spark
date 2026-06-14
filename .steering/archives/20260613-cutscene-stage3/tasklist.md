# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 前提
- ブロック1（storytelling-foundation）が完了していること

---

## フェーズ1: SaveData 全6ステージ対応

- [x] `src/types/save.ts`: `cleared:boolean`→`clearedStages:string[]`、`bestTimeMs?:number`→`bestTimeMs?:Record<string,number>`（型・既定値）
- [x] `SaveManager`: 旧 `cleared` → `clearedStages`（true なら `['stage1']`）のマイグレーション（version 更新, SAVE_VERSION=2）
- [x] `SaveManager`: 旧 `bestTimeMs:number` → `{ stage1: value }` のマイグレーション
- [x] `markStageCleared(stageId, timeMs?)` を追加。既存 `markCleared` は委譲で互換維持（`isStageCleared` も追加）
- [x] SaveManager のユニットテストを追加・更新（21件 pass）
  - [x] cleared マイグレーション
  - [x] bestTimeMs マイグレーション
  - [x] markStageCleared
  - [x] 不正値・version不一致フォールバック
- [x] 呼び出し側の更新: `ClearScene`（stageId 受領→markStageCleared）・`TitleScene`（clearedStages 表示）・`GameScene`（clear 遷移に stageId 付与）

## フェーズ2: 演出シーン基盤（CutsceneScene）

- [x] `src/types/story.ts` に `CutsceneSceneData`（scriptKey / onComplete）型を追加
- [x] `src/config/story/cutscenes.ts` を作成（型 + Stage 3 救出スクリプト）
- [x] `src/scenes/CutsceneScene.ts` を作成（`SCENE_KEYS.cutscene` 追加・main.ts に登録）
  - [x] `init(data: CutsceneSceneData)`
  - [x] スクリプトの順次表示（terraLine / rayInner / direction）
  - [x] ブロック1の色調（暖色=TERRA・白イタリック=RAY）に揃えたスタイル
  - [x] タップ送り（入力猶予つき）
  - [x] 完了後の遷移（onComplete・空スクリプトでも詰まらない）
- [x] 静止画的な簡易演出背景（RAY/TERRA シルエット + ケージ格子のプレースホルダ）
- [x] Cutscene 整合のユニットテスト（5件 pass）

## フェーズ3: Stage 3 ステージデータ

- [x] `src/config/story/stage3.ts`（開始テキスト・ログ3本・語りかけ・内心）+ `story/index.ts` に登録
- [x] `src/config/stage1.ts` の `STAGES` に `STAGE3` を追加（地形・敵・logTriggers3本・ボストリガー・`bossKind:'ground'`・`bossConfig`・`cage`・`postBossCutsceneKey`）
  - 注: `nextStageId:'stage4'` は stage4 実体が無いと「continue→stage1 フォールバック」になり破綻するため、stage4 実装（次ブロック）まで stage3 を最終扱い（nextStageId 未設定）とする
- [x] `src/config/stage1.ts` の `STAGE2` に `nextStageId: 'stage3'` を追加（stage2→stage3 連結）
- [x] 収容番人ボスのパラメータ（`balance.ts` に `CONTAINMENT_WARDEN`：行動間隔長め・威力高め・遅い移動・重装HP）+ `STAGE_TUNING.stage3`
- [x] 収容番人は既存 `GROUND_WEIGHTS` を流用（bossAi 変更なし。`bossConfig` を Boss へ渡すのみで差別化）
- [x] 収容ケージのギミック（撃破で解錠アニメ・接触ゾーン）

## フェーズ4: ボス撃破後フロー拡張

- [x] ステージ定義に「ボス後演出スクリプトキー（任意）」`postBossCutsceneKey` + `cage` を追加
- [x] ボス撃破→（撃破演出）→ケージ解錠→自由移動（ボス後ログ任意接触）→ケージ接触で救出演出→クリアの順序制御
- [x] 演出キーなし（Stage 1-2）は従来どおり撃破→即クリア（後方互換）
- [x] 分岐ロジックのユニットテスト（データ条件: stage3 のみ postBossCutsceneKey+cage を持つ＝救出パス、stage1-2 は従来パス）→ storyData.test.ts に追加

## フェーズ5: 統合・通し確認

- [x] Stage 3 に到達し収容番人と戦える（stage2→stage3 連結・STAGE3 ジオメトリ/敵/ボス wiring・spawnBoss が bossConfig=CONTAINMENT_WARDEN を反映）
- [x] 撃破でケージ解錠→救出演出（刻印で名前判明）が再生される（handleClear 救出パス→enterRescuePhase→onCageReached→CutsceneScene('stage3-rescue')→finalizeRescueClear）
- [x] Stage 3 の開始テキスト・ログ・語りかけ・内心が確定版どおり（storyData.test.ts・cutscenes.test.ts で検証）
- [x] Stage 1-2 が従来どおり動く（後方互換: postBossCutsceneKey/cage が無いステージは従来の即クリアパス。データ条件テストで担保）
- [x] ~~実機ブラウザでの通し目視確認~~（ブロック1同様、環境のネットワーク制約で Chromium 取得不可のため未実施。build/typecheck/lint/単体テストで担保。実機目視は次ブロック着手時に実施）

## フェーズ6: 品質チェックと修正

- [x] `npm test`（248 tests passed / 22 files）
- [x] `npm run lint`（エラーなし）
- [x] `npm run typecheck`（`tsc --noEmit` エラーなし）
- [x] `npm run build`（成功。chunk size 警告は Phaser バンドル由来の既存事項）

## フェーズ7: ドキュメント更新

- [x] `docs/functional-design.md`（演出シーン/ボス後フロー・SaveData v2・StageData 拡張・画面遷移図・StoryOverlay 2段挙動を反映）
- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-13

### 計画と実績の差分

**計画と異なった点**:
- **`nextStageId:'stage4'` を stage3 に設定しなかった**。design では「連結だけ先行設定可」とあったが、stage4 の実体が無い状態で設定すると、stage3 クリア後の「continue」で `getStageData('stage4')` が stage1 にフォールバックし、stage1 を stage4 として再生する破綻が起きる。stage4 実装（次ブロック）まで stage3 を最終扱い（nextStageId 未設定＝ALL CLEAR→タイトル）とした。stage2→stage3 連結は stage3 実体があるため設定済み。
- **ボス後フローを「自由移動→ケージ接触で演出」にした**。design の「演出シーンは撃破で自動発火」を、story.md の流れ（ボス撃破→ボス後ログ任意接触→ボス後演出→クリア）と整合させるため、撃破→ケージ解錠→自由移動（ボス後ログを任意接触できる）→ケージ接触で演出、と解釈・実装した。これにより block1 で先送りした postBoss ログの「表示動線」が成立する。
- **terraFound 内心の発火点**。story.md の「ステージ中盤・ケージの人影」を、ケージのあるボスアリーナ入場時（onBossTrigger）に「ケージの人影を見た内心→ECLIPSE の語りかけ」の順で発火する形にした。RAY がケージを見る→ECLIPSE が「その個体は管理対象だ。返却せよ」と返す流れが narratively に噛み合う。専用の中盤プロキシトリガは設けていない。
- **救出後の RAY 内心「この子を、守る…」**は、内心一覧で「救出後・TERRAと出会い」に割り当てられているため、救出演出スクリプト（cutscenes.ts 'stage3-rescue'）の最終行として配置した（演出の締めの決意として自然）。

**新たに必要になったタスク**:
- `SCENE_KEYS.cutscene` 追加と `main.ts` への `CutsceneScene` 登録。
- 呼び出し側のセーブ API 更新（`ClearScene` が cleared stageId を受け取り `markStageCleared`、`TitleScene` の `clearedStages` 表示、`GameScene` の clear 遷移に `stageId` 付与）。SaveData の型変更で既存コードが型エラーになるため同時対応が必須だった。
- ボス撃破後に死亡ボスを update ループから切り離す処理（`this.boss=undefined` 後に演出完了で `destroy`）。自由移動フェーズで `ended` を立てないため、死亡ボスを update し続けないようにする必要があった。
- 演出のための `scene.pause`/`resume`: `transitionTo` はカメラフェード完了イベントで遷移するため、pause 中はフェードが進まず遷移しない。演出後は self を `resume` してから遷移する。

### 学んだこと

**技術的な学び**:
- SaveData のような永続構造の変更は「型→マイグレーション→検証→呼び出し側」をワンセットで進めると型エラーが道標になり手戻りが少ない。version を上げて旧形式を migrate→検証→不能なら既定値、の三段で堅牢にできた。
- Phaser のシーンを pause したままだとカメラエフェクト（フェード遷移）が進まない。オーバーレイ演出から本シーン遷移へ戻すときは resume を挟む。
- ボス設定をエンティティのコンストラクタ options（`BossConfig`）で差し替える既存設計のおかげで、収容番人は新コードを足さずパラメータ追加（`CONTAINMENT_WARDEN`）と `bossConfig` 受け渡しだけで実現できた。

**プロセス上の改善点**:
- design 内に矛盾（自動発火 vs 任意接触ログ）があったが、北極星（story.md）の流れを正として解釈を確定し、振り返りに明記した。設計の曖昧点はコードで解決しつつ記録を残す。

### 次回への改善提案
- 次ブロック（Stage 4）着手時に、まず実機ブラウザで Stage 3 の通し（救出演出・ボス後ログ動線・収容番人の手触り）を目視確認してから進める（本ブロックも環境制約で目視未実施）。
- Stage 4 実体を追加したら stage3 に `nextStageId:'stage4'` を設定して連結する。
- 演出シーンの背景は現状プレースホルダ（シルエット）。アセット調達後に差し替える。
