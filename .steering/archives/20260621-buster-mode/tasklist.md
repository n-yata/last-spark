# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: 設定の永続化

- [x] `src/types/save.ts` に `busterMode: boolean` を追加(コメント付き)
- [x] `src/config/storageKeys.ts` の `SAVE_VERSION` を 5 に更新し、v5 コメントを追記
- [x] `src/persistence/SaveManager.ts` を更新
  - [x] `defaultSettings()` に `busterMode: false` を追加
  - [x] `normalizeSettings()` で busterMode を検証・補完(boolean 以外は不正、未指定は false)
  - [x] `isValidSettings()` で現行版は busterMode が boolean 必須
  - [x] `migrate()` の v2/v3 ブロックを v4 まで拡張(busterMode 補完で進捗・難易度保持)

## フェーズ2: 強化判定とゲーム適用

- [x] `src/systems/empowerment.ts` を新規作成し `shouldEmpowerPlayer(stageId, busterMode)` を実装
- [x] `src/scenes/GameScene.ts` を更新
  - [x] `busterMode` フィールドを追加し `create()` で settings から読み込む
  - [x] `createPlayer()` の stage6 判定を `shouldEmpowerPlayer(...)` に置き換え、コメント更新

## フェーズ3: オプションUI

- [x] `src/ui/optionsMenu.ts` の `buildRoot` に `BUSTER: ON/OFF` トグルを追加(MODE の直後)

## フェーズ4: テスト

- [x] `tests/unit/persistence/SaveManager.test.ts` を更新
  - [x] `DEFAULT_SETTINGS` 定数に `busterMode: false` を追加
  - [x] v4 → v5 マイグレーション(busterMode 補完 + 進捗/難易度保持)テスト追加
  - [x] busterMode: true の保存・復元テスト追加
  - [x] busterMode が boolean 以外のセーブは既定値へフォールバックするテスト追加
- [x] `tests/unit/systems/empowerment.test.ts` を新規作成
  - [x] stage6 は busterMode=false でも強化される
  - [x] 非stage6 は busterMode に追従する(true/false)

## フェーズ5: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`(564 passed)
- [x] リントエラーがないことを確認
  - [x] `npm run lint`(エラーなし)
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`(GameSettings 必須化で SoundManager.ts / soundSynth.test.ts のリテラルを補完)
- [x] ビルドが成功することを確認
  - [x] `npm run build`(成功)

## フェーズ6: ドキュメント更新と振り返り

- [x] `.claude/README.md` 更新は不要(command/skill/agent の増減なし)であることを確認
- [x] 実装後の振り返りを `retrospective.md` に記録(モード3)

---

> **振り返りについて**: 実装後の振り返りはこのファイルではなく、同じディレクトリの
> `retrospective.md` に記録する。全タスクが `[x]` になったことを確認してから作成すること。
