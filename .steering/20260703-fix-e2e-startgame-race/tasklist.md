# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: テストヘルパーの競合解消

- [x] `tests/e2e/_helpers.ts` の `startGame()` を「カットシーン出現待ち → 送り切り」方式に変更
  - [x] 出現待ちループ(最大5s、演出なしは GameScene 実行 1.5s 連続で判断)を実装
  - [x] 送りループの上限を 20 回に拡大し、既存の返り条件(GameScene 実行中)を維持
  - [x] 競合の背景(300ms 遅延起動との競合)をコメントで明記

## フェーズ2: full-playthrough のキー保持対策

- [x] `tests/e2e/play-through/full-playthrough.spec.ts` のループ内で ArrowRight を再送
  - [x] `movingRight` が真の間、ループ先頭で `keyboard.down('ArrowRight')` を再送
  - [x] pause/resume によるキーリセット対策である旨をコメントで明記

## フェーズ3: GameScene の防御

- [x] `src/scenes/GameScene.ts` `startIntro()` の遅延コールバック冒頭に `if (this.ended) return;` を追加

## フェーズ4: 検証(e2e・CI相当チェック)

- [x] `stage-progression-guard.spec.ts` 単独 `--repeat-each=3 --workers=1` で 3/3 成功
- [x] e2e 全件(18件, workers=2, E2E_PORT=4293)で全緑(18 passed / 1.9m。修正前は同条件で 2件失敗)
- [x] `npm test` が成功(681/681)
- [x] `npm run lint` が成功
- [x] `npm run typecheck` が成功
- [x] `npm run build` が成功

## フェーズ5: レビューと仕上げ

- [x] クルトワ(security-engineer)によるセキュリティレビュー(Critical/High/Medium/Low すべてなし、コミット可判定)
- [x] 実装後の振り返りを記録(別ファイル `retrospective.md` に記録 → モード3)

---

> **振り返りについて**: 実装後の振り返りはこのファイルではなく、同じディレクトリの
> `retrospective.md` に記録する。全タスクが `[x]` になったことを確認してから作成すること。
