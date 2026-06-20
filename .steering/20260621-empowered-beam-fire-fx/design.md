# 設計: 強化ビーム発射エフェクト

## 全体方針

既存の `player-fired`(通常弾/チャージ弾のマズルフラッシュ通知)と同型のイベント駆動で、
ビーム発射演出を追加する。演出の実体は `EffectsManager` に新メソッド `beamFire()` として集約し、
チューニング値は `EFFECTS.beamFire` に集約する。

```
Player.fireBeam()
  └─ this.scene.events.emit('player-beam-fired', muzzleX, muzzleY, dir)   ← 追加
GameScene.createSystems()
  └─ on('player-beam-fired', (mx,my,dir) => this.effects.beamFire(mx,my,dir))  ← 追加(SHUTDOWN で off)
EffectsManager.beamFire(x, y, dir)                                          ← 追加(本体)
```

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/config/effects.ts` | `EFFECTS.beamFire` チューニングブロックを追加 |
| `src/systems/EffectsManager.ts` | `beamFire(x, y, dir)` メソッドを追加 |
| `src/entities/Player.ts` | `fireBeam()` で `player-beam-fired` を emit |
| `src/scenes/GameScene.ts` | `player-beam-fired` リスナー登録(SHUTDOWN で解除) |
| `tests/unit/...` | `EFFECTS.beamFire` の値域・整合のユニットテスト |

## マズル座標について

`muzzleFlash` は `player-fired` で `(muzzleX, this.y, dir)` を通知している。
ビームの発射起点も同じ式(`muzzleX = this.x + dir*(PLAYER.width/2+6)`, `muzzleY = this.y`)。
`fireBeam()` 内でこの値を算出して emit する(`Beam.reposition()` と同じ式・既存の `fire()` と同じ)。

## `EffectsManager.beamFire(x, y, dir)` の演出構成

ビーム色基調(`0x9ffff0` シアン〜白)。すべて ADD ブレンド・ワールド座標・depth は muzzle と同じ 21。

1. **収束リング(予兆)**: `TEX.hit` の image をマズルに大きいスケールで置き、
   スケールを 0 付近へ縮め・alpha を 0 へ落とす短い tween(implode)。エネルギーが収束する予兆。
2. **マズル閃光(本体)**: `TEX.hit` の image をマズルに置き、`muzzleFlash` の charged より強い初期スケール。
   alpha 0・スケール拡大で抜く(`muzzleFlash` と同じ抜き方)。
3. **前方バースト**: `TEX.spark` の particles をマズルに置き、ビーム方向(baseAngle ± 広がり)へ explode。
   `muzzleFlash` より本数・速度を増やして「噴出」感を出す。
4. **カメラシェイク**: `EFFECTS.beamFire.shake`(吸収より強く、被弾より控えめ)。

後始末は `muzzleFlash`/`explode` と同様、tween は `onComplete` で destroy、
particles は `lifespan + cleanupMarginMs` の `delayedCall` で destroy(リーク防止)。

## `EFFECTS.beamFire` チューニング(初期値案)

```ts
beamFire: {
  /** ビーム色基調(シアン〜白)。Beam 本体の BEAM_COLOR と揃える。 */
  color: 0x9ffff0,
  /** マズル閃光(TEX.hit)の初期スケールと寿命。charged(1.4*1.8=2.52)より強い。 */
  flashScale: 3.0,
  flashMs: 150,
  /** 収束リング(implode)の開始スケールと尺。発射の予兆。 */
  ringScaleStart: 2.6,
  ringMs: 130,
  /** 前方バースト(TEX.spark)。muzzle(5発)より多く・速く。 */
  sparkCount: 14,
  sparkSpeedMin: 160,
  sparkSpeedMax: 420,
  sparkLifespanMs: 300,
  sparkSpreadDeg: 30,
  /** 発射の手応えシェイク。 */
  shake: { durationMs: 110, intensity: 0.007 },
},
```

## テスト方針

演出描画(tween/particles)は副作用が主で純ロジックが薄いため、ユニットテストは
**`EFFECTS.beamFire` のチューニング値が破綻していないこと**を検証する(既存 `beamBalance.test.ts` 等と同型):
- `flashScale` が通常チャージ弾の実効スケール(`muzzle.flashScale * muzzle.chargedScaleMul`)より大きい
  = 「最上位アクションが最も強い閃光」という要求の不変条件。
- `sparkCount` が `muzzle.sparkCount` より多い(噴出感)。
- 速度・寿命・尺が正(> 0)、`sparkSpeedMax >= sparkSpeedMin`。
- `shake.intensity` が吸収(absorb)より強く、被弾(playerDamage)以下(要求の手応え順序)。

実機ビジュアル検証は Playwright(force-jump で stage6 へ)で発射の見た目を確認する。
headless の制約(canvas 合成/向き判定 pause)に留意し、必要なら registry/emit 経由で発火する。

## リスク・留意点

- `player-beam-fired` リスナーをシーン再入で重複登録しないよう、`player-fired` と同様に
  SHUTDOWN で必ず `off` する。
- ビーム本体(Beam.fire)のフェードや当たり判定には触れない(演出のみ追加)。
- 強化が乗るのは stage6 のみ。検証は stage6 を対象にする。
