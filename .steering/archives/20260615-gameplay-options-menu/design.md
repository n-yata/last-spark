# 設計書

統合オプションメニュー（タイトル/ポーズ双方から開ける音量・操作説明・ステージ移動）の実装設計。

---

## アーキテクチャ概要

### 採用方針

既存パターンの踏襲を最優先とし、新パターンの乱立を避ける。具体的には以下を北極星とする。

- **UI 構築**: `stageSelect.ts` の「ファクトリ関数 + `Container` オーバーレイ + 縦並びボタン + BACK」を一般化して共通化する（クラス化はしない）。
- **スケール**: 全ての絶対px・fontSize は `uiScale.ts` の `scaled()` / `scaledFontPx()` 経由（直接px禁止）。
- **音量反映/永続化**: 既存の `SoundManager.applySettings()`（即時反映）と `SaveManager.updateSettings()`（永続化）をそのまま使う。新たな永続化機構は作らない。
- **シーン遷移**: `sceneTransition.transitionTo()`（フェード + 多重遷移ガード）を使う。`scene.start` 直叩きはしない。
- **ポーズ**: 新規 `PauseScene` を `scene.launch` し、GameScene + UIScene を `pause` する。**物理ステップ中の `scene.pause()` 回避のため `time.delayedCall` 経由**で pause/resume する（救出演出・エンディング演出と同方式）。

### レイヤ構成

```
┌─────────────────────────────────────────────────────────────┐
│ 呼び出し元シーン                                              │
│   TitleScene ──(OPTIONS導線)──┐    UIScene ──(PAUSE導線)──┐  │
│                               │   GameScene ──(ESC/Pキー)─┤  │
└───────────────────────────────┼──────────────────────────┼──┘
                                 ▼                          ▼
                        ┌──────────────────┐      ┌──────────────────┐
                        │ optionsMenu.ts   │      │ PauseScene        │
                        │ (共通オーバーレイ │      │ (GameScene+UIを    │
                        │  ファクトリ)      │◀─────│  pauseして上に重ねる)│
                        └────────┬─────────┘      └──────────────────┘
                                 │ 各パネルを切替表示
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                         ▼
  ┌───────────┐          ┌───────────────┐         ┌──────────────┐
  │ volumePanel│          │ controlsPanel  │         │ stageNavPanel │
  │ (音量段階) │          │ (操作説明)     │         │ (タイトル/    │
  └─────┬─────┘          └───────┬───────┘         │  リトライ/選択)│
        ▼                        ▼                 └──────────────┘
  ┌───────────────┐      ┌──────────────────┐
  │ volumeSteps.ts │      │ controlsData.ts   │   ← Phaser非依存・純関数
  │ SoundManager   │      │ InputController    │     (ユニットテスト対象)
  │ SaveManager    │      │ のキーマップ由来   │
  └───────────────┘      └──────────────────┘
```

### ポーズ実現方式の決定（論点1）

| 案 | 内容 | 長所 | 短所 |
|----|------|------|------|
| **A. PauseScene を launch（採用）** | 新規シーンを `scene.launch` し、GameScene と UIScene を `pause`。オプションUIは PauseScene 上に構築 | ・入力が GameScene/UIScene と完全に分離（ポーズUIのタップが操作系に漏れない）<br>・GameScene の `update` が止まるので registry 更新も停止し HUD が固まる＝ポーズらしい挙動<br>・Phaser の標準的なポーズ手法で素直 | ・新規シーン追加（sceneKeys/registration）<br>・OrientationScene の pause と二重管理になる懸念 → フラグで識別（後述） |
| B. UIScene 上のオーバーレイ Container | GameScene を pause し、UIScene は止めずにオーバーレイを描く | シーン追加が不要 | ・UIScene の `update` が走り続け、HUD 描画とポーズUIが同居して責務が混濁<br>・ポーズUIのポインタ入力と TouchControls/MovePad の入力が同一シーンで競合（誤操作・取りこぼし）<br>・「再開」時の状態復元が煩雑 |

**推奨: A（PauseScene を launch）。** 入力分離と責務分離が決め手。B は TouchControls と同一シーンに UI を載せるため、タッチ端末でポーズボタンとプレイ操作が干渉する受け入れ条件（「タッチのみ端末でポーズ/再開ができる」「入力の取りこぼしが起きない」）を満たしにくい。

#### OrientationScene との二重管理の解消

`GameScene.setupOrientationHandling()` は縦持ち時に `scene.launch(orientation)` + `scene.pause()` を行う。一方ポーズも `scene.pause()` する。両者が無秩序に resume すると、縦持ちのままポーズ解除でゲームが動く／ポーズ中に横持ち復帰で勝手に resume する、といった不整合が起きる。

**解決策**: GameScene に `private paused = false;` フラグを持たせ、ポーズ要求/解除時に立てる。`setupOrientationHandling()` の check で「ポーズ中（`this.paused === true`）は OrientationScene による resume を抑止する」。すなわち resume してよいのは「横持ち かつ 非ポーズ」のときだけに限定する。判定を `shouldResumeGame(portrait: boolean, paused: boolean): boolean` という純関数へ切り出してユニットテスト可能にする。

```
shouldResumeGame(portrait, paused) = (!portrait && !paused)
```

---

## コンポーネント設計

### 1. `optionsMenu.ts`（共通オプションUI・ファクトリ関数）

**配置**: `src/ui/optionsMenu.ts`
（`stageSelect.ts` が `src/stageSelect/` に独立しているのに倣ってもよいが、タイトル/ポーズ双方から使う「UI 部品」の性格が強いため `src/ui/` 配下が自然。最終判断は実装時に既存 `src/ui/` の粒度を見て決める。）

**責務**:
- タイトル/ポーズ共通の「オプションオーバーレイ」を構築・破棄する。
- 「音量 / 操作説明 / ステージ移動」の各パネルを切り替え表示する（タブ的なルート画面 + 各パネル）。
- `uiTap` 効果音でフィードバックする。
- 暗幕（背景クリック吸収）・BACK・閉じる導線を持つ。

**公開シグネチャ案**:

```ts
export interface OptionsMenuConfig {
  scene: Phaser.Scene;
  /** ステージ移動パネルを出すか。タイトルでは false（= 音量・操作説明のみ）、ポーズでは true。 */
  enableStageNav: boolean;
  /** ステージ移動の各アクション。enableStageNav=true のときのみ参照。 */
  stageNav?: {
    currentStageId: string;
    onRetry: () => void;
    onReturnTitle: () => void;
    onSelectStage: (stageId: string) => void;
  };
  /** メニューを閉じたとき（BACK/CLOSE）に呼ばれる。タイトル=オーバーレイ破棄のみ、ポーズ=再開。 */
  onClose: () => void;
}

export interface OptionsMenu {
  /** ルート Container（呼び出し側が depth/破棄を管理したい場合に参照）。 */
  readonly container: Phaser.GameObjects.Container;
  isOpen(): boolean;
  destroy(): void;
}

export function createOptionsMenu(config: OptionsMenuConfig): OptionsMenu;
```

**実装の要点**:
- `stageSelect.ts` の `makeMenuButton`（hover/down 色変更 + `setInteractive`）をこの共通基盤へ移し、`stageSelect.ts` からも再利用できるよう汎用化する（重複定義を作らない）。共通ボタンファクトリは `src/ui/menuButton.ts` として切り出す案を推奨。
- 暗幕は `scene.add.rectangle(...).setInteractive()` で背後への透過を防ぐ（`stageSelect.ts` と同じ）。`setDepth(1000)` 以上に置く。
- パネル切替は「ルートに戻る → 別パネルを開く」の単純なスタックで実装（同時に1パネルのみ表示）。over-engineering を避け、状態は `currentPanel` 変数程度に留める。
- タイトルから使う場合の `enableStageNav: false` で、既存 `stageSelect.ts`（タイトル専用のステージ選択導線）とは併存。タイトルのステージ選択は現状維持し、本メニューのステージ移動はポーズ専用とする（タイトルで二重導線にしない）。

**設計判断（論点2）**: クラスではなくファクトリ関数。理由は (1) 既存 `stageSelect.ts` がファクトリ関数で統一されている、(2) 状態がクロージャに収まる程度で継承の必要がない、(3) Phaser の `Container` を返すだけで十分。

---

### 2. `volumePanel`（音量設定パネル）

**配置**: `optionsMenu.ts` 内のパネル生成関数、または `src/ui/volumePanel.ts`。純粋ロジックは別ファイル（下記 `volumeSteps.ts`）へ分離する。

**責務**:
- BGM 音量・SE 音量を段階調整するUIを描く。
- ミュート ON/OFF トグルを描く。
- 操作のたびに `SoundManager.applySettings()`（即時反映）と `SaveManager.updateSettings()`（永続化）を呼ぶ。
- SE 変更時はテスト音として `getSound().playSe('uiTap')` を鳴らし、音量変化を耳で確認できるようにする。

**音量UIの操作系（論点3）**:

| 案 | 評価 |
|----|------|
| ドラッグスライダー自作 | Phaser に標準スライダーがなく、ドラッグ + 高DPI + タッチ対応を自前実装するのは工数大・テスト困難。requirements は「スライダー**または**段階調整」を許容。 |
| **段階ボタン（`◂` / `▸` + 5段階インジケータ）（採用）** | 実装が `makeMenuButton` の流用で済み、タッチ/マウス/キーボード全対応が容易。値が離散なのでテストしやすい。requirements のスコープ外（数値直接入力なし）とも整合。 |

**推奨: 段階ボタン方式。** 各チャンネルを `0.0–1.0` の 5段階（0, 0.25, 0.5, 0.75, 1.0）で表現し、`◂` / `▸` で増減、現在値を `■■■□□` 風のインジケータ + 「BGM 50%」のラベルで表示する。

**純関数への切り出し（論点7）**: `src/ui/volumeSteps.ts`（Phaser非依存）。

```ts
/** 音量段階数（0..STEPS）。 */
export const VOLUME_STEPS = 4; // 0,1,2,3,4 → 0%,25%,50%,75%,100%

/** 0.0–1.0 の連続値を最も近い段階インデックスへ量子化する。 */
export function volumeToStep(volume: number): number;

/** 段階インデックスを 0.0–1.0 の音量値へ変換する。 */
export function stepToVolume(step: number): number;

/** 現在ステップに delta(+1/-1) を加え [0, VOLUME_STEPS] にクランプして返す。 */
export function adjustStep(step: number, delta: number): number;

/** インジケータ文字列（例: "■■■□□"）を生成する。 */
export function volumeBar(step: number): string;

/** 表示用パーセント（例: 50）を返す。 */
export function volumePercent(step: number): number;
```

これにより「境界値（0%・100%でこれ以上増減しない）」「量子化の丸め」をユニットテストで検証できる。

**実装の要点**:
- `applySettings` は `GameSettings` 全体を要求するため、現在の設定を `new SaveManager().getData().settings` で読み、変更分をマージして両者へ渡す。
- ミュート ON のときは段階ボタンを無効風（淡色）にしても良いが、必須ではない。ミュート解除で元の音量に戻る（`muted` フラグのみ切替、`bgmVolume`/`seVolume` は保持）。`effectiveVolume` がミュートを尊重するため、値は保持して問題ない。
- `localStorage` 不可でも `SaveManager.save()` が throw しない設計なので、永続化失敗時もクラッシュしない（受け入れ条件を既存実装が担保）。

---

### 3. `controlsPanel`（操作説明パネル）

**責務**:
- キーボード操作（移動=矢印 / ジャンプ=SPACE / ショット=J / 梯子=上下）とタッチ操作（左半分=移動パッド、右=ジャンプ/ショット）を一覧表示する。

**純関数への切り出し（論点7）**: `src/ui/controlsData.ts`（Phaser非依存）。

```ts
export interface ControlEntry {
  action: string;   // "移動" など
  keyboard: string; // "← →"
  touch: string;    // "画面左半分をなぞる"
}

/** 操作説明の表示データを返す。InputController のキーマップと一致させる単一の真実源。 */
export function getControlEntries(): ControlEntry[];
```

**実装の要点**:
- キーマップは `InputController`（LEFT/RIGHT/UP/DOWN/SPACE/J）と一致させる。受け入れ条件「表示内容が実際の `InputController` のキーマップと一致」を満たすため、可能なら `InputController` 側のキー定義を `controlsData.ts` が参照できる定数として共有する（理想）。難しければ、両者がずれないよう `controlsData.ts` のテストで InputController の定義と突き合わせる。
- タッチ操作の文言は `touchLayout.ts` の配置（左半分=移動ゾーン、右にジャンプ/ショット）に合わせる。

---

### 4. `stageNavPanel`（ステージ移動パネル・ポーズ専用）

**責務**:
- 「リトライ（現ステージを最初から）」「タイトルへ戻る」「ステージ選択」の導線を出す。
- 破壊的遷移（リトライ/タイトル）に確認ステップを設ける（論点5）。

**破壊的遷移のガード（論点5）**:

| 案 | 評価 |
|----|------|
| 二段タップ（1回目で「もう一度押すと実行」に文言変化、数秒で復帰） | 実装簡単だが誤認しやすい |
| **確認サブパネル（「タイトルへ戻りますか？ [はい] [いいえ]」）（採用）** | 意図が明確。`makeMenuButton` の流用で済む。`stageSelect.ts` のオーバーレイ流儀と一貫 |

**推奨: 確認サブパネル方式。** リトライ/タイトルは押下で確認サブパネルを表示し、「はい」で初めて実行する。ステージ選択は破壊的ではない（選んでから遷移）が、現ステージを離れる点では同等なので、選択直後の遷移自体が確認の役割を果たすと見なし追加確認は不要とする。

**ステージ選択の流用**: `stageSelect.ts` の `createStageSelect` は `startZone`（タイトル固有）に依存している。ポーズから再利用するには、ステージ選択の「縦並びボタン + BACK」のコア部分を `optionsMenu` の共通ボタン基盤で再構築するか、`createStageSelect` を `startZone` 非依存に一般化する。**推奨**: まず `PLAYABLE_STAGES` と `menuButton.ts` を使って stageNavPanel 内に簡潔なステージ選択リストを構築する（`createStageSelect` の改修は影響範囲が広いため最小限に留める）。クリア済み判定が要るなら `SaveManager.isStageCleared()` を利用。

**実装の要点（遷移の中身）**:
- リトライ: `PauseScene` 側で実行。`GameScene` を `resume` してから即 `transitionTo(gameScene, SCENE_KEYS.game, { stageId: currentStageId, skipCutscene: true })` 相当を行う。ただしポーズ中は GameScene が止まっているため、遷移は **GameScene のメソッドに委譲**するのが安全（後述の GameScene フック）。`skipCutscene: true` でリトライ時の導入演出を飛ばす（既存 GameOver からのやり直しと同じ挙動）。
- タイトルへ戻る: 同様に GameScene 経由で `transitionTo(gameScene, SCENE_KEYS.title)`。BGM はタイトル側 `create` で `playBgm('title')` するため自動的に切り替わる。GameScene/UIScene/PauseScene の停止を忘れない。

---

### 5. `PauseScene`（ポーズ制御シーン）

**配置**: `src/scenes/PauseScene.ts`

**責務**:
- GameScene + UIScene を pause した状態で、その上にオプションメニュー（`enableStageNav: true`）を表示する。
- 「再開」で GameScene + UIScene を resume し、自身を stop する。
- ステージ移動アクション（リトライ/タイトル/選択）を GameScene のフックへ委譲する。

**起動データ**:

```ts
interface PauseSceneData {
  stageId: string; // 現在のステージ（リトライ/選択の起点）
}
```

**実装の要点（論点1の核心）**:
- PauseScene は GameScene/UIScene の**上に重ねて active のまま**起動する（自身は pause しない）。pause するのは GameScene と UIScene。
- **pause/resume は GameScene 側のメソッド経由で行い、`time.delayedCall` を挟む**。PauseScene から直接 `scene.pause(GAME)` を呼ぶのではなく、GameScene に `requestPause()` / `requestResume()` を持たせ、その中で `this.time.delayedCall(0, () => { ... this.scene.pause(); ... })` のようにステップ境界へ逃がす（既存の救出/エンディング演出と同方式）。これにより物理ステップ中 pause のフリーズを回避する。
- 再開時は GameScene の `paused` フラグを false に戻し、UIScene も resume する。
- PauseScene 自身の create でフェードは不要（ゲーム画面の上に即座にオーバーレイ）。`uiTap` でフィードバック。

---

### 6. ポーズ導線（HUD 上のポーズボタン）（論点4）

**配置**: `UIScene` 上に新規 `PauseButton`（`src/ui/PauseButton.ts`、既存 `src/ui/*` の HUD 部品に倣う）。

**責務**:
- 画面上のタッチ可能なポーズボタンを描画し、押下で PauseScene 起動を要求する。

**配置位置（タッチ操作ゾーンとの非干渉）**:
- `touchLayout.ts` では「左半分=移動ゾーン」「右下にジャンプ/ショット」。干渉を避けるため、ポーズボタンは**画面右上の隅**（`x = width - scaled(28)`, `y = scaled(28)` 付近）に小さく配置する。右上はジャンプ/ショット（右下〜中央）とも移動ゾーン（左半分）とも重ならない。
- ボタン半径/オフセットは `scaled()` 経由。押下で `getSound().playSe('uiTap')`。

**起動の仕方**:
- UIScene は GameScene を直接参照しない方針（registry 疎結合）。ポーズ要求も registry 経由が一貫する。`HUD.pauseRequested` キーを追加し、ポーズボタン押下で `registry.set(HUD.pauseRequested, true)`。GameScene の `update` 冒頭でこれを検出して `requestPause()` を呼び、フラグをクリアする。
  - 代替案: UIScene から `this.scene.get(SCENE_KEYS.game)` を取得してメソッド呼び出しも可能だが、既存の疎結合方針（registry 経由）に倣う方を推奨。
- キーボード導線: GameScene 側で ESC / P キーを `addKey` し、押下で `requestPause()`。ポーズ中はキー入力が PauseScene にあるため二重発火しない（GameScene は pause 中で update が止まる）。

---

## データフロー

### ユースケース A: ゲーム中にポーズ→音量変更→再開

```
1. プレイヤーが HUD のポーズボタンをタップ（または ESC/P）
2. UIScene: registry.set(HUD.pauseRequested, true) / GameScene: ESC検出
3. GameScene.update(): pauseRequested を検出 → requestPause()
4. requestPause(): this.paused=true; time.delayedCall(0) で
     scene.pause(UI) → scene.launch(PAUSE, {stageId}) → scene.pause(self)
5. PauseScene.create(): GameScene/UIScene の上に optionsMenu(enableStageNav:true) を表示
6. プレイヤーが「音量」パネル → BGM ▸ を押下
7. volumePanel: volumeToStep→adjustStep→stepToVolume で新音量算出
8. SaveManager.updateSettings({bgmVolume}) で永続化
9. SoundManager.applySettings(getData().settings) で即時反映（鳴っているBGMが変化）
10. プレイヤーが「再開」を押下 → onClose()
11. PauseScene: GameScene.requestResume() を呼び、自身を scene.stop()
12. requestResume(): this.paused=false; scene.resume(UI); scene.resume(self) を delayedCall 経由で
13. ゲーム再開（HUD・物理が動き出す）
```

### ユースケース B: ポーズ→タイトルへ戻る（破壊的遷移ガード）

```
1〜5. （Aと同じ。ポーズ中）
6. プレイヤーが「ステージ移動」→「タイトルへ戻る」を押下
7. stageNavPanel: 確認サブパネル「タイトルへ戻りますか？ [はい][いいえ]」を表示
8. 「はい」押下 → config.stageNav.onReturnTitle() 実行
9. onReturnTitle は PauseScene が GameScene.returnToTitle() へ委譲
10. GameScene.returnToTitle(): scene.stop(PAUSE); scene.stop(UI);
      inputController.destroy(); transitionTo(self, SCENE_KEYS.title)
11. TitleScene.create(): fadeIn + playBgm('title')（BGM 自動切替）
```

### ユースケース C: タイトルから音量・操作説明を見る

```
1. TitleScene に「OPTIONS」導線を追加（STAGE SELECT の隣 or 上）
2. 押下 → createOptionsMenu({enableStageNav:false, onClose: destroyOverlay})
3. 音量/操作説明パネルのみ表示（ステージ移動なし）
4. BACK で onClose → オーバーレイ破棄、タイトルへ戻る
```

---

## エラーハンドリング戦略

新規のカスタムエラークラスは不要。既存方針（プレイ継続最優先で throw しない）を踏襲する。

- **localStorage 不可**: `SaveManager.save()` が内部で握りつぶす（`console.warn` のみ）。音量変更UIはクラッシュせず、`SoundManager.applySettings()` による即時反映だけが効く（永続化されないが動作継続）。受け入れ条件「localStorage 不可でもクラッシュしない」を既存実装で担保。
- **AudioContext 無効（disabled）**: `SoundManager` の各メソッドが no-op。音量UIは操作可能だが音は出ない（jsdom 等のテスト環境でも安全）。
- **多重ポーズ/多重遷移**: `this.paused` フラグで多重ポーズを防ぐ（`requestPause()` 冒頭で `if (this.paused) return`）。遷移は `transitionTo` の `FADING_KEY` ガードで多重発火を防ぐ。
- **ポーズ中の OrientationScene 競合**: `shouldResumeGame(portrait, paused)` で resume を「横持ち かつ 非ポーズ」に限定。

---

## テスト戦略

### ユニットテスト（Phaser 非依存・純関数）

- `volumeSteps.ts`:
  - `volumeToStep`: 0.0→0, 1.0→4, 0.5→2, 中間値の量子化（0.3→1, 0.4→2 等の丸め境界）。
  - `stepToVolume`: 各段階の往復一致（`stepToVolume(volumeToStep(v))` の安定性）。
  - `adjustStep`: 上限（4で +1 しても 4）・下限（0で -1 しても 0）のクランプ。
  - `volumeBar` / `volumePercent`: 表示文字列・%の正しさ。
- `controlsData.ts`:
  - `getControlEntries()` が移動/ジャンプ/ショット/梯子を含み、キーボード表記が InputController のキー（矢印/SPACE/J）と一致する。
- `shouldResumeGame(portrait, paused)`:
  - `(false,false)=true` / `(true,false)=false` / `(false,true)=false` / `(true,true)=false`。

### 統合テスト（Playwright・任意/手動含む）

メモリの既知の罠（`phaser-playwright-orientation-pause`）に注意。headless が縦持ち判定で OrientationScene を起動→pause し物理が凍結する。検証時は明示 resume / status・time 進行の確認を行う。

- ポーズ→再開でプレイヤー/敵/弾が止まり、再開で続く（status・座標の変化で確認）。
- ポーズ→再開を繰り返してフリーズ・二重起動が起きない。
- 音量変更後リロードで値が保持（localStorage）。
- タッチのみでポーズボタンが押せる（タッチイベントで PauseScene 起動）。

---

## 依存ライブラリ

新規追加なし。Phaser 3 既存機能（Scene の pause/launch/resume、Container、Text の interactive）のみで実装する。

---

## ディレクトリ構造

```
src/
├─ config/
│  ├─ sceneKeys.ts          # [変更] pause: 'PauseScene' を追加
│  └─ registryKeys.ts       # [変更] HUD.pauseRequested を追加
├─ scenes/
│  ├─ PauseScene.ts         # [新規] ポーズ制御シーン
│  ├─ GameScene.ts          # [変更] requestPause/requestResume/returnToTitle/retry フック、
│  │                        #         paused フラグ、ESC/Pキー、update でのポーズ要求検出、
│  │                        #         setupOrientationHandling に shouldResumeGame を適用
│  ├─ UIScene.ts            # [変更] PauseButton の生成・描画追加
│  └─ TitleScene.ts         # [変更] OPTIONS 導線 + createOptionsMenu(enableStageNav:false)
├─ ui/
│  ├─ optionsMenu.ts        # [新規] 共通オプションオーバーレイ（ファクトリ関数）
│  ├─ menuButton.ts         # [新規] 共通メニューボタンファクトリ（stageSelect から移設・共有）
│  ├─ volumePanel.ts        # [新規] 音量パネル（任意分割。optionsMenu 内関数でも可）
│  ├─ controlsPanel.ts      # [新規] 操作説明パネル（任意分割）
│  ├─ volumeSteps.ts        # [新規] 音量段階の純ロジック（Phaser非依存・テスト対象）
│  ├─ controlsData.ts       # [新規] 操作説明データの純ロジック（Phaser非依存・テスト対象）
│  ├─ PauseButton.ts        # [新規] HUD のポーズボタン
│  └─ orientationGuard.ts   # [新規/任意] shouldResumeGame の純関数置き場（既存 systems でも可）
├─ stageSelect/
│  └─ stageSelect.ts        # [変更/任意] menuButton.ts を使うよう共通化（重複解消。最小限）
└─ systems/
   ├─ SoundManager.ts       # [変更なし] applySettings をそのまま利用
   └─ ...

tests/ (既存テスト配置に倣う)
├─ volumeSteps.test.ts      # [新規]
├─ controlsData.test.ts     # [新規]
└─ orientationGuard.test.ts # [新規]（shouldResumeGame）
```

注: `volumePanel.ts` / `controlsPanel.ts` は `optionsMenu.ts` 内のローカル関数に留める選択肢もある。ファイル分割の最終粒度は実装時に既存 `src/ui/` の粒度を見て決める（過剰分割を避ける）。

---

## 実装の順序

段階的に、各ステップ単独で lint/typecheck/test/build が通る粒度で進める。

1. **純ロジック層（Phaser非依存）を先に実装 + テスト（Red→Green）**
   - `volumeSteps.ts` + `volumeSteps.test.ts`
   - `controlsData.ts` + `controlsData.test.ts`
   - `orientationGuard.ts`（`shouldResumeGame`）+ テスト
2. **共通UI基盤**
   - `menuButton.ts`（`stageSelect.ts` の makeMenuButton を移設・共有）
   - `optionsMenu.ts`（パネル切替の骨格 + 暗幕 + BACK）
3. **各パネル**
   - `volumePanel`（SoundManager/SaveManager 連携・即時反映）
   - `controlsPanel`（controlsData 表示）
   - `stageNavPanel`（確認サブパネル付き。遷移は後続のフックに接続）
4. **タイトル統合**
   - `TitleScene` に OPTIONS 導線 + `createOptionsMenu(enableStageNav:false)`（ステージ移動なし）
   - ここでタイトル経路の音量・操作説明が一通り動く（中間マイルストン）
5. **ポーズ基盤**
   - `sceneKeys.ts` / `registryKeys.ts` に追加
   - `GameScene` に `paused` フラグ・`requestPause/requestResume` フック（delayedCall 経由）・ESC/Pキー・update でのポーズ要求検出・`shouldResumeGame` 適用
   - `PauseScene` 実装（GameScene/UIScene を pause して optionsMenu を重ねる）
   - main のシーン登録（registration）に PauseScene を追加
6. **ポーズ導線**
   - `PauseButton`（UIScene 右上）+ `HUD.pauseRequested` 連携
7. **ステージ移動の遷移実装**
   - `GameScene.retry()` / `returnToTitle()` を実装し、stageNavPanel のアクションへ接続
8. **総合動作確認**
   - ポーズ→再開の反復、音量永続化、タッチのみ操作、OrientationScene との競合、破壊的遷移ガードを検証
   - 既存 CI 相当（lint/typecheck/unit/build）を全て通す（メモリ: マージ前にCI相当の全チェック）

---

## セキュリティ考慮事項

- **ハードコーディング**: URL/シークレット/AWS 情報は一切扱わない機能（完全クライアント・localStorage のみ）。新規のエンドポイントやキーは発生しない。
- **localStorage の値検証**: 設定値は既存 `SaveManager.isValidSettings()`（型・値域 0–1 チェック）が読込時に検証済み。本メニューが書き込む値も `volumeSteps` が 0–1 を保証するため、改ざん耐性は既存実装の範囲で担保される。
- **入力の信頼境界**: ポーズUIのポインタ/キー入力はクライアント内で完結し、外部送信なし。XSS 等の懸念は文字列を Phaser Text として描画する限り発生しない（HTML 注入経路なし）。

---

## パフォーマンス考慮事項

- **ポーズ中の負荷**: GameScene/UIScene を pause するため、ポーズ中はゲームの update/物理が止まり負荷はむしろ下がる。PauseScene の描画は静的UIで軽量。
- **オーバーレイの生成/破棄**: メニュー開閉のたびに Container を生成・`destroy()` する（`stageSelect.ts` と同じ）。頻度が低く、GC 負荷は無視できる。表示中のみ存在しリークしない。
- **高DPI**: `scaled()` 経由のため DPR2 でもレイアウト不変。フィルレートは静的UIで問題にならない。
- **動的 import の要否**: `stageSelect.ts` はタイトル初期表示を軽くするため動的 import している。オプションメニューも初期表示に不要なため、タイトル側は動的 import を踏襲してよい。ポーズ側は GameScene 稼働後なので静的 import で可（プレイ中の遅延ロードはカクつきの原因になり得るため、ポーズ用 UI は事前にバンドルしておく方が無難）。

---

## 将来の拡張性

- **キーコンフィグ/言語/難易度（現スコープ外）**: `optionsMenu` のパネル切替構造に新パネルを追加するだけで拡張できる。`enableStageNav` のような boolean フラグを増やすのではなく、将来的にはパネル定義の配列を渡す形へ一般化する余地がある（現段階では過剰なので採らない）。
- **ドラッグスライダー化**: 音量を段階ボタンからスライダーへ差し替える場合も、`volumeSteps.ts` の純ロジックは段階表示の責務だけなので、連続値版のロジックへ置換しやすい。UI 層のみの変更で済む。
- **ステージ選択の完全共通化**: 本設計では `stageSelect.ts` を最小限の変更（menuButton 共有）に留めるが、将来 `createStageSelect` を `startZone` 非依存に一般化すれば、タイトルとポーズで完全に同一の選択UIを共有できる。
