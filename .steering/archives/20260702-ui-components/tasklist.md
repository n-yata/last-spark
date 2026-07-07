# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### タスクスキップが許可される唯一のケース
技術的理由(実装方針変更・アーキテクチャ変更・依存関係変更)のみ。スキップ時は理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

---

## フェーズ1: NeonButton 部品の実装

- [x] `src/ui/neonButton.ts` を新規作成
  - [x] `computeButtonMetrics`(純関数: パディング/minWidth → パネル寸法)
  - [x] `NEON_BUTTON_COLORS`(variant → 配色の対応表)
  - [x] `createNeonButton`(Container + 角丸パネル Graphics + ラベル Text)
  - [x] hover(増光)/押下(沈み込み+発光フラッシュ、onClick は POINTER_DOWN 即時発火)
  - [x] ghost variant(パネルなし + 押下フィードバック)
  - [x] setLabel / setEnabled / destroy
- [x] `tests/unit/ui/neonButton.test.ts` を新規作成(11件緑。phaser は vi.mock でスタブ)
  - [x] computeButtonMetrics のテスト(パディング・minWidth 下限・境界値)
  - [x] NEON_BUTTON_COLORS の全 variant 網羅テスト

## フェーズ2: 既存シーンへの適用

- [x] `optionsMenu.ts` の makeMenuButton を NeonButton に置換
  - [x] ルートメニュー項目(パネル型 default、「▶ ゲームに戻る」は primary、minWidth で幅揃え)
  - [x] 音量パネル(◂ ▸ / BACK = ghost、MUTE / しんどう = パネル型 fontSize18)
  - [x] 操作説明パネルの BACK(ghost)
  - [x] ステージ移動パネル + 確認パネル(「はい」= danger、「いいえ」= default)
  - [x] ステージ選択サブパネル(項目 = パネル型、BACK = ghost)
- [x] `stageSelect.ts` の makeMenuButton 利用箇所を確認して置換
      (overlay BACK = ghost。右下「STAGE SELECT ▸」導線も小型パネルに統一)
- [x] `GameOverScene` の即席 makeButton を削除し RETRY(primary)/ TITLE(default)を置換
- [x] `ClearScene` の周回2択を NeonButton に置換(広域 zone を撤去し判定をボタンに一本化、
      キーボード既定操作は onClick 直接呼び出しに変更。入力猶予は setEnabled(false)→有効化で表現)
- [x] `TitleScene` の「⚙ OPTIONS」を~~ghost~~小型パネル型に置換
      (設計変更: キービジュアル明部での可読性はパネルの暗背景の方が確実なため。
       右下 STAGE SELECT と見た目を揃える)
- [x] `menuButton.ts` を削除(Grep で参照ゼロを確認済み)

## フェーズ3: 品質チェックと検証

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`(ユニット/統合 659件)
- [x] `npm run build`
- [x] e2e 実行(16/16 緑。E2E_PORT=4273 の専用ポートで実行 — 並行セッションのサーバーを
      reuseExistingServer が掴む事故を playwright.config.ts の E2E_PORT/strictPort 対応で恒久回避)
  - [x] `options/difficulty-options.spec.ts`(ボタン実クリック経路。MODE 座標を新レイアウト 0.28H に追従)
  - [x] orientation 系(dpr1-resize / hidpi-resolution / fill-screen / rotate-prompt)
  - [x] play-through 系の緑分(title-to-clear / boss-damage)
- [x] Playwright で主要画面のビジュアル確認(dpr=1 / dpr=2 両方)
  - [x] Title(⚙ OPTIONS)
  - [x] OPTIONS ルート + 音量パネル(MUTE がバー行に食い込む重なりを発見→余白 scaled(14) 追加で解消)
  - [x] GameOver(RETRY / TITLE)
  - [x] Clear 周回2択
- [x] (追加対応)NeonButton のヒット判定が左上に半分ズレる不具合を格子クリック実測で特定・修正
      (Phaser Container の入力ローカル座標は左上原点 0..width。hitArea は (0,0,w,h) で指定)

## フェーズ4: ドキュメント・仕上げ

- [x] docs の同期確認(repository-structure.md の ui/ 配置ファイルと stageSelect 依存記述を neonButton へ追従。
      functional-design.md はボタン実装の言及なしのため変更不要)
- [x] クルトワ(security-engineer)のセキュリティレビュー(Critical/High/Medium なし)
- [x] 振り返りを `retrospective.md` に記録(モード3)
- [x] (追加対応)master の PR #118(クリアリザルト強化)を取り込みコンフリクト解消
      (ClearScene: カウントアップ/ランク演出 + NeonButton 周回2択の合成。検証・スクショ確認済み)

---

> **振り返りについて**: 実装後の振り返りはこのファイルではなく、同じディレクトリの
> `retrospective.md` に記録する。全タスクが `[x]` になったことを確認してから作成すること。
