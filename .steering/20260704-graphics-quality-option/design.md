# 設計書

## アーキテクチャ概要

既存の「純関数 config + 永続化 persistence + UI ファクトリ + シーン適用」の流儀に沿って、
各層へ最小限の変更を積む。新規ファイルは作らない。

```
optionsMenu (ui)
  └─ タップで graphicsFx を巡回
      ├─ SaveManager.updateSettings({graphicsFx})   … 永続化
      └─ scene.registry.set('graphicsFx', mode)      … 実行中セッションへ通知
                                    │
GameScene                           ▼
  └─ applyPostFx(): settings.graphicsFx を読み
     resolveGraphicsQuality({webgl, dpr, mode}) で有効FXを決定
  └─ registry 'changedata-graphicsFx' を購読し、postFX.clear() → 再適用
```

## コンポーネント設計

### 1. `src/types/save.ts` — 型追加

**責務**:
- `export type GraphicsFxMode = 'auto' | 'high' | 'off'` を定義
- `GameSettings` に `graphicsFx: GraphicsFxMode` を追加(必須フィールド、既定 `'auto'`)

**実装の要点**:
- セーブ構造バージョンは**据え置き**。`vibration`(v6以下→true 補完)と同じ前例に従い、
  normalizeSettings の補完で吸収する(バージョンを上げると旧コードとの相互運用を壊すため)

### 2. `src/persistence/SaveManager.ts` — 既定値・検証・補完

**責務**:
- `defaultSettings()` に `graphicsFx: 'auto'` を追加
- `normalizeSettings()`: `graphicsFx` が未定義なら `'auto'` 補完、不正値なら settings 全体を
  `undefined`(既存フィールドの検証方針と同一: 任意フィールドは「無い」は許すが「壊れている」は弾く)
- `isValidSettings()`: 現行形式の完全性チェックに `graphicsFx` の値域チェックを追加

**実装の要点**:
- `isValidSettings` に必須条件として足すと、`graphicsFx` を持たない現行バージョンのセーブが
  invalid → migrate 経路に落ちる。migrate は現行 version を弾くため**進捗が初期化される**。
  これを避けるため、`isValidSettings` では `vibration` 型と同様に
  「undefined または正しい値」を許容し、normalizeSettings の補完に一本化する
  (bestRank と同じ「任意フィールド・バージョン据え置き」戦略)

### 3. `src/config/graphicsQuality.ts` — モード対応 + UI用ヘルパー

**責務**:
- `resolveGraphicsQuality(opts: { webgl: boolean; dpr: number; mode?: GraphicsFxMode })`
  - `webgl=false` → 常に全無効(最優先。postFX は WebGL 専用)
  - `mode='off'` → 全無効
  - `mode='high'` → 全有効(DPR 不問)
  - `mode='auto'` / 未指定 → 現行判定(bloom は dpr≦BLOOM_MAX_DPR)
- UI用の純関数ヘルパーを同居させる(difficultyLabel/toggleDifficulty の流儀):
  - `graphicsFxLabel(mode): string` → 'AUTO' | 'HIGH' | 'OFF'
  - `cycleGraphicsFx(mode): GraphicsFxMode` → auto→high→off→auto

**実装の要点**:
- Phaser 非依存の純関数を維持(vitest で直接検証)
- `mode` はオプショナル引数とし、既存呼び出しの互換を保つ

### 4. `src/ui/optionsMenu.ts` — ルートパネルへトグル追加

**責務**:
- ルートパネルの items に `エフェクト: ${graphicsFxLabel(...)}` を追加
  (BUSTER の次、音量設定の前)
- タップで `cycleGraphicsFx` → `save.updateSettings({graphicsFx})` →
  `scene.registry.set('graphicsFx', mode)` → `setPanel(buildRoot)` で再描画

**実装の要点**:
- MODE/BUSTER トグルと同じ「settings 更新 → 保存 → playTap → パネル再構築」パターンを踏襲
- registry 通知は「実行中の GameScene への即時反映」用。タイトルから変更した場合は
  GameScene が存在しないため、registry 値は次回 create 時には使わず、常に SaveManager から読む
  (registry は変更イベントの搬送路であり、正本はセーブデータ)

### 5. `src/scenes/GameScene.ts` — 適用と再適用

**責務**:
- `applyPostFx()`: SaveManager から `settings.graphicsFx` を読み、
  `resolveGraphicsQuality({webgl: true, dpr, mode})` に渡す
- `registry.events.on('changedata-graphicsFx')` を購読し、
  `cameras.main.postFX.clear()` → `applyPostFx()` で再構成
- SHUTDOWN 時にリスナーを解除(既存 RESIZE リスナーと同じ後始末パターン)

**実装の要点**:
- ポーズ中(シーン pause)でも registry イベントは届き、postFX の付け替え自体は可能。
  描画はレジューム時に反映される
- `postFX.clear()` は applyPostFx が積む3種のFXのみが対象(GameScene のメインカメラには
  他の常設 postFX を積んでいないことを確認済み。演出用 postFX が将来増えた場合は
  再適用方式の見直しが必要 → 将来の拡張性に記載)

## データフロー

### ポーズ中にモードを変更するケース
```
1. ユーザーがポーズ → オプション → 「エフェクト: AUTO」をタップ
2. optionsMenu: cycleGraphicsFx('auto') = 'high' → updateSettings で永続化
3. optionsMenu: registry.set('graphicsFx', 'high')
4. GameScene(paused): changedata-graphicsFx → postFX.clear() → applyPostFx()
5. applyPostFx: SaveManager から 'high' を読み、bloom 含む全FXを適用
6. ゲームに戻る → レジューム後の描画に反映
```

## エラーハンドリング戦略

- SaveManager の既存方針を踏襲: 破損セーブは既定値フォールバック、localStorage 例外は no-op。
  新規のエラークラスは追加しない
- 不正な graphicsFx 値は normalizeSettings で settings ごと弾き、migrate → 既定値の
  既存経路に乗せる

## テスト戦略

### ユニットテスト(vitest)
- `graphicsQuality`: mode 別の resolve 結果(off/high/auto/未指定/Canvas)、
  cycleGraphicsFx の巡回、graphicsFxLabel の表示(既存 spec があれば追記、なければ新設)
- `SaveManager`: graphicsFx なし現行セーブの読み込みで 'auto' 補完・進捗保持、
  不正値フォールバック、updateSettings({graphicsFx}) の保存

### 手動確認(実機/Playwright)
- タイトル/ポーズ両方のオプションにトグルが出る・巡回する
- ポーズ中変更→ゲームへ戻る→postFX 構成の変化(HIGH⇔OFF で見た目差を確認)
- リロード後も選択が保持される

## 依存ライブラリ

追加なし。

## ディレクトリ構造

```
src/
  types/save.ts               # GraphicsFxMode 追加、GameSettings.graphicsFx 追加
  persistence/SaveManager.ts  # defaultSettings / normalizeSettings / isValidSettings
  config/graphicsQuality.ts   # resolveGraphicsQuality(mode) / graphicsFxLabel / cycleGraphicsFx
  ui/optionsMenu.ts           # ルートパネルにトグル追加 + registry 通知
  scenes/GameScene.ts         # applyPostFx の mode 対応 + changedata 購読/解除
docs/
  functional-design.md        # オプション項目一覧に「エフェクト」を追記(記載があれば)
```

## 実装の順序

1. 型 + SaveManager(テスト先行: Red → Green)
2. graphicsQuality の mode 対応 + ヘルパー(テスト先行)
3. optionsMenu トグル + GameScene 配線
4. 手動確認 → docs 同期 → 品質チェック一式

## セキュリティ考慮事項

- localStorage 由来の値は normalizeSettings で値域検証してから使用(既存方針)
- 外部通信・秘匿情報なし

## パフォーマンス考慮事項

- HIGH は高密度端末でブルームのフィルレート負荷が掛かる。これはユーザーの明示的な
  選択によるトレードオフであり、既定(AUTO)の挙動は現行から変えない
- postFX.clear() → 再適用はモード変更時のみ(毎フレーム処理なし)

## 将来の拡張性

- GameScene のメインカメラへ常設 postFX を追加する変更が入る場合、`postFX.clear()` が
  それらも消すため、applyPostFx が積んだ FX ハンドルを保持して個別 remove する方式へ
  切り替えること
- 段階を増やす場合(例: MEDIUM)は GraphicsFxMode のユニオンと cycle/label/resolve に
  閉じて追加できる
