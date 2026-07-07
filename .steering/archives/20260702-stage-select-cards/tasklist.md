# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 実装可能なタスクのみを計画
- 計画段階で「実装可能なタスク」のみをリストアップ
- 「将来やるかもしれないタスク」は含めない
- 「検討中のタスク」は含めない

### タスクスキップが許可される唯一のケース
以下の技術的理由に該当する場合のみスキップ可能:
- 実装方針の変更により、機能自体が不要になった
- アーキテクチャ変更により、別の実装方法に置き換わった
- 依存関係の変更により、タスクが実行不可能になった

スキップ時は必ず理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

### タスクが大きすぎる場合
- タスクを小さなサブタスクに分割
- 分割したサブタスクをこのファイルに追加
- サブタスクを1つずつ完了させる

---

## フェーズ1: 純粋ロジック(stageCards.ts)

- [x] stageCards.ts を新規作成
  - [x] `StageCardModel` 型定義(id / stageNo / name / cleared / bestTimeMs / locked)
  - [x] `isStageUnlocked(index, clearedStages, bestTimeMs)` 実装(bestTimeMs による周回互換の解放維持)
  - [x] `formatBestTime(ms)` 実装(`m:ss` 形式。設計時は m:ss.d としたが、既存 TitleScene/ClearScene の表示形式 m:ss との統一を優先して変更)
  - [x] `cardGridLayout(width, count, opts)` 実装(3列グリッドの矩形算出)
  - [x] `buildStageCardModels(save)` 実装

- [x] stages.ts に `stageName(id)` を公開(`PLAYABLE_STAGES` は互換維持)

- [x] stageCards.test.ts を新規作成(21件パス: 既存 stages.test.ts 含む)
  - [x] isStageUnlocked: 初回は stage1 のみ解放 / 順次解放 / 周回リセット後も bestTimeMs で解放維持
  - [x] formatBestTime: 0ms・秒未満・分跨ぎ・境界値・不正値防御
  - [x] cardGridLayout: 6枚が画面内に収まる・重ならない・狭い画面でも正寸法
  - [x] buildStageCardModels: SaveData から cleared/bestTime/locked が正しく引ける

## フェーズ2: カードグリッド描画(stageSelect.ts)

- [x] カード Container 生成関数の実装
  - [x] 角丸枠(Graphics)+ ホバー/押下の枠色変化
  - [x] ミニプレビュー: 空グラデーション帯(lerpColor 6帯)
  - [x] ミニプレビュー: シルエット列(generateSilhouetteColumns の縮小描画、奥→手前)
  - [x] ミニプレビュー: アクセント灯(固定位置・決定論)
  - [x] STAGE 番号・ステージ名テキスト
  - [x] CLEAR バッジ / BEST タイム表示
  - [x] LOCKED 暗転オーバーレイ(タップ無効)

- [x] openStageSelect のグリッド化
  - [x] SaveData 取得 → モデル構築 → cardGridLayout で配置
  - [x] 解放済みカードのタップ → destroyOverlay → onStartStage(従来導線の維持)
  - [x] BACK ボタンの配置(グリッド下)
  - [x] 高DPI規約(scaled/scaledFontPx)の適用

- [x] TitleScene / ClearScene の重複 formatTime を formatBestTime へ共通化(実装中に追加したタスク)

- [x] 既存回帰の確認
  - [x] tests/unit/stageSelect/stages.test.ts が通る(typecheck もOK)

## フェーズ3: 実機相当検証(Playwright)

- [x] 初回状態(セーブなし): stage1 のみ解放、2〜6 が LOCKED 表示(LOCKED×5・バッジ0を実測)
- [x] 進行状態(stage1-2 クリア + bestTime 注入): CLEAR×2・BEST 1:01/1:35・stage3 解放を実測
- [x] 周回状態(clearedStages 空 + bestTimeMs あり): CLEAR バッジ消滅・BEST 維持・stage3 まで解放を実測
- [x] LOCKED カードのタップでステージが開始されない(TitleScene に留まることを実測)
- [x] 解放カードのタップで該当ステージが開始される(stage1 → CutsceneScene 遷移を実測)
- [x] スクリーンショットでカードの見た目(6テーマの差別化)を確認(シルエットのカード右端はみ出しを発見・クリップ処理で修正)
- [x] モバイル相当の狭い画面(iPhone横持ち相当 667x375 / dpr=2 エミュレーション)でレイアウトが崩れない(テキスト境界の画面内判定・BEST と名前の重なり検査。プレビュー高 52%→46% に調整して重なり解消)

## フェーズ4: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`(648件パス)
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`(stageSelect の動的 import チャンク分離も維持)

## フェーズ5: ドキュメント更新・振り返り

- [x] ポーズメニューのステージ移動パネルにも同じ解放ルールを適用(実装中に追加したタスク: ロックの素通り経路を塞ぐ。未解放は [LOCKED] 非活性行。適用後に lint/typecheck/test 648件を再実行し全通過)
- [x] docs/functional-design.md のステージ選択記述をカード式へ更新(解放条件・ポーズ経路の共通ルールも明記)
- [x] docs/repository-structure.md に src/stageSelect/ セクションを新設(従来から記載漏れだったディレクトリ。stageCards.ts 含め3ファイルと依存関係を記載)
- [x] 実装後の振り返りを記録（別ファイル `retrospective.md` に記録 → モード3）

---

> **振り返りについて**: 実装後の振り返りはこのファイルではなく、同じディレクトリの
> `retrospective.md` に記録する（テンプレート: `.claude/skills/steering/templates/retrospective.md`）。
> 全タスクが `[x]` になったことを確認してから作成すること。
