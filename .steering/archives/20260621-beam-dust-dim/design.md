# 設計書

## アーキテクチャ概要

既存の Beam(多層発光)構造を踏襲し、(1) `effects.beam` のアルファ値調整と
(2) `Beam` への光の粉エミッター追加の2点を局所変更する。新規アーキテクチャは導入しない。

## コンポーネント設計

### 1. 明度の低減(`src/config/effects.ts`)

`effects.beam` のピークアルファを下げる(ADD 合成で重なるため、アルファ低減が明度低減に直結):
- `coreAlpha`: 1.0 → 0.7(純白コアが最も眩しいので最優先で下げる)
- `bodyAlpha`: 0.85 → 0.5
- `glowAlpha`: 0.35 → 0.2

不変条件は維持: `coreAlpha(0.7) >= bodyAlpha(0.5) > glowAlpha(0.2)`、すべて (0,1)。
色定数(`color`/`coreColor`)は変えない(明度はアルファで調整)。

### 2. 光の粉エミッター(`src/entities/Beam.ts` + `effects.beam` に設定追加)

**方針**: Beam が `Phaser.GameObjects.Particles.ParticleEmitter` を1つ所有する。
- テクスチャ: `TEX.spark`(既存のスパーク粒子。muzzle/beamFire と同じ)。
- emitZone: ビーム軸に沿った矩形(中心相対、`-beamLength/2..+beamLength/2` × `±beamThickness*spread/2`)
  からランダムに発生 → 帯全体の周囲に粉が湧く。
- 動き: 低速で全方向(angle 0–360)に少し散り、scale/alpha を 0 へフェード → ふわっと舞って消える。
- blendMode ADD、tint = ビーム色、depth=17(コア16の手前)。
- ライフサイクル: `emitting:false` で生成し `fire()` で `start()`。`reposition()` で
  エミッター位置をビーム中心へ追従(既出粒子は自走、新規粒子が新位置から湧く=軸に沿う流れ)。
- 解放: `destroy()` で `dust.destroy()`。

**`effects.beam` に追加する設定**:
```
dustFrequencyMs, dustQuantity, dustLifespanMs,
dustSpeedMin, dustSpeedMax, dustScaleStart, dustAlphaStart, dustSpreadYMul
```

## データフロー(光の粉)
```
Player.fireBeam → new Beam → createLayers(glow/core/dust 生成, dust は emitting:false)
  → beam.fire(owner) → dust.start() + reposition()
  → 毎フレーム onUpdate → reposition(): dust.setPosition(cx, owner.y)
  → 寿命到達 → destroy(): dust.destroy() ほか解放
```

## テスト戦略

### ユニットテスト(`tests/unit/config/beamFireFx.test.ts`)
- 明度: 各レイヤーのピークアルファが 1 未満(眩しさ抑制)かつ順序維持(core≥body>glow)。
- 光の粉: dust 設定が妥当(frequency/lifespan/速度範囲/スケール・アルファ範囲/spread が正、速度 min<=max)。

### 実機ビジュアル確認
- Playwright 直起動でビーム発射 → エミッターが存在し粒子が出ていること、明度が落ちたことをスクショで確認。
- 当たり判定 900×22 が不変であることを数値で再確認。

## セキュリティ/パフォーマンス
- 入力・永続化・ネットワークに非接触。描画のみ。
- 粒子は frequency で密度を抑制、ビーム破棄でエミッターを destroy。リーク・過負荷を防ぐ。
