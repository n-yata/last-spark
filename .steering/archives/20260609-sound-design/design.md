# 設計書: サウンド演出（BGM/SE）

## アーキテクチャ概要

既存のレイヤード構成（Scene / System / Entity / Persistence）に倣い、サウンドを
**「純粋な仕様生成（テスト可能）」**と**「Web Audio 再生（副作用・jsdom では no-op）」**に分離する。
`shot.ts`（純粋）と `Player`（副作用）の関係と同型。

```
config/audio.ts        … SE/BGM のデータ定義（波形・周波数・テンポ・音量）※Phaser/WebAudio 非依存
        │
systems/soundSynth.ts  … 純粋ヘルパ（音量計算・音名→周波数・ノートスケジュール）※coverage 対象・単体テスト
        │
systems/SoundManager.ts … AudioContext を保持する再生ラッパ（シングルトン）※coverage 除外
        │  getSound() でグローバル取得（CombatSystem 等の stateful system と同じ扱い）
        ▼
Scenes / Entities       … getSound().playSe(...) / playBgm(...) を呼ぶだけ（逆依存しない）
```

### 設計原則
- **完全オフライン維持**: 外部音源ファイル0。`AudioContext` の `OscillatorNode` / ノイズで合成。
- **jsdom 安全**: `AudioContext` が無い環境では `SoundManager` が `disabled` となり全メソッドが no-op。
  これにより既存テスト（jsdom）が壊れず、`Player`/`CombatSystem` が音を呼んでも安全。
- **疎結合**: Scene/Entity は `getSound()` 経由で発火するだけ。CombatSystem は既存のコールバック方式を踏襲。
- **設定尊重**: `SaveManager` の `GameSettings`（muted/bgmVolume/seVolume）を init 時に読み、音量へ反映（UI は作らない）。

## コンポーネント設計

### 1. `src/config/audio.ts`（純粋データ）
**責務**:
- 13 種の SE 仕様 `SE: Record<SeKey, SeSpec>` を定義。
- BGM トラック `BGM: Record<BgmKey, BgmTrack>`（title / stage / boss）を定義。
- 音色・音量・テンポ等のマジックナンバーを集約（`balance.ts` と同じ思想）。

**型**:
- `SeSpec { wave: OscillatorType | 'noise'; freqStart; freqEnd; durationMs; attackMs; releaseMs; volume }`
- `BgmTrack { wave; bpm; baseVolume; loop: NoteToken[] }`（`NoteToken = { semitone: number | null; beats: number }`、`null` は休符）

**SeKey（13）**: jump, chargeStart, chargeReady, shootNormal, shootCharged, enemyHit, bossHit, playerDamaged, enemyDefeated, bossDefeated, stageClear, gameOver, uiTap

### 2. `src/systems/soundSynth.ts`（純粋ヘルパ・単体テスト対象）
**責務**:
- `noteToFrequency(semitoneFromA4)`: `440 * 2^(n/12)`。
- `clamp01(v)`。
- `effectiveVolume(base, settings, role)`: `muted` なら 0、それ以外は `base * (role==='bgm'?bgmVolume:seVolume)` を 0–1 にクランプ。
- `scheduleNotes(track)`: `bpm` と `loop` から各ノートの `{ startSec, durSec, freq | null }` を算出（休符は freq=null）。
- `trackDurationSec(track)`: ループ全体の秒数。

**実装の要点**: Phaser / Web Audio に一切依存しない純粋関数のみ。

### 3. `src/systems/SoundManager.ts`（Web Audio 再生ラッパ・シングルトン）
**責務**:
- `init(save?)`: `AudioContext` を try/catch で生成。失敗/未対応なら `disabled=true`。
  master/bgm/se の `GainNode` を構築し、`GameSettings` を反映。`window` に一度だけ
  `pointerdown`/`keydown`/`touchstart` リスナを張り、初回ジェスチャで `resume()`（モバイル autoplay 対策）。
- `playSe(key)`: `SE[key]` から Oscillator（または BufferSource ノイズ）+ Gain エンベロープを生成し短時間再生。
- `playBgm(key)`: 現在の BGM を停止し、ルックアヘッド・スケジューラ（`setInterval` 25ms + `ctx.currentTime`）で
  `scheduleNotes` のノートを先読み予約。`trackDurationSec` 毎にループ基準時刻を進める。
- `stopBgm()`: スケジューラ停止 + 予約ノード停止。
- `applySettings(settings)`: gain を更新。
- **全メソッドは `disabled` 時に no-op**。

**実装の要点**:
- import 時に副作用を持たない（`AudioContext` 生成は `init()` 内のみ）。
- BGM の多重再生防止: `playBgm` は必ず現行を `stopBgm()` してから開始。同一キーなら何もしない。
- ノードは終了後に `onended` 等で破棄しリークを防ぐ。

### 4. グローバルアクセサ `getSound()`
- モジュールレベルのシングルトン（`SpawnSystem` 等が new される一方、サウンドは全シーン横断のため
  シングルトンが適切）。`getSound()` が遅延生成し、`init()` 前/disabled では no-op インスタンスとして振る舞う。

## データフロー

### SE 発火（例: ジャンプ）
```
1. InputController.update() → InputState
2. Player.applyInput(): shouldJump → getSound().playSe('jump')
3. SoundManager: disabled なら return / 有効なら Oscillator+Gain で短音再生
```

### BGM 切替（ボス出現）
```
1. GameScene.create() → getSound().playBgm('stage')
2. SpawnSystem のボストリガ → GameScene.spawnBoss() → getSound().playBgm('boss')
3. SoundManager: stopBgm() 後に boss トラックのスケジューラ開始
```

### 戦闘 SE（CombatSystem のコールバック経由・逆依存しない）
```
1. CombatSystem の overlap で被弾検出
2. onHit(x, y, 'enemy'|'boss') を Scene へ通知（既存方式を拡張）
3. GameScene: spawnHitEffect(x,y) + getSound().playSe(target==='boss'?'bossHit':'enemyHit')
```

## エラーハンドリング戦略
- `AudioContext` 生成失敗・未対応・`resume()` 失敗は握りつぶして `disabled` 継続（`SaveManager` の堅牢方針に倣い throw しない）。
- BGM スケジューラ内の例外は捕捉し、ゲーム進行を止めない。

## テスト戦略

### ユニットテスト（jsdom）
- `tests/unit/systems/soundSynth.test.ts`:
  - `noteToFrequency`: A4(0)=440、+12=880、-12=220。
  - `effectiveVolume`: muted=0 / bgm・se の role 反映 / 1 超クランプ / 負クランプ。
  - `scheduleNotes`: bpm からの開始秒・長さ、休符の freq=null、累積タイミング。
  - `trackDurationSec`: 総ビート×拍長。
- `tests/unit/config/audio.test.ts`:
  - SE が 13 キー全て存在し、`volume` が 0–1、`durationMs>0`。
  - BGM 3 トラックが存在し `loop` 非空・`bpm>0`・`baseVolume` 0–1。

### 統合/E2E
- 既存 E2E（title-to-clear 等）が音導入後も通る（音は副作用で進行を阻害しない）こと。
- jsdom には `AudioContext` が無いため再生自体は単体テストせず、`disabled` no-op で安全動作を担保。

## 依存ライブラリ
- 追加なし（Web Audio API はブラウザ標準）。

## ディレクトリ構造
```
src/
  config/audio.ts          # 追加: SE/BGM データ
  systems/soundSynth.ts    # 追加: 純粋ヘルパ
  systems/SoundManager.ts  # 追加: Web Audio 再生ラッパ + getSound()
  scenes/BootScene.ts      # 変更: getSound().init()
  scenes/TitleScene.ts     # 変更: playBgm('title') + uiTap
  scenes/GameScene.ts      # 変更: playBgm('stage')/('boss') + 戦闘SE配線
  scenes/ClearScene.ts     # 変更: stopBgm + stageClear + uiTap
  scenes/GameOverScene.ts  # 変更: stopBgm + gameOver + uiTap
  entities/Player.ts       # 変更: jump/charge/chargeReady/shot SE
  systems/CombatSystem.ts  # 変更: onHit に target 種別を付与
tests/
  unit/systems/soundSynth.test.ts  # 追加
  unit/config/audio.test.ts        # 追加
```

## 実装の順序
1. `config/audio.ts`（データ・型）
2. `systems/soundSynth.ts`（純粋ヘルパ）
3. 単体テスト（soundSynth / audio）
4. `systems/SoundManager.ts`（再生ラッパ + getSound）
5. `BootScene` で init
6. BGM 配線（Title / Game / boss / Clear / GameOver）
7. SE 配線（Player / CombatSystem+GameScene / UI タップ）
8. 品質チェック（test/lint/typecheck/build）

## セキュリティ考慮事項
- ハードコードされた URL/シークレットは無し（合成音のためエンドポイント不要）。
- 外部リソース読み込みを行わないため供給網リスク・CORS リスクなし。

## パフォーマンス考慮事項
- SE ノードは短命・再生後破棄。BGM はルックアヘッドで軽量予約（過剰なノード生成を避ける）。
- モバイル 60fps を阻害しないよう、毎フレーム生成ではなくイベント駆動で発火。

## 将来の拡張性
- 設定 UI（ミュート/音量スライダー）は `applySettings()` を呼ぶだけで接続可能（今回はスコープ外）。
- 外部音源へ差し替える場合も `SoundManager` 内部実装の置換で対応でき、呼び出し側（Scene/Entity）は不変。
