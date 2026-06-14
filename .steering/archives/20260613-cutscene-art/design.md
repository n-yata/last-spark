# 設計: カットシーン背景画像の本式化

## 設計方針

既存の画像アセット方式に**新規3枚を追加登録するだけ**で完結させる。演出ロジック(`CutsceneScene`)には一切手を入れない。背景描画は既に以下の分岐を持つため、`CUTSCENE_BACKGROUND` にキーが登録され、`PreloadScene` でテクスチャがロードされていれば、自動的に画像方式へ切り替わる:

```
private drawBackground(width, height) {
  const bgKey = CUTSCENE_BACKGROUND[this.scriptKey];
  if (bgKey && this.textures.exists(bgKey)) {  // 登録+ロード済み → 画像
    ...cover配置...
    return;
  }
  this.drawScene(width, height);               // 未登録 → 動的描画(現状)
}
```

つまり実装は「**アート(SVG)を描く** → **キー登録** → **プリロード**」の3点に閉じる。最も影響範囲が小さく、退行リスクが低い。

## アーキテクチャ

変更対象ファイルとデータフロー:

| ファイル | 変更内容 |
|---|---|
| `public/assets/cutscenes/stage4-intro.svg` | 新規(汚染地帯) |
| `public/assets/cutscenes/stage5-intro.svg` | 新規(ECLIPSE外縁部) |
| `public/assets/cutscenes/stage6-ending.svg` | 新規(エンディング・1枚絵) |
| `src/config/assetKeys.ts` | `CUTSCENE_TEX` に3キー追加、`CUTSCENE_BACKGROUND` に3マッピング追加 |
| `src/scenes/PreloadScene.ts` | 3枚を `load.svg(key, path, {width: GAME_WIDTH, height: GAME_HEIGHT})` |

データフロー(変更なし・確認用):
`PreloadScene.load.svg` → テクスチャ登録 → `GameScene`/クリア処理が `scene.launch(Cutscene, {scriptKey})` → `CutsceneScene.drawBackground` が `CUTSCENE_BACKGROUND[scriptKey]` を引き当て cover 配置。

## 主要コンポーネント

### SVG アート(3枚)

共通仕様(既存2枚に合わせる):
- `viewBox="0 0 960 540"`、`role="img"`、`<title>` と `<desc>`(情景の説明)を付与
- グラデーション(空/環境光)、シルエット(構造物・キャラ)、発光(RAY のシアンコア `#37f7d8`)、四隅のビネットで奥行きを出す
- RAY は冷色のシアン発光ロボット、TERRA は小柄な少女(暖色・肌 `#e8b89a` 系)。既存 `stage3-rescue.svg` のキャラ表現を参照
- 既存の `backgroundColor` と画調を整合させる

各枚の構図(スクリプト本文に準拠):

- **stage4-intro**(汚染地帯・TERRA同行): 緑がかった土気色(`#151a0c`)の淀んだ空気。朽ちた工場/汚染溜まり。RAY と並んで立つ TERRA が口元を押さえる(「空気が変。息が苦しい」)。毒気の霧・枯れた植生。RAY の発光だけが冷たく際立つ。
- **stage5-intro**(ECLIPSE外縁部・緊張): 青みがかった暗い鋼色(`#0c1119`)。密度の高い機械構造・パイプ・遠景に ECLIPSE の巨影/眼の光。TERRA は RAY の後ろに身を寄せる(「ここ、怖い。ECLIPSE が近い」)。冷たく硬質な金属の質感。
- **stage6-ending**(管理の解けた廃墟の外・苦い勝利): 基調は支配中枢の藍(`#06080f`)から**夜明けへ向かう微かな明度上げ**。崩れたバリケード・壁の落書き(争いの痕跡)。遠くに姿を見せ始める人間のシルエット。RAY と TERRA が並んで「管理されていない空」を見上げる後ろ姿。希望と喪失が同居するトーン(楽園ではない再生)。

### キー登録(`assetKeys.ts`)

```
export const CUTSCENE_TEX = {
  stage1Intro:  'tex-cutscene-stage1-intro',
  stage3Rescue: 'tex-cutscene-stage3-rescue',
  stage4Intro:  'tex-cutscene-stage4-intro',   // 追加
  stage5Intro:  'tex-cutscene-stage5-intro',   // 追加
  stage6Ending: 'tex-cutscene-stage6-ending',  // 追加
} as const;

export const CUTSCENE_BACKGROUND: Record<string, string> = {
  'stage1-intro':  CUTSCENE_TEX.stage1Intro,
  'stage3-rescue': CUTSCENE_TEX.stage3Rescue,
  'stage4-intro':  CUTSCENE_TEX.stage4Intro,    // 追加
  'stage5-intro':  CUTSCENE_TEX.stage5Intro,    // 追加
  'stage6-ending': CUTSCENE_TEX.stage6Ending,   // 追加
};
```

### プリロード(`PreloadScene.ts`)

既存2枚の `load.svg` 呼び出しに倣い、3枚を同じ論理解像度(`GAME_WIDTH`×`GAME_HEIGHT`)で追加ロードする。

## データモデル

型の変更なし。`CUTSCENE_BACKGROUND` は `Record<string, string>` のまま、`CUTSCENE_TEX` のキーが増えるのみ。

## 処理フロー

変更なし(上記データフロー参照)。背景キーの存在 → 画像、非存在 → 動的描画、という既存分岐に3キーを乗せるだけ。

## エラーハンドリング

- SVG パスの綴り違いは `load.svg` の 404 を招く。テクスチャ未登録時は `drawScene()` にフォールバックするため**ゲームは止まらない**が、意図通り画像が出ない。→ 起動スモークでネットワーク404とコンソールエラーを確認する。
- SVG の構文エラーはラスタライズ失敗を招く。→ ブラウザ起動で実描画を目視確認する。

## テスト方針

- **ユニット**: `tests/unit/config/` 配下に、`CUTSCENE_BACKGROUND` が `stage4-intro` / `stage5-intro` / `stage6-ending` を含むことを検証するテストを追加(または既存テストがあれば拡張)。`drawScene` フォールバックに依存するスクリプトが解消されたことを担保する。
- **既存テスト**: `cutscenes.test.ts` / `storyData.test.ts` が緑のままであること。
- **静的**: `npm run lint` / `npm run typecheck` / `npm run build`。
- **実機**: Playwright/ブラウザ起動でロード404・ランタイムエラーがないこと。カットシーンの実描画は可能な範囲で目視(Phaser canvas の自動操作制約は既知)。

## セキュリティ考慮事項

- ハードコーディング禁止事項に該当する要素(URL/シークレット/アカウント情報)はSVGアセット・登録コードに含めない。アセットは既存の相対パス(`assets/cutscenes/...`)ロードパターンに従う。
- コミット前にクルトワ(security-engineer)のレビューを実施(プロジェクト規約)。

## 代替案

- **案A(不採用): `stage6-ending` を場面ごとに複数枚へ背景切替** — 演出は豪華になるが `CutsceneScene` の行ごと背景指定の実装拡張と SVG 複数枚が必要で工数増。ユーザー決定により1枚絵を採用。
- **案B(不採用): 動的描画(`drawScene`)を作り込んで品質を上げる** — 既存の満足箇所が SVG 方式である以上、方式を揃える方が一貫性・保守性で勝る。SVG を採用。
