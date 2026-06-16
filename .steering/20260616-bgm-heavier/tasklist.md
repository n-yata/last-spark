# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: 純粋ロジックの追加(soundSynth.ts)

- [x] `voicePeak(voiceCount, basePeak=0.8)` を追加
  - [x] 声数1で basePeak、声数増で単調減少(平方根則)、0–1クランプ
  - [x] 非有限値・0以下の声数を安全側に処理
- [x] `droneVoices(drone)` を追加(`semitones ?? [semitone]` を返す)

## フェーズ2: データ型の拡張(config/audio.ts)

- [x] `BgmDrone` に `semitones?: number[]` を追加(後方互換: 既存 semitone/volume 維持)
- [x] `BgmTrack` に `harmonies?: number[]` を追加(detuneCents と併用可)
- [x] JSDoc/コメントで各フィールドの意図を記述

## フェーズ3: 再生の多声対応(SoundManager.ts)

- [x] `startDrone` を `droneVoices` ベースの多声(パッド)再生へ変更(声数で音量を正規化)
- [x] `scheduleBgmNote` を baseSemis(本体＋harmonies)×detune声 で合成するよう変更
  - [x] 総声数から `voicePeak` でピーク正規化(クリップ防止)
  - [x] 既存の bgmNodes 管理・onended 片付け・pending カウントを声数増に追従

## フェーズ4: 各トラックのチューニング(雰囲気維持の重厚化)

- [x] `boss`: ドローン和音化(ルート＋完全5度)＋ `harmonies:[-12,7]`(最大限の圧・無機質)
- [x] `ending`: ドローン和音化(ルート＋5度＋オクターブ)＋ `harmonies:[-12]`＋既存デチューン(弦の厚み)
- [x] `stageWarm`: 長3度の温もり維持＋ドローン和音化＋控えめハーモニー(`harmonies:[-12]`)
- [x] `stage`: 静寂・不安を死守。ドローンのみ和音化(メロディharmoniesは付けない)
- [x] `title`: 導入の浮遊感を保ちつつ薄いドローンを追加(過剰化しない)

## フェーズ5: テスト追加・更新

- [x] `soundSynth.test.ts`: `voicePeak` / `droneVoices` の単体テスト追加
- [x] `audio.test.ts`: 新フィールド(harmonies/semitones)の妥当性 + boss/ending 重厚化の検証
- [x] 既存テスト(方向性・後方互換)が壊れていないことを確認

## フェーズ6: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`(521 passed / 46 files)
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`
- [x] 実機(ブラウザ/Playwright)で各シーンのBGMが鳴り、歪み・無音化がないことを確認
  - 本物の SoundManager を本物の AudioContext で再生し masterGain 出力を AnalyserNode で実測。
    全5トラックで AudioContext=running・consoleエラー0・peak<1.0(最大0.668@vol1.0でクリップなし)・
    無音化なし・ending=3声/他=2声のドローン和音化を確認(@playwright/test で headless 実測)。

## フェーズ7: レビューと仕上げ

- [x] クルトワ(security-engineer)によるコミット前セキュリティレビュー(ハードコード観点含む)
  - 結果: Critical/High なし・ハードコードなし・コミット停止理由なし(声部数は静的上限で DoS なし)
- [x] 実装後の振り返りを記録(別ファイル `retrospective.md` → モード3)

---

> **振り返りについて**: 実装後の振り返りはこのファイルではなく、同じディレクトリの
> `retrospective.md` に記録する。全タスクが `[x]` になったことを確認してから作成すること。
