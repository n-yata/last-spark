# タスクリスト

## 1. 入力モデル（純粋ロジック）
- [x] `touchLayout.ts`: `JUMP_SWIPE_PX` 定数と `JumpSwipeState` / `initialJumpSwipe` / `stepJumpSwipe` を追加
- [x] `touchLayout.ts`: `isJumpSwipeHeld(upwardDelta)` ヘルパを追加（MovePad/判定共有用）
- [x] `touchLayout.ts`: `TouchLayout` から `jumpButton` を削除、`createTouchLayout` から生成を削除

## 2. InputController
- [x] `jumpButton` 由来の `onPointerDown` 分岐・`jumpPointerId` を削除
- [x] 移動ポインタの `onPointerMove` で上方向変位から `stepJumpSwipe` を実行し `jumpPressed`/`jumpHeld` を導出
- [x] `onPointerDown(移動)`/`onPointerUp(移動)`/`onGameOut` で jumpSwipe 状態を再アーム・`jumpHeld=false`
- [x] キーボード SPACE フォールバックが従来どおり動くことを確認

## 3. UI
- [x] `TouchControls`: JUMP ボタン円・ラベル・`JUMP_COLOR` を削除（右側 SHOT のみ）
- [x] `MovePad`: 上=ジャンプのシェブロンガイド＋しきい値到達時のスティックハイライトを追加

## 4. テスト更新
- [x] `touchLayout.test.ts`: `jumpButton` 依存を除去（`isInsideButton` は `shootButton` に）
- [x] `touchLayout.test.ts`: `JUMP_SWIPE_PX > MOVE_DEADZONE_PX` の不変条件を追加
- [x] `touchLayout.test.ts`: `stepJumpSwipe` のエッジ/保持/再アーム/再ジャンプを検証

## 5. 検証
- [x] `npm test` / `npm run lint` / `npm run typecheck` が全て通る（109 tests pass）
- [x] implementation-validator による品質検証（総合 5/5・Critical/High なし）

## 振り返り

**実装完了日**: 2026-06-09

**計画と実績の差分**:
- ほぼ計画どおり。実装中に「上スワイプのエッジ/再アーム判定」を Phaser 非依存の純粋関数 `stepJumpSwipe` として `touchLayout.ts` に切り出す方針を設計段階で確定でき、ユニットテストで一連の挙動（発火→保持→再アーム→再ジャンプ）を検証できた。
- implementation-validator の推奨に従い `initialJumpSwipe()` の初期状態アサーションを1件追加（テスト 108→109 件）。

**学んだこと**:
- ジャンプとチャージの「指の競合」は入力ロジックではなくUIレイアウト（両方を右親指に置いた配置）が根本原因だった。軸を分離（横=移動/上=ジャンプ）することで、既存の可変ジャンプ用 `jumpHeld` セマンティクスを変えずに導出元だけ差し替えられた。
- ジャンプ判定をステートマシン（held/armed）として純粋関数に閉じ込めたことで、Phaser 依存なしにエッジ挙動を完全にテストできた。

**次回への改善提案**:
- `onPointerMove` 内で描画用座標更新（moveCur）とゲームロジック更新（moveDir/jumpSwipe）が混在。将来肥大化したら `updateMoveState(pointer)` への分離を検討（validator 指摘）。
- 上スワイプしきい値 `JUMP_SWIPE_PX=48` は実機での手触り調整余地あり。横移動デッドゾーン(18)との兼ね合いは実機テストで再評価する。

**ドキュメント更新**:
- `docs/functional-design.md`（InputController責務・タッチUI図）、`docs/glossary.md`（ハイブリッド操作・仮想ボタン）、`docs/product-requirements.md`（機能5の受け入れ条件・タッチ操作仕様）を新仕様に追従更新。
