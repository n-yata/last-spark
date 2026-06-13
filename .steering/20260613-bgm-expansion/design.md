# 設計書

## アーキテクチャ概要

既存の音声アーキテクチャ（`SoundManager` ＋ `config/audio.ts` の合成仕様 ＋ `systems/soundSynth.ts` の純粋合成ロジック）を踏襲する。新しい BGM トラックを合成仕様として追加し、シーンに応じた切替を `SoundManager.playBgm` の拡張で実現する。外部音源は導入しない。

## コンポーネント設計

### 1. BGM 合成仕様の追加（`config/audio.ts`）
**責務**: 探索／ボス／温もり／エンディングの各 BGM の合成パラメータを定義
**実装の要点**:
- 現行 `BgmKey`（title/stage/boss）に `stageWarm`（温もり）・`ending` を追加
- 探索（stage）はアンビエント・ドローン寄りに調整
- 温もり（stageWarm）は stage をベースに倍音・音色をわずかに変える
- ending は弦・ピアノ系の音色合成

### 2. soundSynth の拡張（`systems/soundSynth.ts`）
**責務**: 新トラックの波形・エンベロープ生成の純粋ロジック
**実装の要点**:
- 既存の合成関数を再利用しつつ、ドローン／温音色／弦ピアノ系の生成を追加
- 純粋関数としてテスト可能に保つ

### 3. SoundManager の切替拡張（`systems/SoundManager`）
**責務**: シーン・進行に応じた BGM 切替
**実装の要点**:
- `BgmKey` 拡張に追従
- 探索 BGM は「TERRA同行後（stage3以降のクリア状況）」で `stageWarm` に切り替える判定
- エンディングシーンで `ending` を再生
- `applySettings`（mute/volume）が新トラックにも効く

### 4. シーン側の呼び出し
**責務**: 各シーンで適切な BGM を再生
**実装の要点**:
- GameScene: 通常は `stage`、TERRA同行後は `stageWarm`、ボス戦で `boss`
- エンディング（ブロック5）: `ending`
- TERRA同行判定は SaveManager の clearedStages（stage3 クリア済み）を参照

## データフロー
```
シーン開始/状態変化
→ SoundManager.playBgm(key)
→ soundSynth が波形生成（合成）
→ Web Audio で再生（GameSettings の mute/volume 反映）
```

## テスト戦略
- soundSynth: 新トラックの合成関数が妥当な出力を返す（純粋ロジック）
- BGM 選択ロジック: 進行状況（clearedStages）→ 正しい BgmKey
- applySettings が全トラックに反映される

## ディレクトリ構造
```
src/
├── config/audio.ts            # 変更: stageWarm / ending 合成仕様
├── systems/soundSynth.ts      # 変更: ドローン/温音色/弦ピアノ系生成
└── systems/SoundManager(該当)  # 変更: 切替・キー拡張
```

## 実装の順序
1. audio.ts に新トラックの合成仕様を追加
2. soundSynth に生成ロジック＋テスト
3. SoundManager の BgmKey 拡張・切替判定
4. シーン側の呼び出し（探索/温もり/ボス/エンディング）
5. 設定反映の確認
6. テスト・lint・typecheck・build

## セキュリティ考慮事項
- 外部通信・外部ファイルなし。合成のみ

## パフォーマンス考慮事項
- 合成は再生開始時のみ。ループ再生はバッファ再利用で負荷を抑える

## 将来の拡張性
- ステージ個別 BGM が必要になっても BgmKey 追加で対応可能
