# 実装後の振り返り

## 作業概要
操作の手触り微調整。(1) コヨーテタイム(足場を離れて100ms以内のジャンプ入力を受理)、(2) ジャンプ先行入力バッファ(空中入力を120ms保持し着地の瞬間に自動発動)、(3) 触覚フィードバック(被弾・ボス撃破時の `navigator.vibrate`、オプションでON/OFF、セーブ v6→v7)を追加した。

## 実装完了日
2026-07-02

## 計画と実績の差分

**計画と異なった点**:
- 梯子離脱ジャンプの入力が先行入力バッファに二重記録される経路を実装中に発見し、`!wasOnLadder` ガードを追加した(離脱ジャンプ直後すぐ着地すると意図しない自動ジャンプが出るケース)。設計時にはコヨーテ・バッファのリセットだけを想定していたが、「同一フレームで消費済みの入力を別機構が再利用しない」という観点が必要だった。
- `GameSettings` へのフィールド追加で、設計に挙げた SaveManager/optionsMenu 以外に `SoundManager` 内の既定値リテラルと `soundSynth.test.ts` のファクトリにも `vibration` の補完が必要だった(typecheck で検出)。**これは buster-mode 追加時(20260621)の振り返りに全く同じ学びが記録されており、既知の落とし穴だった**。今回は typecheck 前に grep(`busterMode: false`)で全リテラルを洗い出して先回りできた。

**新たに必要になったタスク**:
- 上記2点(バッファ二重記録ガード、GameSettings リテラル2箇所の補完)。いずれもタスクリストに追記して消化した。

## 学んだこと

**技術的な学び**:
- **タイムスタンプ + `-Infinity` リセット方式は猶予系入力と相性が良い**。コヨーテ・バッファとも「最終イベント時刻」を1つ持ち、消費時に `-Infinity` へ戻すだけで二重消費防止・未成立表現・境界判定(`now - t <= window`)が全部素直に書ける。フラグ+カウンタ方式より状態が少ない。
- **猶予系の挙動は Playwright + `window.lastSpark` で実測可能**。コヨーテ成立(30ms後入力で vy=-520)・失効(250ms後入力は不発)・バッファ成立(下降末期 vy>500 で入力→着地瞬間に vy=-620)まで、キーボード入力(本番経路)で検証できた。ただし `keyboard.press()`(タップ)は可変ジャンプのカットが働き vy が浅くなるので、**計測時は `keyboard.down()` 押しっぱなしでフルジャンプにしないと閾値判定を誤る**(1回目の計測はこれで偽陰性になった)。
- **バッファ検証のタイミング設計**: 先行入力が成立するのは「入力から着地まで ≤ bufferMs」の窓だけ。フルジャンプ(初速-620/重力1200)なら下降速度 vy>500 の時点で着地まで約100ms=窓内、という物理計算から観測タイミングを決めると安定する。
- **`navigator.vibrate` の機能検出は呼び出し時に行う**とテストでの差し替え(`Object.defineProperty`)が楽で、jsdom(未定義環境)でも安全。振動パターンはゲームバランスではなく演出値なので `balance.ts` に置かず `haptics.ts` 内定数とした。

**プロセス上の改善点**:
- **過去の振り返りが直接効いた**。`GameSettings` 必須フィールド追加時の「全リテラル洗い出し」は 20260621-buster-mode の retrospective に記録されており、同じ罠を grep で先回りできた。振り返りを書く→次回それを読む、のループが機能している。
- ストーリーオーバーレイ(stageIntro)による GameScene pause は、Playwright の `page.mouse.click`(本番経路のタップ)で普通に進められた。過去メモリの「headless で合成 PointerEvent は届かない」は DOM イベント dispatch の話で、**Playwright の CDP 経由 mouse 入力は Phaser に届く**。

## 次回への改善提案
- `GameSettings` にフィールドを足すときのチェックリスト: ①types/save.ts ②defaultSettings ③normalizeSettings(optional 検証+補完) ④isValidSettings(現行版は必須) ⑤SAVE_VERSION+migrate の version リスト ⑥SoundManager 既定値 ⑦soundSynth.test.ts ファクトリ ⑧SaveManager.test.ts の DEFAULT_SETTINGS。⑥⑦は忘れやすい(2回連続で該当)ので、いっそ `defaultSettings()` を import して使う形へのリファクタを検討する価値がある。
- コヨーテ(100ms)/バッファ(120ms)の値は headless では「効き過ぎ/効かなさ過ぎ」を体感評価できない。実機(スマホ実プレイ)で足場の端の挙動を確認し、必要なら `balance.ts` で調整する。
- 実機でしか確認できない残項目: Android Chrome での実振動(強さ・長さの体感)、オプションの「しんどう」トグルの操作感。
