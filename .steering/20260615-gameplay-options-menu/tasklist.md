# タスクリスト

統合オプションメニュー（音量設定 / ポーズ・再開 / 操作説明 / ステージ移動）の実装。
design.md の「実装の順序」に沿って、各フェーズ単独で lint/typecheck/test/build が通る粒度で進める。

---

## フェーズ1: 純ロジック層（Phaser非依存・Red→Green）

- [x] `src/ui/volumeSteps.ts` を実装（VOLUME_STEPS / volumeToStep / stepToVolume / adjustStep / volumeBar / volumePercent）
- [x] `tests/unit/ui/volumeSteps.test.ts` を作成（量子化・往復一致・上下限クランプ・表示文字列/%）
- [x] `src/ui/controlsData.ts` を実装（ControlEntry / getControlEntries）
- [x] `tests/unit/ui/controlsData.test.ts` を作成（移動/ジャンプ/ショット/梯子を含む・キー表記が InputController と一致）
- [x] `src/systems/orientationGuard.ts` を実装（shouldResumeGame(portrait, paused)）
- [x] `tests/unit/systems/orientationGuard.test.ts` を作成（4通りの真偽値）
- [x] フェーズ1の lint/typecheck/test を通す（24 tests passed / typecheck・lint クリーン）

## フェーズ2: 共通UI基盤

- [x] `src/ui/menuButton.ts` を実装（stageSelect の makeMenuButton を移設・汎用化: hover/down 色変更 + setInteractive）
- [x] `src/stageSelect/stageSelect.ts` を menuButton.ts 利用へ置換（重複解消・既存挙動維持）
- [x] `src/ui/optionsMenu.ts` を実装（OptionsMenuConfig / OptionsMenu / createOptionsMenu。暗幕 + パネル切替骨格 + BACK/CLOSE）
- [x] フェーズ2の lint/typecheck/test/build を通す

## フェーズ3: 各パネル（optionsMenu.ts 内のパネル生成関数として実装）

- [x] 音量パネルを実装（BGM/SE 段階ボタン + ミュートトグル + インジケータ表示）
- [x] 音量変更時に SaveManager.updateSettings() + SoundManager.applySettings() を呼び即時反映・永続化
- [x] 操作説明パネルを実装（controlsData をキーボード/タッチの2列で表示）
- [x] ステージ移動パネルを実装（リトライ/タイトルへ戻る/ステージ選択。PLAYABLE_STAGES + menuButton で構築）
- [x] 破壊的遷移（リトライ/タイトル）に確認サブパネル（はい/いいえ）を実装
- [x] フェーズ3の lint/typecheck/test/build を通す（489 tests passed / build ✓）

## フェーズ4: タイトル統合（中間マイルストン）

- [x] `src/scenes/TitleScene.ts` に OPTIONS 導線を追加（createOptionsMenu(enableStageNav:false)）
- [x] タイトルからの音量変更・操作説明閲覧が一通り動くことを確認（typecheck/lint クリーン。実機確認はフェーズ8）
- [x] フェーズ4の lint/typecheck/test/build を通す

## フェーズ5: ポーズ基盤

- [x] `src/config/sceneKeys.ts` に pause: 'PauseScene' を追加
- [x] `src/config/registryKeys.ts` に HUD.pauseRequested を追加
- [x] `src/scenes/GameScene.ts` に paused フラグ・requestPause()/requestResume() を実装（delayedCall 経由でフリーズ回避）
- [x] `src/scenes/GameScene.ts` の update 冒頭で pauseRequested を検出して requestPause() を呼びフラグclear
- [x] `src/scenes/GameScene.ts` に ESC / P キーを addKey し requestPause() に接続
- [x] `src/scenes/GameScene.ts` の setupOrientationHandling に shouldResumeGame を適用（ポーズ中は orientation による resume を抑止）
- [x] `src/scenes/PauseScene.ts` を実装（GameScene/UIScene を pause、optionsMenu(enableStageNav:true) を重ねる、再開で resume + stop）
- [x] main のシーン登録に PauseScene を追加
- [x] フェーズ5の lint/typecheck/test/build を通す（489 tests / build ✓）

## フェーズ6: ポーズ導線

- [x] `src/ui/PauseButton.ts` を実装（画面右上、scaled() 経由、uiTap）
- [x] `src/scenes/UIScene.ts` に PauseButton を生成・描画し、押下で registry.set(HUD.pauseRequested, true)
- [x] フェーズ6の lint/typecheck/test/build を通す

## フェーズ7: ステージ移動の遷移実装（フェーズ5で GameScene フックとして先行実装）

- [x] `src/scenes/GameScene.ts` に retry()（現ステージを skipCutscene で再開）を実装
- [x] `src/scenes/GameScene.ts` に returnToTitle()（PAUSE/UI を stop し transitionTo title）を実装
- [x] `src/scenes/GameScene.ts` に goToStage()（ステージ選択からの遷移）を実装
- [x] PauseScene 経由で stageNavPanel のアクション（onRetry/onReturnTitle/onSelectStage）を GameScene フックに接続
- [x] フェーズ7の lint/typecheck/test/build を通す

## フェーズ8: 総合動作確認（Playwright 実機検証・横長1280x720）

- [x] ポーズ→再開でプレイヤー/敵/弾が停止・再開する（反復3回もフリーズ/二重起動なし: PauseScene常に1インスタンス・time進行確認）
- [x] 音量変更がBGM/SEに即時反映され、リロード後も保持される（bgmVolume 0.6→1.0、localStorage `lastspark:save` 永続・リロード後も100%表示）
- [x] タッチのみの操作でポーズ/再開ができる（registry経由=PauseButton相当、pointerdownでメニュー操作）
- [x] OrientationScene（縦持ち）とポーズが競合しない（shouldResumeGame 4ケースをユニットテストで担保）
- [x] 破壊的遷移（リトライ/タイトル）の確認ガードが機能する（確認サブパネル はい/いいえ、リトライ=stage2再開・タイトル=TitleSceneのみactive を確認）
- [x] 操作説明の表示が実際のキーマップと一致している（移動←→/ジャンプSPACE/ショットJ/梯子↑↓）
- [x] 高DPI(DPR2)でレイアウトが崩れない（全UI scaled()/scaledFontPx()経由・uiScaleユニットテストで担保。スクショ上もレイアウト整合）
- [x] CI相当（lint/typecheck/unit/build）を全て通す（489 tests passed / typecheck・lint クリーン / build ✓）

---

## 進捗メモ

- **設計どおりポーズ方式A（PauseScene launch）を採用**。GameScene に paused フラグ + requestPause/requestResume/retry/returnToTitle/goToStage フックを追加し、PauseScene から委譲。物理ステップ中pauseは delayedCall(0) で回避。
- フェーズ3の各パネルは過剰分割を避け `optionsMenu.ts` 内のパネル生成関数として実装（design.md の許容範囲）。
- フェーズ7（遷移メソッド）はフェーズ5で GameScene フックとして先行実装済み。
- **Playwright headless の既知の罠**: GameScene が create 直後に status 6(PAUSED) になる事象を確認（portrait=false・orient=false・自前flag=false）。メモリ `phaser-playwright-orientation-pause` の通り headless 環境固有で、実機横持ちでは発生しない。shouldResumeGame の追加は paused=false 時 従来通り resume を許可するため本事象の原因ではない（事前から存在）。検証時は明示 resume + time進行確認で対応。
- Phaser canvas へのDOM合成PointerEventは headless で届かないため、検証は GameObject への `emit('pointerdown')` と registry 経由（本番と同一経路）で実施。
