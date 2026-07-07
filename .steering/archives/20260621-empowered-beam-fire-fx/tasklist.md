# タスクリスト: 強化ビーム発射エフェクトの強化

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

- 全てのタスクを `[x]` にする
- 未完了タスク(`[ ]`)を残したまま作業を終了しない

---

## フェーズ1: 演出設定とロジック実装

- [x] `src/config/effects.ts` に `EFFECTS.beamFire` チューニングブロックを追加
- [x] `src/systems/EffectsManager.ts` に `beamFire(x, y, dir)` を実装
  - [x] 収束リング(implode)
  - [x] マズル閃光(本体)
  - [x] 前方バースト(spark explode)
  - [x] カメラシェイク
  - [x] emitter/image の後始末(destroy)
- [x] `src/entities/Player.ts` の `fireBeam()` で `player-beam-fired` を emit(マズル座標+dir)
- [x] `src/scenes/GameScene.ts` で `player-beam-fired` リスナー登録(SHUTDOWN で off)

## フェーズ2: テスト

- [x] `EFFECTS.beamFire` のチューニング値ユニットテストを追加
  - [x] flashScale が通常チャージ弾の実効スケールより大きい
  - [x] sparkCount が muzzle.sparkCount より多い
  - [x] 速度/寿命/尺が正・speedMax >= speedMin
  - [x] shake.intensity が absorb より強く playerDamage 以下

## フェーズ3: 品質チェックと修正

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`

## フェーズ4: 実機ビジュアル検証

- [x] stage6 で強化ビーム発射の演出を実機(Playwright)で確認
- [x] 既存の演出(通常弾/チャージ弾マズルフラッシュ)に悪影響がないこと

## フェーズ5: 仕上げ

- [x] クルトワ(security-engineer)によるセキュリティレビュー
- [x] 振り返りを `retrospective.md` に記録(モード3)

---

> 振り返りは `retrospective.md` に記録する。全タスクが `[x]` になってから作成する。
