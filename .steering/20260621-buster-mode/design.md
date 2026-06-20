# 設計書

## アーキテクチャ概要

既存の「設定 → 永続化(SaveManager/localStorage) → GameScene が読み込んで適用」フローに乗せる。
難易度(`difficulty`)と同じレールに `busterMode: boolean` を1本追加する形で、新規アーキテクチャは導入しない。

```
[optionsMenu] --toggle--> SaveManager.updateSettings({busterMode}) --> localStorage(v5)
                                                                          |
[GameScene.create] <-- getData().settings.busterMode --------------------+
        |
        v
[GameScene.createPlayer] -- shouldEmpowerPlayer(stageId, busterMode) --> player.setEmpowered(true/false)
```

## コンポーネント設計

### 1. 型定義 (`src/types/save.ts`)

**責務**:
- `GameSettings` に `busterMode: boolean` を追加。

**実装の要点**:
- difficulty と並べてコメント付きで定義。既定は false。

### 2. セーブバージョン (`src/config/storageKeys.ts`)

**責務**:
- `SAVE_VERSION` を 4 → 5 に更新し、v5 の変更内容をコメントで記録。

**実装の要点**:
- v4 → v5 は busterMode を false 補完して移行する旨を明記。

### 3. 永続化 (`src/persistence/SaveManager.ts`)

**責務**:
- 既定値・バリデーション・マイグレーションに busterMode を組み込む。

**実装の要点**:
- `defaultSettings()` に `busterMode: false` を追加。
- `normalizeSettings()`: `busterMode` が `undefined` でも boolean 以外なら不正扱いし、
  正常時は `busterMode: s.busterMode ?? false` で補完する(旧セーブ移行の要)。
- `isValidSettings()`: 現行版は busterMode が boolean であることを必須にする
  (これにより v4 セーブは `isValidSaveData` で false になり migrate へ流れる)。
- `migrate()`: v2/v3 ブロックの条件を `d.version === 2 || d.version === 3 || d.version === 4` に拡張。
  normalizeSettings が busterMode を補完するため、v4(difficulty あり/busterMode なし)も同じ経路で
  進捗・難易度を保ったまま移行できる。

### 4. 強化判定 (`src/systems/empowerment.ts` 新規)

**責務**:
- 「このステージで RAY を強化すべきか」を純粋関数で判定する。

**実装の要点**:
- `shouldEmpowerPlayer(stageId: string, busterMode: boolean): boolean`
  → `return stageId === 'stage6' || busterMode;`
- Phaser 非依存の純粋関数とし、単体テスト可能にする。stage6 の固有強化仕様を関数として固定する。

### 5. オプションUI (`src/ui/optionsMenu.ts`)

**責務**:
- ルートメニューに `BUSTER: ON/OFF` トグルを追加する。

**実装の要点**:
- `buildRoot` の items 配列で `MODE` の直後に挿入。MUTE トグルと同じパターン:
  ```ts
  [`BUSTER: ${settings.busterMode ? 'ON' : 'OFF'}`, () => {
    settings = { ...settings, busterMode: !settings.busterMode };
    save.updateSettings({ busterMode: settings.busterMode });
    playTap();
    setPanel(buildRoot);
  }],
  ```

### 6. ゲーム適用 (`src/scenes/GameScene.ts`)

**責務**:
- 設定から busterMode を読み込み、createPlayer で強化判定に使う。

**実装の要点**:
- `create()` の difficulty 読み込み付近で `this.busterMode = this.saveManager.getData().settings.busterMode;`
  (専用フィールドを追加)。
- `createPlayer()` の `if (this.stageId === 'stage6')` を
  `if (shouldEmpowerPlayer(this.stageId, this.busterMode))` に置き換え。コメントも更新。

## データフロー

### バスターモードを ON にして全ステージで強化バスターを撃つ
```
1. オプションメニューで BUSTER をタップ → settings.busterMode = true
2. SaveManager.updateSettings({busterMode:true}) で localStorage(v5) に保存
3. ステージ開始 → GameScene.create() が settings.busterMode を読み込む
4. createPlayer() で shouldEmpowerPlayer(stageId, true) === true → player.setEmpowered(true)
5. 全ステージで通常弾2発化 + チャージビームが有効
```

## エラーハンドリング戦略

- セーブ移行/破損は既存方針を踏襲: throw せず既定値へフォールバック(プレイ継続最優先)。
- busterMode の不正値(boolean 以外)は normalizeSettings で弾き、移行不能なら defaultSaveData へ。

## テスト戦略

### ユニットテスト
- `SaveManager.test.ts`:
  - `DEFAULT_SETTINGS` 定数に `busterMode: false` を追加(既存の toEqual 比較を維持)。
  - v4 → v5 マイグレーション: busterMode 補完 + 進捗/難易度保持を検証。
  - busterMode: true の保存・復元。
  - busterMode が boolean 以外のセーブは既定値へフォールバック。
- `empowerment.test.ts`(新規):
  - stage6 は busterMode=false でも true。
  - 非stage6 は busterMode に追従(true/false)。

### 統合テスト
- 既存の damage-flow / player-control に影響がないこと(回帰確認は npm test 全体で担保)。

## 依存ライブラリ

新規追加なし。

## ディレクトリ構造

```
src/
  types/save.ts            (変更: busterMode 追加)
  config/storageKeys.ts    (変更: SAVE_VERSION 5)
  persistence/SaveManager.ts (変更: 既定値/検証/移行)
  systems/empowerment.ts   (新規: shouldEmpowerPlayer)
  ui/optionsMenu.ts        (変更: BUSTER トグル)
  scenes/GameScene.ts      (変更: busterMode 読込 + 強化判定)
tests/unit/
  persistence/SaveManager.test.ts (変更: 定数更新 + 移行/保存テスト追加)
  systems/empowerment.test.ts     (新規)
```

## 実装の順序

1. 型(`save.ts`)→ バージョン(`storageKeys.ts`)→ 永続化(`SaveManager.ts`)
2. 強化判定純粋関数(`empowerment.ts`)
3. GameScene 適用(`GameScene.ts`)
4. オプションUI(`optionsMenu.ts`)
5. テスト(SaveManager 更新 + empowerment 新規)
6. 品質チェック(test/lint/typecheck/build)

## セキュリティ考慮事項

- 入力は localStorage のみ。busterMode は boolean 厳格検証で改ざん/破損に耐える(進行不能化しない)。
- ハードコードされた URL/シークレットの新規追加なし。

## パフォーマンス考慮事項

- 判定は起動時1回の純粋関数評価のみ。ランタイム負荷なし。

## 将来の拡張性

- `shouldEmpowerPlayer` に判定を集約したため、将来「特定ステージのみ強化」等の拡張も
  この関数の変更だけで対応できる。
