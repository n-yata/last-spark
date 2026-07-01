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

## フェーズ1: ジャンプ判定の純粋ロジック(コヨーテ + バッファ)

- [x] balance.ts に手触りパラメータを追加
  - [x] `PLAYER.coyoteMs: 100` を追加(コメントで意図を記載)
  - [x] `PLAYER.jumpBufferMs: 120` を追加(コメントで意図を記載)

- [x] playerMovement.ts に `resolveJumpStart` を追加
  - [x] 判定式の実装(接地 or コヨーテ猶予 / 着地時バッファ / isJumping 中は不可)
  - [x] JSDoc コメント(既存関数の流儀に合わせる)

- [x] playerMovement.test.ts にユニットテストを追加
  - [x] 接地中の立ち上がり入力で発動(従来挙動の回帰)
  - [x] コヨーテ: 猶予内で発動 / 猶予超過(境界値 coyoteMs ちょうど含む)で不発
  - [x] コヨーテ: isJumping 中は不発(二段ジャンプ防止)
  - [x] バッファ: 有効内の着地で発動 / 超過(境界値 jumpBufferMs ちょうど含む)で不発
  - [x] リセット済み(-Infinity)状態では発動しない

## フェーズ2: Player への組み込み

- [x] Player.ts にタイムスタンプ状態を追加
  - [x] `lastGroundedAt` / `jumpBufferedAt` フィールドの追加と毎フレーム更新
  - [x] `shouldJump` 呼び出しを `resolveJumpStart` へ置き換え
  - [x] ジャンプ発動時に両タイムスタンプをリセット(二重消費防止)
  - [x] 梯子把持中はコヨーテ・バッファをリセットし適用しない(離脱ジャンプ入力のバッファ二重記録も防止)

- [x] 既存挙動の非破壊を確認
  - [x] `tests/integration/input/player-control.test.ts` が全て通ることを確認(7件パス)

## フェーズ3: 触覚フィードバック

- [x] haptics.ts を新規作成
  - [x] 機能検出付きの vibrate ラッパー(非対応環境で no-op)
  - [x] `setEnabled` / `vibrateHit` / `vibrateBossDefeat` の実装

- [x] haptics.test.ts を新規作成
  - [x] vibrate モックで各パターンの呼び出しを検証
  - [x] setEnabled(false) で vibrate が呼ばれないことを検証
  - [x] navigator.vibrate 非対応環境で例外が出ないことを検証

- [x] 設定の追加と配線
  - [x] save.ts の `GameSettings` に `vibration: boolean` を追加
  - [x] SaveManager の既定値に `vibration: true` を追加(SAVE_VERSION 6→7、v6 からのマイグレーションで補完)
  - [x] SaveManager.test.ts に既定値補完のテストを追加(v6→v7 移行・不正値フォールバック・保存復元)
  - [x] optionsMenu.ts に振動 ON/OFF トグルを追加(変更時に haptics.setEnabled + 永続化、ON 切替時は試し振動)
  - [x] 起動時の設定読込箇所(BootScene)で haptics.setEnabled を呼ぶ
  - [x] GameSettings リテラルを持つ既存箇所(SoundManager 既定値・soundSynth.test.ts)へ vibration を補完

- [x] 発火点の配線
  - [x] Player.takeDamage の実被弾分岐で `vibrateHit()` を呼ぶ
  - [x] GameScene のボス撃破処理で `vibrateBossDefeat()` を呼ぶ

## フェーズ4: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`(632件パス)
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`
- [x] 動作確認(dev サーバー起動 + キーボード操作でコヨーテ/バッファの成立を確認)
  - 実測結果: 接地ジャンプ vy=-540 / コヨーテ猶予内ジャンプ成立 vy=-520 / 猶予超過は不発(落下継続→着地後も自動ジャンプなし) / 先行入力バッファは着地の瞬間に vy=-620 で自動発火 / 被弾で vibrate(40) 発火・無敵中被弾は発火なし

## フェーズ5: ドキュメント更新・振り返り

- [x] docs/functional-design.md のプレイヤー操作記述に手触り仕様(コヨーテ/バッファ/振動)を追記(GameSettings・セーブ v7・オプションメニューの記述も同期。docs/repository-structure.md の systems 一覧へ haptics.ts / resolveJumpStart も追記)
- [x] 実装後の振り返りを記録（別ファイル `retrospective.md` に記録 → モード3）

---

> **振り返りについて**: 実装後の振り返りはこのファイルではなく、同じディレクトリの
> `retrospective.md` に記録する（テンプレート: `.claude/skills/steering/templates/retrospective.md`）。
> 全タスクが `[x]` になったことを確認してから作成すること。
