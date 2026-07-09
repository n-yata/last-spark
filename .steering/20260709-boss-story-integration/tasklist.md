# タスクリスト: boss-story-integration

要求: [requirements.md](./requirements.md)  
設計: [design.md](./design.md)

## 実装

- [x] `stage3` 向け containment ギミックの設定・AI・一時拘束フィールド生成を実装する
- [x] `stage6` 向け exposed window の状態管理とダメージ制御を実装する
- [x] `stage3〜stage6` のボス登場 / phase移行 / 撃破余韻演出を実装する
- [x] ボス演出に必要な `Boss` / `GameScene` / `EffectsManager` の責務分離を整理する

## テスト・ドキュメント

- [x] 追加仕様に対応する unit test を更新・追加する
- [x] `docs/functional-design.md` と `docs/glossary.md` を実装内容へ同期する
- [x] `npm test` / `npm run typecheck` / `npm run build` を通す

## 振り返り

- [x] `retrospective.md` を作成し、計画との差分と次回への申し送りを残す
