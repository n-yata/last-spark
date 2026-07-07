# Design: Overall Polish

## Approach

軽量でリスクの低い描画・演出レイヤーを中心に磨く。ゲームルール、ステージ進行、セーブ形式には触れない。

## Planned Changes

1. HUD readability
   - ライフバー、ボス HP バー、チャージゲージに背景・アウトライン・発光の階層を足す
   - 数値や状態が小画面でも判別できるようにする

2. Combat feedback
   - 既存 EffectsManager / EFFECTS の範囲で、発射・ヒット・チャージ完了のフィードバックを調整する
   - 過剰な画面揺れや長い停止は避ける

3. Atmosphere
   - 背景描画にアクセントの発光線や遠景の霧を足し、ステージごとの差を強める
   - 描画は Graphics ベースのままにし、外部素材を追加しない

4. Verification
   - typecheck / lint / test / build
   - 可能ならローカル起動してブラウザで目視確認

## Non-Goals

- ストーリー文言の修正
- ステージ構造やボス AI の再設計
- 新しい永続データ項目の追加
- ネットワーク機能の追加
