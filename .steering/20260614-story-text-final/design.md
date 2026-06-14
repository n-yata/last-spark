# 設計書

## アプローチ

テキストデータのみの改稿。構造（型・キー・ファイル構成）は②で確定済みのため変えない。各 `StageStory` の `intro`/`eclipseVoice`/`inner` と `Cutscene.lines[].text` を、story.md のビート＋書き方の原則に沿って書き換える。創作判断を含むため、**改稿案をシャビに提示し承認を得てからコードへ反映する**（テキストは好みが入るため先に見せる）。

## 改稿の指針（キー種別ごと）

| 種別 | 話者/視点 | 原則 |
|---|---|---|
| `intro` | 状況提示＋RAY内心 | 一人称「私」、敵名を出さない、ビートの情景＋謎/揺らぎ/決意 |
| `eclipseVoice` | あの声 | 機械的・冷たく簡潔。**RAYの行動だけを根拠**。内心を名指ししない。自分も名乗らない |
| `inner.*` | RAY内心 | 「私」、出自を語らない、今この瞬間の気持ち/選択のみ。やわらかい声 |
| cutscene `terraLine` | TERRA | 6〜8歳の素朴な声。敵名を出さない |
| cutscene `direction`/`narration` | ト書き/地の文 | 画面に出せないものを語らない（群衆は不可。争いの痕跡のト書きは story.md 容認で可） |

## 設定整合の要修正点（②redesign 準拠・最重要）

現状コードに残る「RAY内心の原則」違反を story.md のビートへ是正する：

1. **stage4 `inner.eclipseReaction`**: 「ECLIPSEは正しいのか」→ RAYは敵の名も主張も知らない。story.md「私が守る人間が、この星をこうした。私は、間違っているのか」へ。
2. **stage4 `eclipseVoice`**: story.md「お前も機械だ。なぜ、星を殺す者を守る」へ（守る行動が根拠）。
3. **stage5 `intro`**: 「科学者は何をのこしたのか／受け取りに来た」＝廃止した遺言設定。決意のトーンへ全面差し替え（科学者は姿を見せない）。
4. **stage5 `eclipseVoice`**: 「気もちは故障だ」＝内心を名指し→ story.md「その個体を守る意味はない。お前の動きは、故障だ」へ（観測した守る行動が根拠）。
5. **stage5 `inner.bossDefeated`**: 「感じるために作られた」＝出自を語る→「この気持ちは、私のものだ。それでいい」へ。
6. **stage6 `eclipseVoice`**: テーマ核心「お前は、星を殺す者の味方をする。それは、星への裏切りだ」へ。
7. **全 `ECLIPSE` 名指し削除**（stage2/4/5/6 intro・eclipseVoice、cutscene TERRA 台詞）。
8. **stage6-ending narration 2文目**「人間はここから、また歩き直す」＝人類ほぼ絶滅と齟齬→「ここから、私たちが歩き出す」へ。

## データ整合（同期が必要な箇所）

- `stage1.ts` の `intro`/`inner` と `cutscenes.ts` の `stage1-intro` は**同一文を共有**（introCutsceneCoversStartText=true）。両者を一致させる。

## テスト戦略

- `storyData.test.ts` / `cutscenes.test.ts` は確定テキストを `toBe`/`toContain` で検証している。新テキストに合わせて期待値を更新。
- 追加で「'ECLIPSE' を物語テキストに含まない」「'おれ' を含まない」といった原則ガードのアサーションを足すか検討（全台詞横断の回帰防止）。

## 実装の順序

1. 改稿案をシャビに提示 → 承認/修正
2. `stage1〜6.ts` 反映
3. `cutscenes.ts` 反映（stage1-intro は stage1.ts と同期）
4. テスト追従＋原則ガード追加
5. 品質チェック（lint/typecheck/test/build）
6. クルトワのセキュリティレビュー → PR

## セキュリティ考慮

- テキストデータのみ。XSS は Phaser Text（非DOM・Canvas描画）で構造的に不成立。ハードコーディング（URL/シークレット）なし。コミット前にクルトワレビュー。
