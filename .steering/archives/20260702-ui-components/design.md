# 設計書

## アーキテクチャ概要

既存の UI 部品の流儀(ファクトリ関数 + 設定オブジェクト。`menuButton.ts` / `optionsMenu.ts` と同型)を
踏襲し、`src/ui/neonButton.ts` に共通ボタンファクトリを新設する。見た目とヒットエリアは
Phaser の Container(角丸パネル Graphics + ラベル Text)で構成し、サイズ計算などの純ロジックは
Phaser 非依存の関数に分離してユニットテスト可能にする(`volumeSteps.ts` / `stageCards.ts` と同じ方針)。

```
neonButton.ts
├── computeButtonMetrics(labelW, labelH, style)  … 純関数(パディング/minWidth → パネル寸法)
├── NEON_BUTTON_COLORS                            … variant → 配色の対応表(純データ)
└── createNeonButton(scene, x, y, label, onClick, style)
      └── Container
          ├── Graphics(角丸パネル: 半透明フィル + グロー枠線)   ※ ghost では省略
          └── Text(ラベル: monospace + scaledFontPx)
      ← Container.setSize(w, h).setInteractive() でヒットエリア = パネル全面
```

## コンポーネント設計

### 1. createNeonButton(`src/ui/neonButton.ts`)

**責務**:
- パネル型/ゴースト型のインタラクティブなボタンを生成してシーンに追加し、Container を返す
- hover(増光)・押下(沈み込み + 発光フラッシュ)の視覚フィードバックを一元提供する

**API(案)**:
```ts
export type NeonButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';
export interface NeonButtonStyle {
  variant?: NeonButtonVariant; // 既定 'default'
  fontSize?: number;           // ベースpx。既定 20(scaledFontPx で換算)
  minWidth?: number;           // ベースpx。縦並びメニューの幅を揃える用(既定 0)
}
export interface NeonButton {
  readonly container: Phaser.GameObjects.Container;
  setLabel(text: string): void;   // 「MODE: EASY」等のトグル表示更新用
  setEnabled(enabled: boolean): void;
  destroy(): void;
}
export function createNeonButton(
  scene: Phaser.Scene, x: number, y: number, label: string,
  onClick: () => void, style?: NeonButtonStyle,
): NeonButton;
```

**実装の要点**:
- **応答性**: onClick は POINTER_DOWN で即時発火(現行踏襲。モバイルの体感を落とさない)。
  フィードバック tween は発火と並行して再生する(完了を待たない)
- **押下フィードバック**: scale 1 → 0.94 → 1(計 120ms 程度)+ 枠線 alpha を一瞬強める。
  シーン遷移で Container が破棄されても安全なよう、tween は対象破棄で自動停止される
  Phaser 標準の仕組みに乗せる(onComplete で destroy 済みオブジェクトに触らない)
- **配色**: 既存パレットに準拠(optionsMenu.ts の COLOR_* と ClearScene/GameOverScene の実色から採る)
  - default: ラベル #cfe9e2 / 枠 #37f7d8 系、hover で #fff27a
  - primary: ラベル #fff27a / 枠 #fff27a 系(主導線)
  - danger:  ラベル #ff9a8a / 枠 #ff9a8a 系、hover で #ffd27a(破壊的操作)
  - ghost:   パネル・枠なし。現行 makeMenuButton と同じ色規則 + 押下フィードバックのみ
- **高DPI**: パディング・角丸半径・枠線幅・fontSize・minWidth はすべて scaled()/scaledFontPx() 経由
- **ヒットエリア**: Container.setSize(パネル寸法).setInteractive()。Graphics には
  setInteractive しない(角丸外周のわずかな透過は許容し、判定は矩形で単純に保つ)
- **useHandCursor**: PC 向けに維持

### 2. computeButtonMetrics(純関数)

**責務**:
- ラベル実寸(text.width/height)とスタイル(fontSize, minWidth, variant)から
  パネル幅・高さ・パディングを決定する

**実装の要点**:
- `width = max(labelW + padX*2, minWidth)`、`height = labelH + padY*2` を基本とする
- 入力は「scaled 適用後の実寸」を受け取り、この関数自体は uiScale に依存しない
  (テストで dpr を意識せず検証できる)

### 3. 既存シーンへの適用(マイグレーション)

**置換対象と variant の割り当て**:

| 呼び出し箇所 | 現行 | 置換後 |
|---|---|---|
| optionsMenu: メニュー項目(MODE/BUSTER/音量設定/操作説明/ステージ移動/戻る) | makeMenuButton | パネル型 default(minWidth で幅を揃える)。「▶ ゲームに戻る」は primary |
| optionsMenu: 音量 ◂ ▸ / BACK / MUTE / しんどう | makeMenuButton | ◂ ▸ と BACK は ghost、MUTE/しんどう はパネル型 default |
| optionsMenu: 確認パネルの「はい」 | makeMenuButton(danger色) | パネル型 danger |
| optionsMenu: 確認パネルの「いいえ」 | makeMenuButton | パネル型 default |
| stageSelect(makeMenuButton 利用箇所) | makeMenuButton | 実装確認のうえ同様に置換(カード本体は対象外) |
| GameOverScene: RETRY / TITLE | 即席 makeButton | パネル型 primary / default |
| ClearScene: 周回2択 | text + 広域 zone | パネル型 primary / default(minWidth 大きめ。既存 zone は撤去し、ボタン自体の判定に一本化) |
| TitleScene: ⚙ OPTIONS | ベタ書き text | ghost(左下の控えめな位置づけを維持) |

- `menuButton.ts` は全置換完了後に削除する(2系統併存を残さない)
- ClearScene の「TAP TO CONTINUE」/ TitleScene の「TAP TO START」は
  ボタンではなく全画面タップの点滅プロンプトなので対象外(現状維持)

## データフロー

### ボタン押下(パネル型)
```
1. POINTER_DOWN → onClick を即時呼び出し(効果音・遷移は呼び出し側の責務)
2. 同時に押下 tween(scale 0.94 + 枠フラッシュ)を再生
3. POINTER_OVER/OUT → 枠・ラベルの増光/復帰(hover は PC のみ発生)
```

### ClearScene 周回2択のキーボード既定操作
```
現行: keydown → nextLoopZone.emit(POINTER_DOWN)
置換後: keydown → 「次の周回へ進む」ボタンの onClick を直接呼ぶ
(emit 依存をやめ、NeonButton の公開 API 経由にする)
```

## エラーハンドリング戦略

- ボタンは表示部品のみでエラー分岐を持たない。onClick 内の例外は呼び出し側の責務(現行踏襲)
- setEnabled(false) 中は disableInteractive + 減光し、多重遷移(連打)対策は
  従来どおり遷移側(transitionTo / once)に委ねる

## テスト戦略

### ユニットテスト(`tests/unit/ui/neonButton.test.ts`)
- computeButtonMetrics: パディング加算・minWidth 下限・ラベル寸法反映(境界値含む)
- NEON_BUTTON_COLORS: 全 variant に必要キー(label/labelHover/frame/fill)が揃っている
- ※ Phaser 依存の描画・tween はユニットテストでは扱わない(既存方針と同じ)

### e2e / ビジュアル確認
- 既存 e2e がそのまま回帰テストになる:
  - `options/difficulty-options.spec.ts`(OPTIONS を開き MODE をトグル=ボタン実クリック経路)
  - `title-to-clear` / `boss-damage` / orientation 系(タップ判定の一致)
- Playwright で Title / OPTIONS / GameOver / Clear を開いた要素スクリーンショットを取り、
  パネル描画・崩れの有無を目視確認する(dpr=1 / dpr=2 両方。前作業の申し送り)
- 既知の失敗2件(play-through/full-playthrough, stage-progression-guard の再起動ガード)は
  master でも落ちる別課題のため、判定から除外する

## 依存ライブラリ

追加なし(Phaser 標準機能のみ)。

## ディレクトリ構造

```
src/ui/
├── neonButton.ts        (新規: 共通ボタン)
├── menuButton.ts        (削除)
├── optionsMenu.ts       (変更: NeonButton へ置換)
├── ...
src/scenes/
├── TitleScene.ts        (変更: OPTIONS ボタン置換)
├── GameOverScene.ts     (変更: makeButton 削除・置換)
├── ClearScene.ts        (変更: 周回2択を置換)
src/stageSelect/
├── stageSelect.ts       (変更: makeMenuButton 利用箇所を置換)
tests/unit/ui/
├── neonButton.test.ts   (新規)
```

## 実装の順序

1. neonButton.ts(純関数 + ファクトリ)とユニットテスト
2. optionsMenu.ts / stageSelect の置換 → menuButton.ts 削除
3. GameOverScene / ClearScene / TitleScene の置換
4. 品質チェック(lint / typecheck / test / build / e2e)+ ビジュアル確認(dpr=1/2)
5. docs 同期確認(functional-design / repository-structure に UI 部品の記載があれば追従)

## セキュリティ考慮事項

- 外部入力・URL・シークレットを扱わない表示部品のみ。コミット前にクルトワのレビューを実施(通常運用)

## パフォーマンス考慮事項

- パネルは Graphics の静的描画(毎フレーム再描画なし)。tween は押下時のみの短時間再生で
  60fps 目標(モバイル)に影響しない
- ボタン数は最大でもオプション画面の10個程度。オブジェクト数増(Text 1個 → Container+Graphics+Text)は無視できる規模

## 将来の拡張性

- リザルト画面リッチ化・タイトル格上げ(今回スコープ外の候補)でも同じ部品を使う前提の API にする
  (setLabel / setEnabled / variant で大半のメニュー UI を賄える)
- プレイ中 HUD へ広げる場合は、操作系(TouchControls)との干渉を検証してから別作業で行う
