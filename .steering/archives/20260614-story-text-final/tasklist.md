# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること。** 未完了タスク（`[ ]`）を残したまま終了しない。

---

## フェーズ0: 改稿案の合意

- [x] 全台詞の改稿案（before→after）をシャビに提示
- [x] シャビの承認 or 修正指示を反映（漢字を増やす／Stage2「一人で生まれた」削除／RAY・TERRA→レイ・テラ表記／Stage3のterraFound「奥に誰かいる」・あの声「渡さない」へ時系列整合修正）

## フェーズ1: ステージ確定テキストの改稿（stage1〜6.ts）

- [x] stage1.ts（intro / eclipseVoice / inner）
- [x] stage2.ts（ECLIPSE名指し削除）
- [x] stage3.ts（terraFound・あの声を時系列整合修正）
- [x] stage4.ts（eclipseReaction の設定整合修正・eclipseVoice）
- [x] stage5.ts（intro 全面差し替え・eclipseVoice・bossDefeated の設定整合修正）
- [x] stage6.ts（eclipseVoice をテーマ核心へ）
- [x] 各ファイルのヘッダコメント（旧テーマ表記）も整える

## フェーズ2: カットシーンの改稿（cutscenes.ts）

- [x] stage1-intro（stage1.ts と同期）
- [x] stage3-rescue（レイ・テラ表記・一人称・記号。刻印RAYは英字維持）
- [x] stage4-intro（一人称・記号）
- [x] stage5-intro（テラの ECLIPSE 名指し削除・一人称）
- [x] stage6-ending（一人称・記号・narration 2文目の差し替え）

## フェーズ3: テスト追従と原則ガード

- [ ] storyData.test.ts の期待値を新テキストへ更新
- [ ] cutscenes.test.ts の期待値を新テキストへ更新
- [ ] 原則ガード追加（物語テキストに 'ECLIPSE'/'おれ' を含まない 等）の要否を判断し、有効なら追加

## フェーズ4: 品質チェック

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`

## フェーズ5: セキュリティレビューとPR

- [ ] クルトワ（security-engineer）のセキュリティレビュー
- [ ] master を pull して取り込み（コンフリクト解消）
- [ ] push → PR 作成
- [ ] 実機確認（各ステージの開始テキスト・あの声・カットシーンが新テキストで表示される）
- [ ] 実装後の振り返り

---

## 実装後の振り返り

### 実装完了日
{YYYY-MM-DD}

### 計画と実績の差分
- {記入}

### 学んだこと
- {記入}

### 次回への改善提案
- {記入}
