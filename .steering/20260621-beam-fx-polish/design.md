# 設計書

## アーキテクチャ概要

既存構造を踏襲。演出値は `config/effects.ts`、バランス値は `config/balance.ts` に集約する方針を維持。
ビーム描画(`entities/Beam.ts`)・発射演出(`systems/EffectsManager.ts`)・シールド解決
(`systems/combatRules.ts` の値は `balance.ts`)の3点を局所的に変更する。

## コンポーネント設計

### 1. カメラ揺れの廃止

**対象**: `src/systems/EffectsManager.ts` `beamFire()`、`src/config/effects.ts` `EFFECTS.beamFire`
**変更**:
- `beamFire()` 末尾の `this.scene.cameras.main.shake(...)` を削除。
- `EFFECTS.beamFire.shake` 設定を削除(未使用化による dead config を残さない)。
- `tests/unit/config/beamFireFx.test.ts` の shake 序列テストを削除。

### 2. ビーム帯の多層発光化

**対象**: `src/entities/Beam.ts`、`src/config/effects.ts`(描画パラメータを追加)
**方針**:
- 当たり判定 + 基準描画は現状の `Beam`(`Phaser.GameObjects.Rectangle`、Arcade body 付き)を維持。
  サイズ(`beamLength`×`beamThickness`)・座標・body は一切変えない。
- 装飾レイヤーを「物理を持たない `scene.add.rectangle`」として Beam が所有する:
  - **グロー(glow)**: 太さ `beamThickness × glowThicknessMul`、低アルファ、depth=14(本体の奥)。
  - **コア(core)**: 太さ `beamThickness × coreThicknessMul`、白く明るい、depth=16(本体の手前)。
- 追従: `reposition()` で glow/core を本体と同じ中心座標へ同期。
- フェード: 本体の既存フェード(in/out)に合わせ、glow/core も同尺のフェード tween を持つ
  (ピークアルファはレイヤーごとに設定値から)。
- 脈動(エネルギー感): core の `scaleY` を `corePulseMin↔corePulseMax` で yoyo ループ、
  glow は `alpha` をゆっくり明滅させる。生命感のある光の帯にする。
- 破棄: `destroy()` で glow/core/脈動 tween を確実に解放(リーク防止)。

**effects.ts に追加する `beam` ブロック(描画専用)**:
```
beam: {
  color, coreColor,
  glowThicknessMul, coreThicknessMul,
  bodyAlpha, glowAlpha, coreAlpha,
  fadeMs,
  corePulseMs, corePulseMin, corePulseMax,
  glowPulseMs, glowPulseAlphaMin,
}
```

### 3. バリア破り強化

**対象**: `src/config/balance.ts` `BOSS_SHIELD.beamDamage`
**変更**: `1 → 5`(= `chargedDamage`)。コメントも更新。
- シールド HP=8。ビームは1発射で最大3tick(t=0/300/600)。per-tick 5 なら 8→3→0 と
  **2tick(300ms 命中)でバリア破壊** → チャージ(2発)以下の手間で割れる=上位互換。
- 本体ダメージ経路(`SHOT.beamDamage=3`)は不変。シールド貫通力のみ強化。

## データフロー(バリア破り)
```
Beam overlap → CombatSystem.hitDamageable(boss, SHOT.beamDamage, ..., 'beam')
  → resolveBossShieldHit({shieldHp, hpDamage: 3, hitKind:'beam'})
    → shieldDamageForHit('beam') = BOSS_SHIELD.beamDamage(=5)
```

## テスト戦略

### ユニットテスト
- `combatRules.test.ts`: ビーム命中のシールドダメージが新値(=5、chargedと同等)であること、
  1発射の最大tick数(3)でバリア(maxHp)を破壊できること(`ceil(maxHp / beamDamage) <= 3`)を追加。
- `beamFireFx.test.ts`: shake 関連テストを削除。残りの演出不変条件は維持。
- ビーム帯の描画レイヤー設定(effects.beam)の妥当性テストを追加(太さ倍率の大小関係・アルファ範囲)。

### 実機ビジュアル確認
- Playwright 直起動でビームを発射し、多層発光・脈動が描画され、カメラが揺れないことを確認。
- バリア破りはユニットテストで担保(実機での厳密検証は困難なため数値で固定)。

## セキュリティ考慮事項
- 入力・永続化・ネットワークに触れない純粋な描画/数値変更。新規の機密・URL混入なし。

## パフォーマンス考慮事項
- ビーム1本につき装飾2枚(glow/core)+ tween 数本の増加のみ。ビームは同時に1本程度で軽微。
  destroy で確実に解放しリークを防ぐ。
