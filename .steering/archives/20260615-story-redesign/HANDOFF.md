# 引き継ぎ資料 — ストーリー全面リライト（2026-06-15）

> 進捗台帳。ストーリーの中身は `design.md` / `draft-story.md` を正とし、ここには書かない。
> サマリーを鵜呑みにせず、下記「読む順序」のファイルを Read で確認してから進めること（CLAUDE.md 引き継ぎ原則）。

## 現在地
設計（STEP1-5）確定済み。**前任の `draft-story.md` は保存されておらず消失していたため、2026-06-15 に単独執筆で書き直して再作成済み**（管理AI名＝「管理者」確定、発火モデルをコード調査で確定し各テキストを発火点に対応づけ）。**コードは未着手。`src/` は未変更＝master と同一**。
ブロッカー: 再作成した完成稿の文言がシャビ未承認（下記「ブロッカー」）。承認後に src/docs へ反映する。

## 🎯 最初にやること（次の一手）
1. 下記「読む順序」で現状を把握する。
2. `git -C C:\develop\workspace-claude\last-spark-story-redesign status` で変更が `.steering/` 配下のみと確認する。
3. **`draft-story.md` 末尾「承認ステータス」の未承認4論点を、シャビに1つずつ確認する**
   （①管理AIの具体名 ②各ステージ文言の可否 ③Stage6 テラ離脱シーンの諾否 ④「コード反映」の範囲・タイミング）。
   → **勝手に確定・先行実装しない**。承認を得てから反映へ進む。

## 読む順序
1. `HANDOFF.md`（本書）
2. `design.md` … 企画ブリーフ＝STEP1-5の設計（確定・承認済み）。決定の"なぜ"もここ。
3. `draft-story.md` … 完成稿ドラフト全文＋承認ステータス。
4. （必要時）`requirements.md` / `tasklist.md`。

## 作業環境
- worktree: `C:\develop\workspace-claude\last-spark-story-redesign`（ブランチ `feature/story-redesign`、master 分岐）。
- 確認手段: `git worktree list` / 上記 `git ... status`。
- 未コミット。変更は `.steering/20260615-story-redesign/` のみ。

## ⛔ やってはいけないこと
- 未承認論点を勝手に確定して先行実装しない（今回の中断原因）。
- 隣の worktree `last-spark-stage6-spawn-fix`（別セッション）に触らない。
- master 直コミット禁止。コミット前にクルトワ（security-engineer）レビュー必須。
- git 操作は PowerShell で1コマンドずつ（Windows）。

## ✅ 完了したこと
1. worktree・feature ブランチ作成。
2. steering 作成: `requirements.md` / `design.md` / `tasklist.md`。
3. 設計（STEP1-5）確定＝シャビ承認済み → `design.md`。
4. 完成稿ドラフト執筆 → `draft-story.md`（Stage3 のあの声のみシャビ確定、他は未承認）。
5. コード反映先の調査完了（下記「技術メモ」）。

## ⬜ これからやること（順序）
1. 完成稿の承認を取る（上記「最初にやること」3）。
2. 承認稿を `src/config/story/`（stage1-6 + cutscenes.ts）へ反映＋ `stages.ts` フラグ調整。
3. `docs/story.md`（北極星）を承認稿に同期。
4. 品質チェック（下記コマンド）。
5. クルトワのレビュー → コミット → PR。
6. `tasklist.md` 進捗反映 → `retrospective.md`（steering モード3）。

## 🚧 ブロッカー（シャビの判断待ち）
- 完成稿の未承認4論点（`draft-story.md` 末尾）。これが片付くまで src 反映へ進めない。

## 技術メモ（コード反映先・調査済みの要点）
- テキスト正本: `src/config/story/stage1〜6.ts`（intro / eclipseVoice / inner{}）、`cutscenes.ts`。
- 表示制御: `storyDirector.ts`（resolveStoryEvent）、`GameScene.ts`（startIntro/finishIntro/emitStory・inner 発火点）、
  `CutsceneScene.ts`、`config/stages.ts`（フラグ）。
- **三重の繰り返し解消の要対応点**: 「カットシーンがある回は開始テキストを省く」方針。
  Stage1 は `introCutsceneCoversStartText=true` で整合済み。**Stage4/5 は現状 false** のため、
  ドラフト通り省くならフラグ調整 or 開始テキストの別内容化が必要（設計判断）。Stage6 は false 維持。

## 検証コマンド（反映後に実行）
- `npm run lint` / `npm run typecheck` / `npm test` / `npm run build`
- 現状は src 未変更のため master 相当（健全）。反映で壊れたら差分を疑う。

## 補足
- `tasklist.md` は当初「脚本チーム競作」前提だが、シャビ判断で「単独執筆」に変更済み。競作タスクは不要（次セッションで整理）。
