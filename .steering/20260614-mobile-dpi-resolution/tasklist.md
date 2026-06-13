# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: コア基盤（解像度＋uiScale 真実源）

- [x] `src/config/uiScale.ts` を新規作成
  - [x] `cappedDpr(raw?)`（max(1,min(raw,2)), window不在で1）
  - [x] `getUiScale()` / `setUiScale()`（初期1・下限1）
  - [x] `scaled(px)` / `scaledFontPx(px)`
- [x] `src/systems/dprScaling.ts` を新規作成
  - [x] `initHiDpiScaling(game)`（apply: setUiScale→scale.resize(物理px)→canvas.style=CSS px）
  - [x] `window` の resize / orientationchange 登録 + READY で初回 apply
- [x] `src/config/gameConfig.ts` を変更（mode RESIZE→NONE、コメント更新、antialias維持）
- [x] `src/main.ts` を変更（Game生成直後に `initHiDpiScaling(game)` 配線）

## フェーズ2: 操作系（タッチUIの uiScale 適用）

- [x] `src/config/touchLayout.ts`：BUTTON_RADIUS/配置オフセット/BAND_BUTTON_MARGIN/各不感帯/MOVE_PAD半径を `scaled()` 倍（消費時乗算・export定数はベース値維持）
- [x] `src/config/controlBand.ts`：MIN/MAX クランプを `scaled()` 倍
- [x] `src/ui/MovePad.ts`：描画半径を `scaled()` 倍
- [x] `src/ui/TouchControls.ts`：fontSize/絶対px を `scaledFontPx()`/`scaled()` 経由
- [x] `src/systems/InputController.ts`：座標系整合の確認（pointer/layout とも物理px単位で整合・修正不要）

## フェーズ3: UIシーン/HUD の fontSize・絶対px スケール

- [x] `src/scenes/TitleScene.ts`（ロゴ/字幕/開始/クリア表示/背景ビル）
- [x] `src/scenes/PreloadScene.ts`（NOW LOADING + cutscene SVG を DPR 倍ロード）
- [x] `src/scenes/GameOverScene.ts`
- [x] `src/scenes/ClearScene.ts`
- [x] `src/scenes/CutsceneScene.ts`（LINE_STYLE の fontSize 数値化＋setFontSize、本文/wordWrap/フォールバック描画）
- [x] `src/scenes/OrientationScene.ts`
- [x] `src/ui/StoryOverlay.ts`
- [x] `src/ui/LifeBar.ts`（セグメント寸法/位置の絶対px）
- [x] `src/ui/BossHpBar.ts`（fontSize/バー寸法）
- [x] `src/ui/ChargeGauge.ts`（寸法/位置の絶対px）
- [x] `src/devMode/stageSelect.ts`（fontSize/配置）

## フェーズ4: テスト（ギュレル / test-engineer）

- [x] `tests/unit/config/uiScale.test.ts` 新規（cappedDpr 境界 / get-set / scaled / scaledFontPx）21テスト
- [x] `tests/unit/config/touchLayout.test.ts` に uiScale=2 ケース追加（既存 uiScale=1 は不変を確認）+15
- [x] `tests/unit/config/controlBand.test.ts` に uiScale=2 ケース追加 +6
- [x] E2E 追加：`tests/e2e/orientation/hidpi-resolution.spec.ts`（canvas.width≧CSS幅×1.9・style はCSS px・進行成立）2テスト実行緑
- [x] 既存テスト（349）が不変で通ることを確認（合計 387 passed）

## フェーズ5: 品質チェックと修正

- [x] `npm test`（32 files / 387 passed）
- [x] `npm run lint`（エラーなし）
- [x] `npm run typecheck`（エラーなし）
- [x] `npm run build`（成功・既存のチャンクサイズ警告のみ）

## フェーズ6: セキュリティレビュー・統合・ドキュメント

- [x] クルトワ（security-engineer）によるセキュリティレビュー（ハードコード/OWASP）→ Critical/High ゼロ、コミット可
- [ ] master を pull → feature に取り込み（コンフリクト解消）
- [ ] コミット → push → PR 作成 → master へ Merge commit
- [ ] マージ後: feature ブランチ・worktree 削除
- [ ] 実装後の振り返り（このファイル下部に記録）

---

## 実装後の振り返り

### 実装完了日
{YYYY-MM-DD}

### 計画と実績の差分

**計画と異なった点**:
-

**新たに必要になったタスク**:
-

### 学んだこと

**技術的な学び**:
-

**プロセス上の改善点**:
-

### 次回への改善提案
-
