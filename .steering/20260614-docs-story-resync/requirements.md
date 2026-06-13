# 要求: ストーリー永続ドキュメントのコード再同期

## 背景

ゲーム内テキストの実体は `src/config/story/stage1.ts`〜`stage6.ts` と
`src/config/story/cutscenes.ts`（現在の正本）。2026-06-14 に全テキストを
小学3年生向けに平易化済み（PR #28, master d0cecb6）。

一方 `docs/story.md`「テキストコンテンツ（確定版）」は平易化前の旧テキストのままで、
コードと不一致になっていた。

## 要求内容

1. `src/config/story/*.ts` の現行テキスト（intro / eclipseVoice / logs / inner、
   カットシーン台本）を正として、`docs/story.md` の該当箇所を一致するよう更新する。
2. `docs/glossary.md` のステージ名・用語をコード現状に合わせる。
   固有名詞 ECLIPSE / RAY / TERRA は維持する。
3. ドキュメントのみの変更。コードは変更しない。

## 正否の基準

- コードとドキュメントのどちらを正とするか迷ったら、必ずコード側を正とする。
