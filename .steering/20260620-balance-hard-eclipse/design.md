# 設計書

## アーキテクチャ概要

既存のチューニング値集中管理を維持し、数値調整は `src/config/balance.ts` に集約する。
難易度による道中敵数の増加は `src/systems/difficulty.ts` の純粋関数として実装し、`SpawnSystem.loadStage` が利用する。

```
GameScene
  -> SpawnSystem.loadStage(stageId, difficulty)
      -> getStageData(stageId).enemies
      -> applyDifficultyToEnemySpawns(enemies, difficulty)
      -> pending
```

## コンポーネント設計

### 1. `ECLIPSE_CORE`

**責務**:
- stage6 コアボスの基礎パラメータを保持する。
- 最終戦の強さを保ちつつ、過剰な攻撃圧を避ける。

**実装の要点**:
- `bulletDamage` / `bulletSpeed` / `phase2SpeedFactor` / `summonCount` / `summonMaxActive` を緩和する。
- `maxHp` は最終ボスとしての耐久を保つ範囲に留める。

### 2. `difficulty.ts`

**責務**:
- 難易度に応じたステージ係数とプレイヤー被ダメージ倍率を返す。
- hard 専用の道中敵配置増量を純粋関数で提供する。

**実装の要点**:
- normal は入力配列と同じ敵数を返す。
- hard は既存配置から一定間隔で追加敵を生成し、敵数を増やす。
- 追加敵の X 座標は定数オフセットでずらし、完全な重なりを避ける。

### 3. `SpawnSystem`

**責務**:
- ステージ進行に応じた雑魚敵出現を制御する。

**実装の要点**:
- `loadStage` でステージ定義の敵配列を難易度に応じて展開してから `pending` に入れる。
- ボス召喚ミニオンは `CoreBoss` 側の既存召喚ロジックに任せ、今回の「エリア探索中」増量対象からは外す。

## データフロー

### ハードモード道中敵増量
```
1. GameScene が保存設定の difficulty を取得する。
2. SpawnSystem.loadStage(stageId, difficulty) を呼ぶ。
3. difficulty.ts が hard の場合だけ EnemySpawn を追加する。
4. SpawnSystem.update が pending を通常通り X 昇順で出現させる。
```

## エラーハンドリング戦略

追加のエラークラスは不要。未知の難易度は型上発生しない。
ステージ定義が空の場合は normal/hard とも空配列を返す。

## テスト戦略

### ユニットテスト
- `applyDifficultyToEnemySpawns` が normal で敵数を変えないこと。
- `applyDifficultyToEnemySpawns` が hard で敵数を増やし、追加敵の位置をずらすこと。
- `ECLIPSE_CORE` の緩和後パラメータが過剰な値に戻っていないこと。

### 統合テスト
- 既存の `SpawnSystem` ボストリガテストが引き続き通ること。

## 依存ライブラリ

追加なし。

## ディレクトリ構造

```
src/config/balance.ts
src/systems/difficulty.ts
src/systems/SpawnSystem.ts
tests/unit/systems/difficulty.test.ts
tests/unit/config/coreBoss.test.ts
docs/functional-design.md
```

## 実装の順序

1. tasklist を更新しながらテストを追加する。
2. `ECLIPSE_CORE` と難易度別敵数増量ロジックを実装する。
3. ドキュメントを同期する。
4. テスト・型チェック・lint・build を実行する。

## セキュリティ考慮事項

- 外部通信・URL・シークレットの追加はない。
- 変更対象はゲーム内チューニングと純粋ロジックのみ。

## パフォーマンス考慮事項

- hard の道中敵数は 1.5 倍程度に留め、出現済み敵が極端に増えないようにする。
- 追加敵は既存の SpawnSystem の pending 出現制御に乗せるため、全敵を一度に生成しない。

## 将来の拡張性

hard 以外の難易度やステージ別の敵数倍率が必要になった場合、`DIFFICULTY_TUNING` に係数を追加して拡張できる。
