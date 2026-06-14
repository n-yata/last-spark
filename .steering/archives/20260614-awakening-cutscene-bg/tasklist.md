# タスクリスト: stage5-awakening カットシーンの背景画像を追加

## 背景・要求（シャビ指示）
「ステージ6開始時のカットインの背景画像を改善してほしい。他のカットインと全然作りが違う。」

## 調査で判明したこと
- カットシーン背景は `CUTSCENE_BACKGROUND[scriptKey]` でテクスチャを引き、未ロードなら `CutsceneScene.drawScene()` の簡易シルエットにフォールバックする。
- 背景SVGは stage1-intro / stage3-rescue / stage4-intro / stage5-intro / stage6-ending の5本のみ存在。
- **stage5-awakening（stage5ボス撃破→stage6への橋渡し演出。プレイヤー体感では「ステージ6開始時」）だけ背景SVGが無く、シルエットのフォールバックになっていた** = 「全然作りが違う」の正体。
- stage6 は introCutsceneKey を持たない（開始演出なし）。「stage6開始時の演出」の実体は stage5-awakening。

## 対応
- [x] `public/assets/cutscenes/stage5-awakening.svg` を新規作成。既存SVGと同画風（960x540・lift フィルタ slope1.32/intercept0.075・冷鋼の ECLIPSE外縁部・RAYシアン/TERRA暖色・ビネット）。構図: 朽ちた休眠コア（RAYと同種の機械＝説明せず匂わせる）が目覚め、最後の光がレイの胸のコアへ流れ込む。傍らで TERRA が見守る。story.md 厳守（科学者を出さない）。
- [x] `src/config/assetKeys.ts`: `CUTSCENE_TEX.stage5Awakening` と `CUTSCENE_BACKGROUND['stage5-awakening']` を追加
- [x] `src/scenes/PreloadScene.ts`: `load.svg` で新SVGを読み込むブロックを追加
- [x] 品質チェック: typecheck ✓ / lint ✓ / test 459 ✓ / build ✓（precache 21→23 で新SVG取込確認）
- [x] セキュリティレビュー（クルトワ・opus）: 全レベル指摘ゼロ・GO（SVGのXSS/外部参照ベクタなし）
- [x] 実機検証（Playwright）: テクスチャ存在・背景が実Image（フォールバックのシルエットでない）・新背景が正しく描画されることをスクショで確認
- [ ] コミット → push → PR → master へ Merge commit → feature ブランチ＆worktree 削除

## 注意・申し送り
- 並行 worktree `last-spark-stage6-awakening`（branch feature/stage6-awakening）が存在。master との差分はゼロ（コミットなし）だったが、名前が示すとおり stage6演出周りで別セッションが作業する可能性がある。コンフリクトに留意。
