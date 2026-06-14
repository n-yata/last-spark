# タスクリスト: 強化時通常弾を「正面平行2発」に変更

## 背景・要求（シャビ指示）
RAY 強化時(stage6)の通常弾を、Y字の斜め2発（±π/10）ではなく、**正面へ平行に進む2発**にする。

## 設計
- `SHOT.splitAngleRad`（角度・rad）を廃止し、`SHOT.splitOffsetPx`（マズルからの上下オフセット・生px = 10）に置換。
- `Player.fire()`: 強化時の通常弾は、発射Y座標を `this.y ± splitOffsetPx` の2点にして、**両方とも velocityY=0**・`vx = dir*speed` で真っ直ぐ前方へ2発撃つ（cos/sin の角度計算を廃止）。非強化/チャージは従来どおり。
- オフセット 10px は、2発の間隔(20px)がプレイヤー機体(height=40)内に収まる控えめな値。

## タスク
- [x] `src/config/balance.ts`: `splitAngleRad` → `splitOffsetPx: 10`（コメントも実装に整合）
- [x] `src/entities/Player.ts`: `fire()` を平行2発化（Y±offset・vy=0）。empowered/setEmpowered のドキュメントコメント更新
- [x] `tests/unit/config/beamBalance.test.ts`: `splitAngleRad` 検証を `splitOffsetPx` 検証へ書き換え（ギュレル）。`splitOffsetPx*2 < PLAYER.height` 等の意味ある検証
- [x] 品質チェック: typecheck ✓ / lint ✓ / test 458 ✓ / build ✓
- [x] セキュリティレビュー（クルトワ・opus）: 全レベル指摘ゼロ・GO
- [x] 実機検証（Playwright ランタイム検査）:
  - 強化時通常弾 = 2発・y=430/450（プレイヤー440 から ±10）・両方 vy=0・vx=420 同一（=正面平行）
  - 非強化 = 単発・vy=0（回帰なし）
- [ ] コミット → push → PR → master へ Merge commit → feature ブランチ＆worktree 削除

## 振り返り
- 強化時通常弾の検証は `window.lastSpark` 経由のランタイム数値検査が確実（vy=0・vx同一・y差=2*offset で平行を断定）。
- ライブのボスステージ(stage6)で待機するとプレイヤーが死亡し GameScene が shutdown → group 参照が壊れるため、検証は発射直後に状態を読む。視覚スクショは死亡で不安定。
