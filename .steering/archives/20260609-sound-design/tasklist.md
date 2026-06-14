# タスクリスト: サウンド演出（BGM/SE）

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**（全て `[x]`、未完了 `[ ]` を残さない）。
スキップは技術的理由がある場合のみ、理由を明記して行う。

---

## フェーズ1: 純粋データ・ロジック層

- [x] `src/config/audio.ts` を作成（SE/BGM データ + 型）
  - [x] `SeKey`（13種）と `SeSpec` 型、`SE` カタログを定義
  - [x] `BgmKey`（title/stage/boss）と `BgmTrack`/`NoteToken` 型、`BGM` を定義
- [x] `src/systems/soundSynth.ts` を作成（純粋ヘルパ）
  - [x] `noteToFrequency` / `clamp01` / `effectiveVolume`
  - [x] `scheduleNotes` / `trackDurationSec`

## フェーズ2: 単体テスト

- [x] `tests/unit/systems/soundSynth.test.ts` を作成
  - [x] `noteToFrequency`（A4=440・オクターブ）検証
  - [x] `effectiveVolume`（muted=0・role別・クランプ）検証
  - [x] `scheduleNotes` / `trackDurationSec`（タイミング・休符）検証
- [x] `tests/unit/config/audio.test.ts` を作成
  - [x] SE 13キーの存在・値域検証
  - [x] BGM 3トラックの存在・loop非空・値域検証

## フェーズ3: Web Audio 再生ラッパ

- [x] `src/systems/SoundManager.ts` を作成
  - [x] `init()`（AudioContext 生成・gain 構築・設定反映・disabled 判定）
  - [x] 初回ジェスチャでの `resume()`（autoplay 対策）
  - [x] `playSe(key)`（Oscillator/ノイズ + エンベロープ）
  - [x] `playBgm(key)` / `stopBgm()`（ルックアヘッド・スケジューラ、多重再生防止）
  - [x] `applySettings()` と `getSound()` シングルトンアクセサ
  - [x] 全メソッドの disabled 時 no-op を保証（jsdom 安全）

## フェーズ4: シーン/エンティティ配線

- [x] `BootScene` で `getSound().init()` を呼ぶ
- [x] BGM 配線
  - [x] `TitleScene`: `playBgm('title')`
  - [x] `GameScene`: `playBgm('stage')`、`spawnBoss()` で `playBgm('boss')`
  - [x] `ClearScene`: `stopBgm()` + `playSe('stageClear')`
  - [x] `GameOverScene`: `stopBgm()` + `playSe('gameOver')`
- [x] SE 配線（プレイ操作）
  - [x] `Player`: jump / chargeStart / chargeReady / shootNormal / shootCharged
- [x] SE 配線（戦闘）
  - [x] `CombatSystem`: `onHit` に `target: 'enemy'|'boss'` を付与
  - [x] `GameScene`: onHit→enemyHit/bossHit、onEnemyDefeated、onPlayerDamaged、onBossDefeated→bossDefeated を配線
- [x] SE 配線（UI タップ）
  - [x] `TitleScene` スタート、`GameOverScene` RETRY/TITLE、`ClearScene` タイトル戻りで `uiTap`

## フェーズ5: 品質チェックと修正

- [x] `npm test`（103件パス）
- [x] `npm run lint`（eslint globals に Web Audio/timer を追加してクリーン）
- [x] `npm run typecheck`（エラーなし）
- [x] `npm run build`（成功・既存のチャンクサイズ警告のみ）

## フェーズ6: ドキュメント更新

- [x] 永続ドキュメント更新（`docs/repository-structure.md` に `systems/SoundManager.ts`・`systems/soundSynth.ts`・`config/audio.ts` を追記し、横断的出力サービスの依存例外を明記）
- [x] 実装後の振り返り（このファイル下部）

---

## 実装後の振り返り

### 実装完了日
2026-06-09

### 計画と実績の差分

**計画と異なった点**:
- `clamp01` の非有限値(NaN/Infinity)の扱いを「安全側=0(無音)」に統一。当初テストは Infinity→1 を想定していたが、音量値として不正値は無音に倒す方が堅牢なため実装仕様に合わせてテストを修正。
- ESLint が globals を明示列挙する方針だったため、`eslint.config.js` に Web Audio 型(`AudioContext`/`GainNode` 等)と `setInterval`/`clearInterval` を追加する必要があった（計画外だが既存パターンに沿った対応）。
- `repository-structure.md` の依存ルール「entities は状態を持つ System クラスに依存禁止」と、`Player`→`SoundManager` の依存が形式上衝突。SoundManager を「Entity 参照を持たない横断的出力サービス」と位置づけ、ドキュメントに例外を明記して整合させた。

**新たに必要になったタスク**:
- implementation-validator(ギュレル)の指摘対応: `scheduleAhead` への `bgmLoopDur<=0` ガード追加（無限ループ防御）、`handleClear` への `stopBgm()` 追加（GameOver と対称化・音被り解消）。いずれも Medium 指摘で低コスト修正。

**技術的理由でスキップしたタスク**:
- なし（全タスク完了）。

### 学んだこと

**技術的な学び**:
- Web Audio の BGM ループは「ルックアヘッド・スケジューラ(setInterval + ctx.currentTime 先読み)」で実装すると、シーン非依存で安定したループが組める。
- 純粋ロジック層(soundSynth/audio)と副作用層(SoundManager)を分離することで、jsdom(AudioContext 不在)でも `disabled` no-op により既存テストを一切壊さず導入できた。`shot.ts` の設計思想がそのまま音響にも有効だった。
- モバイル autoplay 制約は、初回ジェスチャ(pointerdown/keydown/touchstart)で `AudioContext.resume()` を一度だけ実行する形が定石。

**プロセス上の改善点**:
- `/plan-feature` で固めた requirements.md を尊重したことで、実装中に要求がブレず一気通貫で進められた。
- 既存土台(`GameSettings` の器・`public/assets/audio/` 予約)を先に把握したことで、設計の判断が速かった。

### 次回への改善提案
- 設定 UI(ミュート/音量スライダー)は今回スコープ外。`applySettings()` を呼ぶだけで接続できる状態なので、次回の機能候補として有力。
- BGM のフェードイン/アウトを入れるとシーン遷移の音の繋ぎがより滑らかになる（今回は即時停止/開始）。
- `SoundManager` 単体テストを書く場合に備え、シングルトンのリセット手段(テスト専用)を検討してもよい。
