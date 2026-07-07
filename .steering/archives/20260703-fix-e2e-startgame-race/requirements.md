# 要求内容

## 概要

ローカル(Windows)で決定的に失敗する e2e 2件(`full-playthrough` / `stage-progression-guard`)を、
根因である「startGame ヘルパーと開始カットシーンの遅延起動の競合」を解消して安定化する。

## 背景

2026-07-02 の調査(クリーン環境 master 4e7daf3 + ロック版 Playwright 1.60.0 で再現・機序確定)により、
以下の競合が根因と特定済み:

- `GameScene.startIntro()` は開始カットシーンを `time.delayedCall(300ms)` で**遅延起動**して自身を pause する
- `tests/e2e/_helpers.ts` の `startGame()` は「GameScene がアクティブ かつ CutsceneScene なし」を
  1回確認して抜けるため、**カットシーン起動前の 300ms の窓**に当たると早抜けする
- 早抜け後にカットシーンが遅れて起動し、テストの想定外タイミングで GameScene を pause する

症状の機序(いずれも実測で確認済み):

1. **stage-progression-guard**: テストが `finishStageClear()` を叩いた直後に遅延カットシーンが
   GameScene を pause → `transitionTo` のカメラ fadeOut が凍結し FADE_OUT_COMPLETE が来ない →
   ClearScene へ遷移せずデッドロック(単独実行 4/4 で再現)
2. **full-playthrough**: 遅延カットシーンは KeyJ 連打で送り切れるが、**Phaser は scene の
   pause/resume で保持中キーの isDown をリセットする**。テストは ArrowRight を最初に1回しか
   down しないため、resume 後は右入力なし扱いとなり x≈163 で永久停止 → 150s タイムアウト
   (スイート並列実行で再現。`rightDown=false, vel=[0,0]` を実測)

CI は e2e を workflow_dispatch 限定でしか実行しないため、この競合はマシンタイミング依存で
ローカルでのみ顕在化していた(特定コミットのリグレッションではない)。

## 実装対象の機能

### 1. startGame ヘルパーの競合解消(tests/e2e/_helpers.ts)
- 開始カットシーンの「出現を待ってから送り切る」方式に変更し、300ms 窓での早抜けをなくす
- ストーリー表示なし(演出が出ない)設定でも成立するフォールバックを持つ
- 既存の利用箇所(全 e2e)の意味を変えない(=「GameScene が実行中になった状態で返る」)

### 2. full-playthrough のキー保持対策(tests/e2e/play-through/full-playthrough.spec.ts)
- ループ内で前進キー(ArrowRight)を再送し、pause/resume によるキー状態リセットから自己回復できるようにする

### 3. GameScene の防御(src/scenes/GameScene.ts)
- `startIntro()` の遅延コールバック冒頭に `ended` ガードを追加し、クリア遷移開始後に
  開始カットシーンが起動してフェードを凍結させるデッドロックの芽を摘む

## 受け入れ条件

### startGame ヘルパー
- [ ] `stage-progression-guard.spec.ts` が単独実行(--repeat-each=3)で 3/3 成功する
- [ ] 既存の startGame 利用テスト(title-to-clear 等)が引き続き成功する

### full-playthrough
- [ ] 全スイート並列実行(workers=2)で `full-playthrough` がクリアまで走破して成功する

### 全体
- [ ] e2e 全件(18件)がローカルで緑になる
- [ ] `npm test` / `npm run lint` / `npm run typecheck` / `npm run build` がすべて成功する

## 成功指標

- 2026-07-02 に決定的失敗していた 2件が、単独・並列の両方で安定して成功する

## スコープ外

以下はこのフェーズでは実装しません:

- CI で e2e を PR 時に常時実行する変更(別途検討。今回はローカル安定化まで)
- OrientationScene 起因の pause 凍結対策の一般化(既知の別系統。今回の根因ではない)
- 本体ツリー(メイン worktree)の node_modules 復旧(環境問題として別途 `npm ci` を実施する)

## 参照ドキュメント

- `docs/development-guidelines.md` - 開発ガイドライン
- `.steering/20260702-input-feel/` - 疑いをかけたが無関係と確定した PR #115 の作業記録
- メモリ: e2e-startgame-intro-race(2026-07-02 調査の詳細)
