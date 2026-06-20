# 設計書

## アーキテクチャ概要

エクリプス召喚雑魚だけを normal 相当にするため、召喚時の `Enemy` 生成とプレイヤー被ダメージ計算を分離する。

```
CoreBoss.summonMinions
  -> Enemy(..., ECLIPSE_SUMMON_MINION_TUNING, { playerDamageMultiplierOverride: 1 })
      -> HP は normal
      -> 接触ダメージと turret 弾は normal 倍率

CombatSystem
  -> Projectile / Enemy に override があれば global hard 倍率ではなく override を使う
```

## コンポーネント設計

### `balance.ts`

**責務**:
- エクリプス召喚雑魚専用のチューニング値を集中管理する。

**実装の要点**:
- `ECLIPSE_SUMMON_MINION_TUNING` は `NEUTRAL_STAGE_TUNING` と同じ値にする。
- `ECLIPSE_SUMMON_MINION_PLAYER_DAMAGE_MULTIPLIER` は `1` とする。

### `Enemy`

**責務**:
- 雑魚敵の HP、接触ダメージ、移動、turret 射撃を持つ。

**実装の要点**:
- 既定では従来どおり global hard 被ダメージ倍率を受ける。
- 召喚雑魚だけ `playerDamageMultiplierOverride` を持ち、接触と発射弾へ伝播する。

### `Projectile`

**責務**:
- 敵弾・プレイヤー弾のダメージ情報を保持する。

**実装の要点**:
- 発射オプションで `playerDamageMultiplierOverride` を受け取り、CombatSystem が参照できるようにする。
- 未指定時は従来どおり global 倍率を使う。

### `CombatSystem`

**責務**:
- プレイヤーへのダメージに難易度倍率を適用する。

**実装の要点**:
- `resolvePlayerDamage` の純粋関数で、global 倍率と source override のどちらを使うか決める。
- Enemy 接触と敵弾の両方で override を尊重する。

## テスト戦略

- `resolvePlayerDamage` が override 指定時に global hard 倍率を使わないことを検証する。
- エクリプス召喚雑魚用 config が normal 相当であることを検証する。
- 既存の hard 難易度テストにより、道中 hard 強化が維持されることを確認する。

## セキュリティ考慮事項

- 外部通信、URL、シークレット、認証情報の追加はない。

## パフォーマンス考慮事項

- 追加は数値プロパティ参照のみで、フレームごとの生成負荷や衝突数は増えない。
