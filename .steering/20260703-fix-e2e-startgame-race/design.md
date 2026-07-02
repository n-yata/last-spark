# 設計書

## アーキテクチャ概要

変更はテストヘルパー2箇所 + 本体の防御1行のみ。ゲームの挙動仕様は変えない。

```
[TitleScene] --click--> [GameScene.create]
                           └─ time.delayedCall(300ms) ── scene.launch(CutsceneScene) + scene.pause()
                                        ▲
                                        │ この300msの窓で startGame が早抜けするのが根因
                                        │
startGame(修正後):
  click → 「CutsceneScene の出現」を待つ(出ない場合のフォールバックあり)
        → 出たらタップで送り切る
        → GameScene 実行中 && CutsceneScene なし を確認して返る
```

## コンポーネント設計

### 1. `startGame()`(tests/e2e/_helpers.ts)

**責務**:
- タイトルから開始し、開始演出を確実に消化して「GameScene 実行中」で返る

**実装の要点**:
- タイトルクリック後、まず**カットシーンの出現を待つ**(最大 5s)
  - 出現待ちの終了条件は2つ: (a) CutsceneScene がアクティブになった、
    (b) GameScene がアクティブなまま **1.5s** 連続で演出が出ない(=演出なし設定と判断)
  - (b) の 1.5s は遅延起動 300ms(シーンクロック=実時間ベース)を余裕をもって跨ぐ値
  - GameScene が pause されて active から消えた場合は連続計測をリセットする(誤判定防止)
- 出現後は既存どおりタップ送り(400ms 間隔、入力ガード 350ms 超)で
  「GameScene 実行中 && CutsceneScene なし」まで進める(上限回数は 20 に拡大)
- 最後に `waitForScene('GameScene')` で実行中を保証(既存と同じ返り条件)

### 2. full-playthrough の前進キー再送(tests/e2e/play-through/full-playthrough.spec.ts)

**責務**:
- 走破ループが pause/resume(演出・回転案内等)によるキー状態リセットから自己回復する

**実装の要点**:
- ループ先頭で `movingRight` が真なら `page.keyboard.down('ArrowRight')` を再送する
  (Playwright の重複 down は repeat keydown になるだけで無害。Phaser は isDown を再セットする)
- ボス戦分岐の movingRight トグルはそのまま(再送は同フラグに従う)

### 3. `startIntro()` の ended ガード(src/scenes/GameScene.ts)

**責務**:
- クリア遷移(`transitionTo` の fadeOut)開始後に開始カットシーンが遅延起動して
  GameScene を pause し、FADE_OUT_COMPLETE を凍結させるデッドロックを防ぐ

**実装の要点**:
- `startIntro()` 内 `this.time.delayedCall(300, () => { ... })` のコールバック冒頭に
  `if (this.ended) return;` を追加(1行 + コメント)
- 実プレイでは 300ms 以内にクリアは不可能なため挙動変化なし。テスト・異常系の防御

## データフロー

### 修正後の startGame
```
1. TitleScene 待ち → canvas クリック
2. 出現待ちループ(100ms 間隔, 最大5s):
   - CutsceneScene active → 3 へ
   - GameScene active が 1.5s 連続 → 4 へ(演出なし)
3. 送りループ: GameScene active && !CutsceneScene まで canvas クリック(400ms 間隔, 最大20回)
4. waitForScene('GameScene') で確定
```

## エラーハンドリング戦略

- 出現待ち・送りループはともに上限付き。上限超過時は最後の `waitForScene('GameScene')` が
  10s でタイムアウトし、Playwright の失敗として表面化する(無限待ちにしない)

## テスト戦略

### ユニットテスト
- なし(変更は e2e ヘルパーと Phaser シーン内の1行ガード。純粋ロジックの追加なし)

### 統合テスト(e2e)
- `stage-progression-guard.spec.ts` 単独 `--repeat-each=3` で 3/3 成功(修正前は 4/4 失敗)
- 全スイート(18件, workers=2)で全緑(修正前は同条件で 2件失敗を再現済み)
- 並行セッション対策として `E2E_PORT` で専用ポートを使って実行する

## 依存ライブラリ

追加なし。

## ディレクトリ構造

```
tests/e2e/_helpers.ts                              # startGame 修正
tests/e2e/play-through/full-playthrough.spec.ts    # ArrowRight 再送
src/scenes/GameScene.ts                            # startIntro ended ガード(1行)
.steering/20260703-fix-e2e-startgame-race/         # 本ステアリング
```

## 実装の順序

1. `_helpers.ts` の startGame 修正
2. `full-playthrough.spec.ts` のキー再送
3. `GameScene.startIntro` の ended ガード
4. e2e(対象2件 → 全件)+ CI 相当チェック(test/lint/typecheck/build)
5. セキュリティレビュー(クルトワ) → retrospective → コミット → PR

## セキュリティ考慮事項

- 変更はテストコードとシーン内早期 return のみ。外部入力・保存データ・URL/キーの扱いに変更なし
- コミット前にクルトワ(security-engineer)のレビューを実施(ハードコーディング検出観点を含む)

## パフォーマンス考慮事項

- startGame の「演出なしフォールバック」は演出なし設定時のみ +1.5s。既定(演出あり)では
  出現を検知した時点で抜けるため、既存の固定 700ms 待ちと大差ない

## 将来の拡張性

- e2e を PR CI に組み込む場合も、本修正によりタイミング依存が減り移行しやすくなる
