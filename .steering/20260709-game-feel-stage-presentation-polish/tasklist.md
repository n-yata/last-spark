# タスクリスト: game-feel-stage-presentation-polish

要求: [requirements.md](./requirements.md)  
設計: [design.md](./design.md)

## 実装
- [x] `src/systems/playerMovement.ts` と `src/config/balance.ts` に移動・ジャンプの操作感ロジックと調整値を追加する
- [x] `src/entities/Player.ts` に新しい移動/ジャンプ処理を適用し、着地イベントを発火できるようにする
- [x] `src/config/effects.ts` と `src/systems/EffectsManager.ts` に着地・被弾・ボス演出の強化を追加する
- [x] `src/scenes/GameScene.ts` にプレイヤー着地/謎倉演出のフックを追加し、統合する

## テスト・ドキュメント
- [x] `tests/unit/systems/playerMovement.test.ts` と `tests/integration/input/player-control.test.ts` を更新する
- [x] 追加演出と配線を守る unit test を追加する
- [x] `docs/functional-design.md` を実装方針へ追従させる
- [x] `npm.cmd test` / `npm.cmd run lint` / `npm.cmd run typecheck` / `npm.cmd run build` を通す

## レビュー・振り返り
- [x] implementation-validator による実装観点レビューを通す
- [x] クルトワ(security-engineer) のセキュリティレビューを通す
- [x] `retrospective.md` を作成し、実装と次の改善余地を残す
