# 設計: game-feel-stage-presentation-polish

要求: [requirements.md](./requirements.md)

## 方針

今回は「新システム追加」ではなく、既存の `Player` / `GameScene` / `EffectsManager` / tuning 定数を活かした
**横断的なゲームフィール改善**として実装する。変更は次の2本柱で進める。

1. 全ステージ共通の `Player` 操作感を、反応速度と気持ちよさ優先で再調整する
2. 全ステージ共通の戦闘演出を厚くし、特にボス戦の見せ場を一段強くする

既存のステージ構造・ボス構造・進行フローは維持し、体験の質だけを大きめに引き上げる。

## 変更詳細

### 1. `Player` の横移動・ジャンプ制御をブラッシュアップする

- 現状は `moveDir * moveSpeed` を即時適用しているため、入力反応は速い一方で「加速感」「抜け感」が薄い。
- `src/systems/playerMovement.ts` に、以下の純粋ロジックを追加して `Player.applyInput()` から使う。
  - 地上/空中で異なる加速・減速
  - 方向転換時の素早い切り返し
  - 上昇頂点付近のハングタイム
  - 落下時の重力強化と最大落下速度
- チューニング値は `src/config/balance.ts` の `PLAYER` に集約し、マジックナンバーを持ち込まない。

#### 期待する体験

- 止まりたい時に止まり、走りたい時に気持ちよく伸びる
- ジャンプの頂点付近で少しだけ「間」が生まれ、落下はだるくならない
- 全ステージ共通で、既存ギミックや梯子挙動を壊さずに気持ちよさを上げる

### 2. 着地・被弾・攻撃まわりの共通演出を強化する

- `src/systems/EffectsManager.ts` に、着地・被弾・強ヒット用の演出を追加する。
- `Player` から `player-landed` のようなイベントを通知し、`GameScene` 側でエフェクトを発火する。
- 追加する演出は以下を想定する。
  - 高所からの着地時のダストと小シェイク
  - プレイヤー被弾時の画面フラッシュ強化
  - チャージ攻撃/強いヒットの手応え強化

#### 責務分離

- `Player`: 物理状態の変化検知(着地した、強く落下した)までを担当
- `GameScene`: イベント購読と EffectsManager 呼び出し
- `EffectsManager`: 見た目とシェイクの実装

### 3. ボス戦演出を通常戦闘より一段強くする

- 既存の `bossIntro` / `bossPhaseShift` / `bossDeathSequence` は活かしつつ、演出の密度を上げる。
- 変更対象は `src/systems/EffectsManager.ts` を中心にし、`GameScene` 側は呼び出し責務を維持する。
- 主な強化点:
  - 登場時の画面帯・フラッシュの厚み
  - phase移行時のリング/フラッシュの強化
  - 撃破余韻の発光・シェイクの見直し

#### ねらい

- 通常戦闘と比べて、ボス戦に入った瞬間に空気が変わる
- phase移行や撃破で「節目」を強く感じられる
- ただし HUD や敵弾の視認性は壊さない

### 4. テストとドキュメント更新

- `tests/unit/systems/playerMovement.test.ts`
  - 新しい加速・減速・ジャンプ補助ロジックの境界を追加する
- `tests/integration/input/player-control.test.ts`
  - 入力から移動速度がどう変化するかの期待値を更新する
- `tests/unit/config/...` または `tests/unit/systems/...`
  - 新演出定数の不変条件を追加する
- `docs/functional-design.md`
  - 操作感ブラッシュアップと、着地/被弾/ボス演出強化の反映を行う

## 実装順

1. `design.md` / `tasklist.md` を作成して方針を固定する
2. `playerMovement.ts` / `balance.ts` / `Player.ts` で操作感改善を入れる
3. `EffectsManager.ts` / `effects.ts` / `GameScene.ts` で共通演出を強化する
4. unit / integration テストを更新する
5. `docs/functional-design.md` を同期する
6. lint / typecheck / test / build を通す
7. implementation-validator と security review を通す

## 検証

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

コミット前にクルトワ(security-engineer)のセキュリティレビューを必須とする。
