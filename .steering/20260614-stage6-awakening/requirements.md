# 要求: RAY強化イベントを Stage6 開始へ移設

作成日: 2026-06-14
ブランチ: `feature/stage6-awakening`

## 背景

現状、RAY の攻撃強化（empowered）は **Stage5 のボス撃破後**の演出
`stage5-awakening`（休眠コアとの共鳴で「最後の光」を受け取る）で獲得し、
registry フラグ `PROGRESS.playerEmpowered` を介して **Stage6 のプレイ系列のみ**で有効化していた。

このフラグは揮発（セーブ非保存）で、

- `init()`: `fromStageSelect` のとき false にリセット
- `finalizePostBossClear()`: Stage5 演出完了で true 付与
- `createPlayer()`: true なら `player.setEmpowered(true)`
- `finalizeEnding()`: 全クリアで false

という4点でライフサイクル管理されている。リトライ維持・単体選択での漏れ防止のために
`fromStageSelect` 一式が導入されている。

## 今回の要求

**強化獲得イベントを、Stage5 終わり（ボス撃破後）ではなく Stage6 の開始時へ移す。**

### 確定方針（シャビ）

1. カットシーンのテキストは **Stage6 の舞台（ECLIPSE 支配中枢への突入）に合わせて書き直す**。
   - テキスト本文の創作はモドリッチが別途担当。本ステアリングでは構造・フロー・キー設計のみを決める。
2. 「Stage6 開始時に強化を獲得する」演出を Stage6 の開始演出（intro カットシーン）として再生する。

### 解きたい設計上の問い

- 強化付与を「Stage6 開始時＝常時強化」へ単純化できるか。registry フラグ・`fromStageSelect`
  一式を撤去できるか。
- リトライ（`skipCutscene`）時に強化が維持されるか。
- 直接ステージ選択で Stage6 を選んだ場合の挙動（常時強化になる仕様変更）の妥当性。
- Stage5 から `postBossCutsceneKey` を外すと未使用になるコード（`enterPostBossCutscene` /
  `finalizePostBossClear`）の撤去可否。
- Stage5 が通常クリア経路に戻ることで必要になる撃破内心（`inner.bossDefeated`）の復元。
- カットシーンキー `stage5-awakening` → `stage6-awakening` のリネーム可否と影響範囲。
- Stage6 に intro 演出を足したときの開始テキスト二重表示（`introCutsceneCoversStartText`）の扱い。

## 非対象（スコープ外）

- カットシーン本文・ストーリーテキストの創作（モドリッチ担当）。
- 強化そのもの（`setEmpowered` / ビーム）の挙動変更。
- Stage5 のゲームプレイ（敵配置・ボス）変更。
- コード実装（本ステアリングは requirements / design のみ。実装は別作業）。

## 制約・北極星

- ストーリーの北極星は `docs/story.md`。物語整合に関わる構造判断は story.md を参照する。
- 揮発フラグ・セーブ仕様を壊さない（全クリア後にタイトルへ戻る際の状態リセットを保つ）。
- 既存テスト（`tests/unit/config/`）の意図を尊重し、仕様変更に追従させる。
