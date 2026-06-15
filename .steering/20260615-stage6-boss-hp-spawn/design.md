# 設計: stage6 ラスボス HP増強 + 召喚位置の安全化

## 変更詳細

### 1. `src/config/balance.ts`
- `ECLIPSE_CORE.maxHp` 56→64(控えめな増強。覚醒RAYで溶けない範囲を維持)。
- `CoreBossConfig` に `summonSafeRadius` / `summonSpacing` を追加。
- `ECLIPSE_CORE`: `summonSafeRadius: 140` / `summonSpacing: 120`。
  - safeRadius=140: プレイヤー半幅(14)+配下半幅(16)で本体非重複を満たし、さらに
    無敵時間(800ms)・移動速度(160px/s)で離脱できる余裕を持たせた距離。

### 2. `src/systems/coreSummon.ts`(新規・Phaser 非依存の純粋ロジック)
- `computeSummonXs(playerX, count, arenaMinX, arenaMaxX, safeRadius, spacing): number[]`
- 偶数番=右/奇数番=左へ交互配置。同じ側は rank*spacing で外側へ。
- アリーナ端で clamp 後に safeRadius を割ったら反対側へ折り返す。
- 自前 clamp で Phaser 依存を排し、テスト可能にする。

### 3. `src/entities/CoreBoss.ts`
- `summonMinions` の旧 offset 計算を `computeSummonXs` 呼び出しへ置換。
- 上限ガード(activeMinions/spawnable/count クランプ)は据え置き(召喚過多を防ぐ既存防御)。
- `import Phaser` は Container/Arc/Group 型で引き続き使用(削除しない)。

### 4. テスト
- 新規 `tests/unit/systems/coreSummon.test.ts`:
  体数・safeRadius 担保・左右振り分け・spacing・アリーナ収容・端折り返し(左右対称)・count=0。
- `tests/unit/config/coreBoss.test.ts`: safeRadius/spacing が正・本体非重複の下限を追加検証。
  既存の「最も硬い」は maxHp64 > 他30 で通過。

## 検証
- lint / typecheck / test / build を全通過。
- クルトワ(security-engineer)のセキュリティレビュー(コミット前必須)。
