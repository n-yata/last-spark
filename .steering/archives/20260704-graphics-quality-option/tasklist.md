# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### タスクスキップが許可される唯一のケース
技術的理由(実装方針変更・アーキテクチャ変更・依存関係変更)のみ。スキップ時は理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

---

## フェーズ1: 型とセーブ(テスト先行)

- [x] `src/types/save.ts`: `GraphicsFxMode` 型と `GameSettings.graphicsFx` を追加
- [x] SaveManager のテストを先に書く(Red)
  - [x] graphicsFx を持たない現行形式セーブが 'auto' 補完で読める(進捗保持)
  - [x] graphicsFx が不正値のセーブは既定値へフォールバック
  - [x] updateSettings({graphicsFx}) が保存される
- [x] `src/persistence/SaveManager.ts` を実装してテストを通す(Green)
  - [x] `defaultSettings()` に `graphicsFx: 'auto'`
  - [x] `normalizeSettings()` の補完と値域検証
  - [x] `isValidSettings()` は「undefined または正しい値」を許容(進捗初期化の回避)
    (補足: isValidSettings 自体は変更不要だった。normalizeSettings の値域検証が不正値を弾き、
    valid 判定を通ったデータには load() で normalizeSettings を通して補完する実装にした)

## フェーズ2: 画質判定ロジック(テスト先行)

- [x] graphicsQuality のテストを先に書く(Red)
  - [x] mode='off' で全FX無効
  - [x] mode='high' で WebGL 時に DPR 不問で全FX有効
  - [x] mode='auto' / 未指定は現行判定と同一
  - [x] webgl=false は mode に関わらず全FX無効
  - [x] cycleGraphicsFx の巡回(auto→high→off→auto)と graphicsFxLabel の表示
- [x] `src/config/graphicsQuality.ts` を実装してテストを通す(Green)
  - [x] `resolveGraphicsQuality` に `mode?: GraphicsFxMode` を追加
  - [x] `graphicsFxLabel` / `cycleGraphicsFx` を追加

## フェーズ3: UI とシーン配線

- [x] `src/ui/optionsMenu.ts`: ルートパネルに「エフェクト」トグルを追加
  - [x] cycle → updateSettings → registry.set → パネル再構築
    (registryKeys に SETTINGS グループを新設。SoundManager/soundSynth.test の
    GameSettings リテラルにも graphicsFx: 'auto' を追加)
- [x] `src/scenes/GameScene.ts`: applyPostFx の mode 対応
  - [x] SaveManager から graphicsFx を読んで resolve に渡す
  - [x] `changedata-graphicsFx` 購読で postFX.clear() → 再適用
    (reapplyPostFx では SaveManager を作り直して localStorage を読み直す。
    オプションメニュー側とはインスタンスが別なため)
  - [x] SHUTDOWN でリスナー解除

## フェーズ4: 動作確認

- [x] dev サーバーで実挙動を確認(Playwright)
  - [x] タイトルのオプションにトグルが表示・巡回する
    (pointerdown emit の本番経路で4回巡回: off→auto→high→off、ラベル・localStorage・registry 全一致)
  - [x] ポーズのオプションでも表示・巡回する
    (オプションメニューはタイトルと同一の共通実装(createOptionsMenu)であり、トグルは
    enableStageNav 分岐の外で常時表示されることをコードで確認。ゲーム中の変更反映は下記で実測)
  - [x] ポーズ中に変更→ゲームへ戻る→postFX 構成が変わる(HIGH⇔OFF)
    (GameScene 実行中に本番経路(localStorage 更新 + registry.set)で OFF→HIGH を切替、
    スクリーンショット比較でブルームのにじみ・ビネットの四隅の沈みを確認)
  - [x] リロード後も選択が保持される(リロード後のラベルが「エフェクト: OFF」)

## フェーズ5: 品質チェックとドキュメント

- [x] `docs/functional-design.md` のオプション項目記載を確認し、あれば「エフェクト」を追記
  (オプションメニュー節に項目追加 + パフォーマンス節「ポストFXの段階的有効化」を mode 対応へ更新)
- [x] すべてのテストが通ることを確認
  - [x] `npm test`(694件パス)
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`(PWA 生成含め成功)

## フェーズ6: 振り返り

- [x] 実装後の振り返りを記録（別ファイル `retrospective.md` に記録 → モード3）

---

> **振り返りについて**: 実装後の振り返りはこのファイルではなく、同じディレクトリの
> `retrospective.md` に記録する（テンプレート: `.claude/skills/steering/templates/retrospective.md`）。
> 全タスクが `[x]` になったことを確認してから作成すること。
