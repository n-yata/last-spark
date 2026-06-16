# タスクリスト: ボス固有名

- [x] story.md のボス設定表に固有名を反映(シャビ承認済み)
- [x] `StageData` に `bossName: string` を追加
- [x] STAGE1〜6 に固有名を設定
- [x] `HUD.bossName` registry キーを追加
- [x] GameScene: ボス出現時に `bossName` を registry へ積む / initHud で初期化
- [x] BossHpBar: ハードコード撤去、`show(name)` で名前を反映
- [x] UIScene: `show(name)` へ `HUD.bossName` を渡す
- [x] テスト追加(stages の bossName 検証 + HPバー表示)
- [x] lint / typecheck / test / build を全て通す(527 tests passed)
- [x] クルトワ(security-engineer)のセキュリティレビュー(Critical/High なし)
- [x] retrospective.md 作成 → コミット → push → PR → master マージ
