# 設計: ボス固有名の保持と表示

## 方針

ボス名は**ステージ固有のナラティブ属性**なので、`StageData`(`src/config/stages.ts`)に持たせる。
GameScene が既に `this.stage` を参照しているため、registry へ積む経路が最短。
表示経路は既存の HUD registry パターン(GameScene → registry → UIScene → UI部品)に揃える。

## 変更点

### 1. 型・データ: `src/config/stages.ts`
- `StageData` に `bossName: string`(必須)を追加。ステージ追加時に命名を強制する。
- STAGE1〜STAGE6 に固有名を設定:
  ウンブラ / コロナ / ヴェイル / ミアズマ / ヘラルド / ECLIPSE

### 2. registry キー: `src/config/registryKeys.ts`
- `HUD.bossName: 'hud.boss.name'` を追加。

### 3. 配線: `src/scenes/GameScene.ts`
- ボス出現時(`HUD.bossActive=true` を積む箇所)で `this.registry.set(HUD.bossName, this.stage.bossName)`。
- `initHud()` でも初期値として空文字をセット(未戦闘時の取りこぼし防止)。

### 4. UI: `src/ui/BossHpBar.ts`
- ハードコード `'まもりのきかい'` を撤去。
- `show(name: string)` で名前を受け取り、ラベルへ反映(`label.setText(name)`)。
- 初期テキストは空文字で生成。

### 5. UIScene: `src/scenes/UIScene.ts`
- ボス出現検知時に `this.bossHpBar.show(reg.get(HUD.bossName))` で名前を渡す。

## テスト

- `tests/unit/config/stages.test.ts`(新規 or 既存に追記):
  各ステージ(stage1〜6)の `bossName` が空でない固有名で、期待値と一致することを検証。
- `tests/unit/ui/bossHpBar.test.ts`(新規・軽量): `show(name)` 後にラベルテキストが name になることを検証。
  ※ Phaser 依存が重い場合は stages の検証に寄せる(過剰モックを避ける CLAUDE.md 方針)。

## 非対象

- HPバーのレイアウト・演出(フィル)は変更しない。
- ボスの強さ・AI・リグは変更しない(表示名のみ)。
- 類型名(守護機械 等)の併記はしない(固有名のみ表示しシンプルに保つ)。
