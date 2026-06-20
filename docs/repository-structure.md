# リポジトリ構造定義書 (Repository Structure Document)

> `docs/architecture.md` で定義したレイヤー構成(Scene / System / Entity / Persistence)を、Phaser 3 + Vite + PWA の具体的なディレクトリ構造に落とし込む。

## プロジェクト構造

```
last-spark/
├── public/                     # 静的配信ファイル(Vite がそのまま配信)
│   ├── manifest.webmanifest    # PWA マニフェスト(vite-plugin-pwa 管理の場合あり)
│   ├── icons/                  # PWA アイコン各サイズ(icon-192/512/512-maskable.png)
│   └── assets/                 # ゲームアセット(ランタイム読み込み)
│       └── cutscenes/          # カットシーン背景の SVG(stageN-intro/rescue/ending)
│                               # ※ スプライト/タイルマップ/HUD/BGM・SE は外部素材を持たず、
│                               #    キャラ・敵・地形・背景・音は実行時に手続き生成する(知財方針)
├── src/                        # ソースコード(TypeScript)
│   ├── main.ts                 # エントリポイント(Phaser.Game 生成、シーン登録)
│   ├── scenes/                 # Scene レイヤー(画面・状態)
│   ├── entities/               # Entity レイヤー(Player/Enemy/Boss/Projectile)
│   ├── systems/                # System レイヤー(入力・戦闘・出現・ボスAI)
│   ├── persistence/            # Persistence レイヤー(SaveManager)
│   ├── config/                 # ゲーム定数・バランス値・Phaser 設定
│   ├── ui/                     # HUD/仮想ボタンなど描画コンポーネント
│   └── types/                  # 共通型定義
├── tests/                      # テストコード
│   ├── unit/                   # ユニットテスト(src と同じ構造)
│   ├── integration/            # 統合テスト
│   └── e2e/                    # E2Eテスト(Playwright)
├── docs/                       # プロジェクトドキュメント
│   └── ideas/                  # 下書き・アイデア
├── .steering/                  # 作業単位ドキュメント(git 管理外)
├── .claude/                    # Claude Code 設定(commands/skills/agents)
├── index.html                  # Vite のエントリ HTML
├── vite.config.ts              # Vite + vite-plugin-pwa 設定
├── vitest.config.ts            # Vitest 設定
├── playwright.config.ts        # Playwright 設定
├── tsconfig.json               # TypeScript 設定
├── .eslintrc.cjs / eslint.config.js # ESLint 設定
├── .prettierrc                 # Prettier 設定
├── package.json
├── CREDITS.md                  # 使用アセットのライセンス/出典
└── README.md
```

## ディレクトリ詳細

### src/ (ソースコードディレクトリ)

#### src/scenes/ (Scene レイヤー)

**役割**: 画面/ゲーム状態の管理とシーン遷移。Phaser の `Scene` を1ファイル1シーンで配置する。

**配置ファイル**(現行の全シーン):
- `BootScene.ts`: 初期化・表示スケール/向き設定
- `PreloadScene.ts`: アセット一括ロード + ローディング表示
- `TitleScene.ts`: タイトル画面(`LAST SPARK` ロゴ + スタート導線)
- `GameScene.ts`: ステージ本体(プレイヤー/敵/ボス/カメラ/物理を統括)
- `UIScene.ts`: HUD(ライフ/ボスHP/チャージゲージ)。`GameScene` と並行起動
- `CutsceneScene.ts`: 演出シーン(オーバーレイ)。静止画的演出 + 交互テキスト(TERRA/RAY)+ト書きをタップ送りで再生し完了後に指定遷移を呼ぶ。Stage 1 開始・Stage 3 救出後・Stage 4-5 開始・Stage 6 エンディングで使用
- `GameOverScene.ts`: ゲームオーバーとリトライ
- `ClearScene.ts`: クリア演出 + クリア状況保存
- `OrientationScene.ts`: 縦持ち時の横向き案内オーバーレイ

**命名規則**: PascalCase + `Scene` 接尾辞(例: `GameScene.ts`)。

**依存関係**:
- 依存可能: `systems/`, `entities/`, `persistence/`, `ui/`, `config/`, `types/`
- 依存禁止: なし(最上位レイヤー)。ただし他シーンの内部実装に直接依存せず、遷移はシーンキーで行う。

#### src/entities/ (Entity レイヤー)

**役割**: ゲーム内オブジェクトの状態と振る舞い。Phaser の `Arcade.Sprite` を継承。

**配置ファイル**:
- `Player.ts`: プレイヤー(移動/ジャンプ/発射/被弾)
- `Enemy.ts`: 雑魚敵(パターン別の振る舞い)
- `Projectile.ts`: 弾(通常/チャージ共通)
- `Hazard.ts`: ダメージ床(毒だまり等。重なり判定のみ・物理衝突なし)
- `CharacterRig.ts`: キャラ見た目の関節リグ(物理 `Arcade.Sprite` から表示を分離する表示専用コンポーネント)
- `Boss.ts`: 接地型ボス基底(フェーズ/アクション)。各系統はこれを継承する:
  - `FlyingBoss.ts`: 飛行/浮遊型(stage2/5)
  - `WardenBoss.ts`: 収容番人・重装ミサイル型(stage3)
  - `PurifierBoss.ts`: 浄化型・扇状の範囲攻撃(stage4)
  - `CoreBoss.ts`: ECLIPSE 本体・非人型コア(stage6 ラスボス)

**命名規則**: PascalCase(エンティティ名)。

**依存関係**:
- 依存可能: `config/`, `types/`、および `systems/` 内の **Phaser 非依存の純粋関数モジュール**(camelCase ファイル: `bossAi.ts` / `shot.ts` / `combatRules.ts` / `playerMovement.ts` 等。状態・副作用を持たない最下位ロジックとして扱う)
- 依存禁止: `scenes/`、および状態・副作用を持つ **System クラス**(`InputController` / `CombatSystem` / `SpawnSystem` 等。逆依存禁止。System から操作される側)

#### src/systems/ (System レイヤー)

**役割**: Entity をまたぐ横断ロジック。

**配置ファイル**(状態を持つ System クラスと、Phaser 非依存の純粋ロジック関数群が同居する):

State を持つ System クラス:
- `InputController.ts`: タッチ/キーボード入力を抽象操作(`InputState`)に変換
- `CombatSystem.ts`: 衝突登録・ダメージ適用・撃破処理
- `SpawnSystem.ts`: 敵出現・ボストリガ(ボス全身が画面内に見える位置まで発火を遅らせる)
- `SoundManager.ts`: サウンド出力サービス(Web Audio で BGM/SE を合成。`getSound()` シングルトンで全シーン横断。外部音源ファイルは使わない)
- `EffectsManager.ts`: 戦闘演出(パーティクル爆発・カメラシェイク・ボス撃破シーケンス)の統括。チューニング値は `config/effects.ts` に集約

純粋ロジック関数群(camelCase。Phaser/Web Audio 非依存・テスト可能):
- `bossAi.ts`: ボス行動抽選(`pickNext*BossAction` 等。系統別の重みテーブル)
- `difficulty.ts`: 難易度設定(`normal`/`hard`)からステージ係数・被ダメージ倍率・ストーリー表示可否・表示ラベルを解決する純粋関数
- `soundSynth.ts`: 音量計算・音名→周波数・BGM ノートスケジュール・探索 BGM 選択
- `hudFx.ts`: HUD 演出(ボスバー出現フィル・被ダメ点滅)の純粋関数(ui からも参照可)
- `shot.ts` / `shotControl.ts`: ショット仕様の生成と、タップ/チャージ/連射の状態機械(`stepShot`)
- `playerMovement.ts`: 着地判定・梯子把持/昇降の純粋関数(`shouldLandOnOneWay` / `overlapsAnyLadder` / `resolveLadderState` / `climbVelocity`)
- `combatRules.ts` / `hazardRules.ts`: ダメージ・無敵・ハザード(スリップダメージ)判定の純粋ロジック
- `rigAnimation.ts`: `CharacterRig` のパーツ変位算出(歩行スイング・反動・けぞり等)
- `storyDirector.ts`: `StoryEvent`→`TextRequest[]` 変換と `TEXT_STYLES`(`StoryTextKind`→スタイル)
- `backgroundPainter.ts`: ステージ背景(パララックス)の描画(`paintStageBackground`)
- `sceneTransition.ts`: フェード付きシーン遷移(`transitionTo` / `fadeIn`、多重発火ガード)
- `dprScaling.ts`: 高 DPI(デバイスピクセル比)対応のスケーリング補助
- `progress.ts`: ゲーム進行(全クリア判定)の純粋関数(`isAllStagesCleared`)

> 上記は主要ファイルの一覧。System レイヤーは機能追加で増えるため網羅を保証せず、新規ファイルは本節の分類(State を持つ System クラス / 純粋ロジック関数群)に従って配置する。

**命名規則**: System クラスは PascalCase + `System`/`Controller`/`Manager`。純粋ロジック関数群は camelCase(例: `bossAi.ts` / `soundSynth.ts`)。

**依存関係**:
- 依存可能: `entities/`, `config/`, `types/`, `persistence/`(`SoundManager` が設定読込に `SaveManager` を利用)
- 依存禁止: `scenes/`(Scene へはイベント/コールバックで通知)

**横断的出力サービスの例外**: `SoundManager` は `CombatSystem`/`SpawnSystem` 等の「Entity を操作する System」とは異なり、**Entity への参照を一切持たない出力専用サービス**。`getSound()` 経由で Scene/Entity から呼び出してよい(`entities/` → `SoundManager` の依存を許容)。`SoundManager` は `entities/`・`scenes/` を import しないため逆依存・循環は生じない(`console` ロギングと同種の横断関心事)。

#### src/persistence/ (Persistence レイヤー)

**役割**: セーブデータの読み書き・既定値生成・バージョン検証。

**配置ファイル**:
- `SaveManager.ts`: `SaveData` の load/save、マイグレーション、localStorage 例外処理

**依存関係**:
- 依存可能: `types/`, `config/`
- 依存禁止: `scenes/`, `systems/`, `entities/`(最下位レイヤー)

#### src/config/ (定数・設定)

**役割**: チューニング値・ゲーム定数・Phaser 設定を集約(マジックナンバーの一元管理)。

**配置ファイル**(主要。バランス・演出・ステージ・ストーリー等のデータを集約する):
- `balance.ts`: プレイヤー/ショット/各系統ボスのパラメータ(`PLAYER`, `SHOT`, `BOSS`, `FLYING_BOSS`, `CONTAINMENT_WARDEN`, `PURIFIER`, `ENVOY`, `ECLIPSE_CORE` 等)
- `effects.ts`: 演出のチューニング値(爆発・シェイク・ヒットストップ・フェード・HUD・タッチ押下フィードバック)
- `audio.ts`: サウンド定義(`SE` 13種の合成仕様 + `BGM` 5トラック `title`/`stage`/`stageWarm`/`boss`/`ending` のノート列。Phaser/Web Audio 非依存のデータ)
- `gameConfig.ts`: `Phaser.Types.Core.GameConfig`(解像度/スケール/物理設定)
- `dimensions.ts` / `uiScale.ts`: ゲーム論理サイズ、高 DPI 対応の UI スケール係数
- `sceneKeys.ts` / `registryKeys.ts` / `assetKeys.ts` / `storageKeys.ts`: シーンキー / registry キー / アセットキー / localStorage キー(`lastspark:save`)の定数
- `controlBand.ts` / `touchLayout.ts`: 下部コントロール帯・仮想ボタンのレイアウト定数
- `characterRig.ts`: キャラ見た目リグの系統別構成データ
- `stages.ts`: `StageData` 型と全ステージ定義(`STAGES` / `getStageData` / `nextStageId`)
- `stageBackground.ts`: ステージ背景テーマ(`getStageBackground`、純データ+決定論ロジック)
- `storyEvents.ts`: ステージ進行とストーリーイベントの対応データ
- `story/`: ステージ別の確定テキスト(`stage1.ts`〜`stage6.ts`、`cutscenes.ts`、`index.ts` の `getStageStory`)

> 上記は主要ファイルの一覧。ステージ・ストーリーの追加で増えるため網羅は保証しない。新規の定数/データは本ディレクトリへ camelCase ファイルで追加する。

**命名規則**: 定数モジュールは camelCase ファイル名、エクスポートする定数は UPPER_SNAKE_CASE もしくは `as const` オブジェクト。

**依存関係**:
- 依存可能: `types/`
- 依存禁止: 他のすべて(最も低位)

#### src/ui/ (描画コンポーネント)

**役割**: HUD・仮想ボタンなど、見た目に関する再利用コンポーネント。

**配置ファイル**:
- `LifeBar.ts`, `BossHpBar.ts`, `ChargeGauge.ts`, `TouchControls.ts`, `MovePad.ts`(左手の追従パッド), `StoryOverlay.ts`(ストーリーテキストのキュー再生) 等

**依存関係**:
- 依存可能: `config/`, `types/`、および `systems/` 内の **Phaser 非依存の純粋関数モジュール**(camelCase ファイル: `hudFx.ts` 等。entities と同じく最下位ロジック扱い)
- 依存禁止: `systems/` の System クラス、`persistence/`(`UIScene` から状態を受け取って描画するのみ)

#### src/types/ (共通型定義)

**役割**: 複数レイヤーで共有する型・インターフェース(`SaveData`, `InputState`, `BossAction` 等)。

**命名規則**: PascalCase または kebab-case(例: `save.ts`, `input.ts`)。

**依存関係**: 他に依存しない(型のみ)。循環依存回避の共有点として使う。

### tests/ (テストディレクトリ)

#### unit/

**役割**: ユニットテストの配置。`src/` と同じ構造をミラーする。

```
tests/unit/
├── systems/
│   └── bossAi.test.ts
├── persistence/
│   └── SaveManager.test.ts
└── config/
    └── balance.test.ts
```

**命名規則**: `[テスト対象].test.ts`(例: `SaveManager.ts` → `SaveManager.test.ts`)。

#### integration/

**役割**: System + Entity を結合したテスト。

```
tests/integration/
├── combat/
│   └── damage-flow.test.ts
└── input/
    └── player-control.test.ts
```

#### e2e/

**役割**: Playwright によるユーザーシナリオ検証。

```
tests/e2e/
├── play-through/
│   └── title-to-clear.spec.ts
└── orientation/
    └── rotate-prompt.spec.ts
```

### docs/ (ドキュメントディレクトリ)

**配置ドキュメント**:
- `product-requirements.md`: プロダクト要求定義書
- `functional-design.md`: 機能設計書
- `architecture.md`: アーキテクチャ設計書
- `repository-structure.md`: リポジトリ構造定義書(本ドキュメント)
- `development-guidelines.md`: 開発ガイドライン
- `glossary.md`: 用語集
- `ideas/`: 壁打ち・アイデアの下書き

### public/ (静的配信)

**役割**: Vite がそのまま配信する静的ファイル。ゲームアセットと PWA リソースを配置。

- `assets/cutscenes/`: カットシーン背景の SVG。これ以外のスプライト/地形/HUD/BGM・SE は外部素材を持たず実行時に手続き生成する(`PreloadScene` がテクスチャ生成、`SoundManager` が Web Audio で音を合成)。Tiled タイルマップも使わず、ステージ地形は `config/stages.ts` の `StageData` から構築する。
- `icons/`: PWA アイコン各サイズ。
- マニフェスト/Service Worker は `vite-plugin-pwa` が生成・管理する。

## ファイル配置規則

### ソースファイル

| ファイル種別 | 配置先 | 命名規則 | 例 |
|------------|--------|---------|-----|
| シーン | src/scenes/ | PascalCase + Scene | `GameScene.ts` |
| エンティティ | src/entities/ | PascalCase | `Player.ts` |
| システム(クラス) | src/systems/ | PascalCase + System/Controller | `CombatSystem.ts` |
| システム(純粋関数) | src/systems/ | camelCase | `bossAi.ts` |
| 永続化 | src/persistence/ | PascalCase + Manager | `SaveManager.ts` |
| 定数/設定 | src/config/ | camelCase ファイル | `balance.ts` |
| UI部品 | src/ui/ | PascalCase | `ChargeGauge.ts` |
| 型定義 | src/types/ | kebab-case / PascalCase | `save.ts` |

### テストファイル

| テスト種別 | 配置先 | 命名規則 | 例 |
|-----------|--------|---------|-----|
| ユニットテスト | tests/unit/ | [対象].test.ts | `SaveManager.test.ts` |
| 統合テスト | tests/integration/ | [シナリオ].test.ts | `damage-flow.test.ts` |
| E2Eテスト | tests/e2e/ | [シナリオ].spec.ts | `title-to-clear.spec.ts` |

### 設定ファイル

| ファイル種別 | 配置先 | 命名規則 |
|------------|--------|---------|
| ゲーム定数 | src/config/ | camelCase.ts |
| ツール設定 | プロジェクトルート | [ツール名].config.ts |
| 型定義 | src/types/ | [対象].ts / [対象].d.ts |

## 命名規則

### ディレクトリ名
- レイヤー/集合ディレクトリは複数形 kebab-case(例: `scenes/`, `entities/`, `systems/`)。

### ファイル名
- クラスファイル: PascalCase + 役割接尾辞(例: `GameScene.ts`, `SaveManager.ts`)。
- 関数/定数モジュール: camelCase(例: `bossAi.ts`, `balance.ts`)。
- 型定義: kebab-case または PascalCase(例: `save.ts`)。

### テストファイル名
- ユニット/統合: `[対象].test.ts`。E2E: `[シナリオ].spec.ts`。

## 依存関係のルール

### レイヤー間の依存

```
scenes/ (Scene)
   ↓ (OK)
systems/ (System)
   ↓ (OK)
entities/ (Entity)
   ↓ (OK)
config/ , types/ (最下位・共有)

scenes/ → persistence/ (OK)
```

**禁止される依存**:
- entities/ → systems/ の **System クラス**(`*System`/`*Controller`)(❌)
  - ただし systems/ 内の **Phaser 非依存の純粋関数モジュール**(camelCase: `bossAi.ts`/`shot.ts`/`combatRules.ts`/`playerMovement.ts` 等)は最下位ロジック扱いで entities からの参照を許可する(✅)。
- entities/ → scenes/ (❌)
- systems/ → scenes/ (❌ / 通知はイベント・コールバックで)
- persistence/ → systems/ , scenes/ , entities/ (❌)

### 循環依存の回避
- レイヤー間で相互参照が必要になった場合は、共有の型/インターフェースを `src/types/` に抽出して解決する。
- System → Scene 方向の通知は、Scene 側が System のイベントを購読する形にして逆依存を避ける。

## スケーリング戦略

### 機能の追加
- **ステージ追加**: `config/stages.ts` の `STAGES` テーブルに `StageData` をコード定義で追加し、`SpawnSystem` が `stageId` で `getStageData` を引く。Tiled 等の外部マップは使わない。
- **新しい敵/ボス**: `src/entities/` にクラス追加。共通挙動が増えたら基底クラス/共通モジュールへ抽出。
- **武器交換(Post-MVP)**: `Projectile` の種別を拡張。種別が増えたら `src/entities/projectiles/` へサブディレクトリ化。

### ファイルサイズの管理
- 1ファイル 300行以下を推奨。300–500行で分割検討、500行以上は分割を強く推奨。
- 肥大化した `GameScene.ts` は、責務(物理セットアップ/カメラ/敵管理)を System 側へ切り出して薄く保つ。

## 特殊ディレクトリ

### .steering/ (ステアリングファイル)
作業単位の計画。`[YYYYMMDD]-[task-name]/` に `requirements.md` / `design.md` / `tasklist.md` を配置。git 管理外。

### .claude/ (Claude Code 設定)
`commands/`(スラッシュコマンド)、`skills/`(スキル)、`agents/`(サブエージェント定義)。

## 除外設定

### .gitignore
- `node_modules/`
- `dist/`(Vite ビルド成果物)
- `dev-dist/`(vite-plugin-pwa の開発生成物)
- `coverage/`
- `.env` および `.env.*`(`.env.example` は除外しない)
- `.steering/`
- `*.log`
- `.DS_Store`
- `test-results/` / `playwright-report/`(Playwright 出力)

### .prettierignore / .eslintignore
- `dist/`
- `dev-dist/`
- `node_modules/`
- `coverage/`
- `public/assets/`(生成・外部素材)
- `.steering/`
