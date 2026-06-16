# 設計書

## アーキテクチャ概要

既存のサウンド合成アーキテクチャを踏襲する。質感は「データ定義(`config/audio.ts`)」、
再生は「`SoundManager`(Web Audio)」、計算可能なロジックは「`soundSynth.ts`(純粋関数)」に
分離されている。重厚化はこの3層を最小拡張で実現する。

```
config/audio.ts (データ: 型 + 5トラックのチューニング)
        │  BgmTrack / BgmDrone を拡張(harmonies?, drone.semitones?)
        ▼
soundSynth.ts (純粋ロジック: scheduleNotes, voicePeak[新], droneSemitones[新])
        │  Web Audio 非依存 → 単体テスト対象
        ▼
SoundManager.ts (Web Audio: startDrone / scheduleBgmNote を多声対応)
```

## コンポーネント設計

### 1. config/audio.ts(データ定義の拡張)

**責務**:
- BGMトラック・ドローンの型に「重厚化のための任意フィールド」を追加する
- 5トラックを北極星の方向性を保ったままチューニングする

**実装の要点**:
- `BgmDrone` に `semitones?: number[]` を追加。ルートに加えて重ねる低音パッドの声(semitone)。
  - 後方互換: 既存 `semitone`(必須)・`volume`(必須)は維持。`semitones` 未指定なら単声。
  - `startDrone` 側は `semitones ?? [semitone]` を声リストとして扱う。
- `BgmTrack` に `harmonies?: number[]` を追加。各メロディノートへ重ねる半音オフセット配列。
  - 例: `[7]`=完全5度上(パワー)、`[-12]`=オクターブ下(重み)、`[-12, 7]`=両方。
  - `detuneCents`(2声の揺らぎ)と独立・併用可能。
- 各トラックのチューニング方針(雰囲気維持):
  - `title`: 導入の浮遊感を保つ。重厚化は最小(必要なら薄いドローンのみ)。
  - `stage`: 静寂・不安を死守。**メロディのharmoniesは付けない**。ドローンのみ和音化
    (ルート -24 ＋ 完全5度 -17)で土台に厚みだけ足す。短3度(C5=+3)は維持。
  - `stageWarm`: 長3度(C#5=+4)とデチューンの温もりを維持。ドローン和音化(ルート＋長10度/5度)
    ＋控えめなオクターブ下ハーモニーで「温かい厚み」。
  - `boss`: 最大限の重厚化。ドローン和音化(ルート -24 ＋ 完全5度 -17)＋
    `harmonies: [-12, 7]`(オクターブ下＋完全5度=パワーコード)。無機質さは鋸波で担保。
  - `ending`: 弦の厚み。ドローン和音化＋`harmonies: [-12]`(オクターブ下)＋既存デチューン10。
- すべて `baseVolume` は据え置き気味にし、音圧は `voicePeak` 正規化で安全側に管理する。

### 2. soundSynth.ts(純粋ロジックの追加)

**責務**:
- 声の総数からクリップを避けるピーク音量を計算する
- ドローンの実効声リストを返す(semitones ?? [semitone])

**実装の要点**:
- `voicePeak(voiceCount: number, basePeak = 0.8): number` を追加。
  - 声数1で `basePeak`、声数増で単調減少、0–1にクランプ。
  - 合算音圧の増加を抑えるため平方根則を採用: `clamp01(basePeak / sqrt(max(1, voiceCount)))`。
  - 例: 1声→0.8, 2声→約0.566, 4声→0.4。非有限/0以下はクランプで安全化。
- `droneVoices(drone: BgmDrone): number[]` を追加。`drone.semitones ?? [drone.semitone]` を返す。
- いずれもWeb Audio非依存の純粋関数 → `soundSynth.test.ts` で単体テスト。

### 3. SoundManager.ts(Web Audio 再生の多声対応)

**責務**:
- ドローンを複数声(パッド)で鳴らす
- メロディノートをデチューン声 × ハーモニー声で重ねる
- 声数に応じてピークを正規化し、クリップを防ぐ

**実装の要点**:
- `startDrone`: `droneVoices(track.drone)` をループし、各semitoneでsine oscを生成。
  全声で共有の `gain`(フェードイン)にぶら下げる。声数で割った音量にして合算クリップを防ぐ。
- `scheduleBgmNote`: 鳴らす周波数の集合を「メロディ本体＋harmonies」×「detune 2声 or 単声」で構成。
  - ベース半音群: `[0, ...(track.harmonies ?? [])]`(0=本体)。各要素は `freq * 2^(semi/12)` 倍。
  - 各ベース半音にdetuneを適用(detune>0なら±detune/2の2声、else 1声)。
  - 総声数 = baseSemis.length × (detune>0 ? 2 : 1)。`peak = voicePeak(総声数)` を共有エンベロープに適用。
  - 既存の `bgmNodes` 管理・onended片付け・`pending`カウントの仕組みは踏襲(声数だけ増える)。
- マスターヘッドルーム(`masterGain=0.9`)とドローンgainは既存どおり。`voicePeak` でノート側の合算を抑える。

## データフロー

### BGM再生(playBgm → ループ)
```
1. playBgm(key): track取得 → scheduleNotes(track) → startDrone(track)
2. startDrone: droneVoices(track.drone) を各sine oscで鳴らす(多声パッド)
3. scheduler(25ms): scheduleAhead → 各ノートで scheduleBgmNote
4. scheduleBgmNote: baseSemis × detune声 を生成、voicePeak(声数)でピーク正規化
5. ループ末尾で bgmLoopBaseTime を進め、無限ループ再生
```

## エラーハンドリング戦略

- 既存方針を踏襲(AudioContext生成失敗・スケジューリング例外は握りつぶし、ゲーム進行を止めない)。
- `voicePeak`/`droneVoices` は非有限・空配列・0以下を安全側(クランプ/単声フォールバック)で処理。

## テスト戦略

### ユニットテスト
- `soundSynth.test.ts`:
  - `voicePeak`: 声数1で basePeak、声数増で単調減少、0–1クランプ、非有限/0以下の安全化。
  - `droneVoices`: `semitones` 指定時はその配列、未指定時は `[semitone]`。
- `audio.test.ts`:
  - 新フィールド `harmonies`(任意)は有限値の配列、`drone.semitones`(任意)は有限値の配列。
  - boss/ending に重厚化が入っていること(harmonies定義の存在)を検証。
  - 既存の方向性テスト(短3度/長3度/ドローン存在)は維持して回帰を防ぐ。

### 統合テスト(手動/実機)
- ブラウザで各シーンのBGMを再生し、無音化・歪み(クリップ)がないことを確認(Playwright補助)。

## 依存ライブラリ

新規追加なし。

## ディレクトリ構造

```
src/config/audio.ts            (変更: 型拡張 + トラックチューニング)
src/systems/soundSynth.ts      (変更: voicePeak / droneVoices 追加)
src/systems/SoundManager.ts    (変更: startDrone / scheduleBgmNote 多声対応)
tests/unit/config/audio.test.ts        (変更: 新フィールド・重厚化の検証追加)
tests/unit/systems/soundSynth.test.ts  (変更: voicePeak / droneVoices テスト追加)
```

## 実装の順序

1. `soundSynth.ts` に `voicePeak` / `droneVoices` を追加(純粋関数・テストファースト)
2. `config/audio.ts` の型拡張(`BgmDrone.semitones?`, `BgmTrack.harmonies?`)
3. `SoundManager.ts` の `startDrone` / `scheduleBgmNote` を多声対応
4. 各トラックのチューニング(boss → ending → stageWarm → stage → title の順)
5. テスト追加・更新、lint/typecheck/build、実機確認

## セキュリティ考慮事項

- 外部入力なし・ネットワークアクセスなし・シークレット無し。ハードコードURL/キーの追加なし。
- 乱数(ノイズ生成)は既存どおり演出用途のみ。新たな攻撃面は生じない。

## パフォーマンス考慮事項

- 声部増加で同時オシレータ数が増える。ノート長が短く都度生成・onended解放されるため上限は限定的。
- 最も声数が多いのは boss(baseSemis 3 × detuneなし=3声/ノート)。常時数声規模で過大ではない。
- ドローンは曲あたり最大3声程度の持続。CPU負荷は許容範囲。

## 将来の拡張性

- `harmonies` / `semitones` は配列なので、将来トラックごとに声部を自由に増減できる。
- `voicePeak` の正規化則(平方根)は1関数に集約。音圧バランスの再調整が一箇所で済む。
