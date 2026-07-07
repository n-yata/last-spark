# 設計書

## アーキテクチャ概要

既存の HUD 構成(registry 経由の状態伝搬 + `hudFx.ts` の純粋関数 + `ui/` の描画クラス)を踏襲する。新しい進行計算は `hudFx.ts` に純粋関数として追加し、描画クラスは毎フレームそれを呼ぶだけにする。

タイトル演出は新規純粋モジュール `systems/titleFx.ts`(時刻→明滅値、シード+時刻→粒子位置)+ TitleScene の update 描画で構成する。`stageBackground.ts` と同じ「決定論(シード PRNG・時刻ベース)でテスト可能」の方針を貫き、`Math.random` は使わない。

```
GameScene(ボス出現時)
  └ registry.set(HUD.bossPhase2Ratio, boss.phase2HpRatio)   ← 新規キー
        │
UIScene.update ── registry を読む ──▶ BossHpBar.show(name, phase2Ratio)
                                      BossHpBar.render(目盛り描画 + 突入判定)
                                      LifeBar.render(ゴースト + 危機パルス)
        │
hudFx.ts(純粋)
  ├ nextLagRatio(lag, actual, drainPerFrame)   ← 新規(BossHpBar の残像ロジックを抽出・共有)
  └ chargePulseAlpha(...)                       ← 既存を危機パルスに再利用
```

## コンポーネント設計

### 1. hudFx.ts(変更・純粋関数の追加)

**責務**: 残像ゲージの毎フレーム減衰計算

**実装の要点**:
- `nextLagRatio(lag: number, actual: number, drainPerFrame: number): number`
  - `actual < lag` なら `max(actual, lag - drainPerFrame)`、そうでなければ `actual`(即時追従)
  - BossHpBar 内のインライン実装(`this.lagRatio = Math.max(actualRatio, this.lagRatio - 0.012)`)をこの関数へ抽出し、マジックナンバー 0.012 は `config/effects.ts` の `EFFECTS.hud` へ移す
- 危機パルスは既存 `chargePulseAlpha` を再利用(汎用の sin パルスなので新関数は作らない)

### 2. Boss.ts(小変更)

- `get phase2HpRatio(): number { return this.cfg.phase2HpRatio; }` を公開する(cfg は protected のため)。サブクラス(FlyingBoss/WardenBoss/…)はすべて継承で自動対応

### 3. registryKeys.ts / GameScene(変更)

- `HUD.bossPhase2Ratio` キーを追加
- ボス出現の registry 設定箇所(通常ボス spawn / 裏ボス spawnHardSecretBoss の2箇所)で `boss.phase2HpRatio` を設定する

### 4. BossHpBar.ts(変更)

**実装の要点**:
- `show(name, phase2Ratio)` に引数を追加(呼び出しは UIScene の1箇所)
- 残像更新をインライン実装から `nextLagRatio` 呼び出しへ置き換え(挙動は同一。drainPerFrame は `EFFECTS.hud.bossBarLagDrainPerFrame` = 0.012 として設定へ移す)
- 目盛り描画: `x + barWidth * phase2Ratio` に縦線(バー高より少し長い notch)。
  - フェーズ1中(actualRatio > phase2Ratio): 控えめな明度(境界の予告)
  - フェーズ2突入後(actualRatio <= phase2Ratio): 目盛りを発光色で強調(太く・明るく)
- phase2Ratio が 0 以下・1 以上の異常値なら目盛りを描かない(防御)

### 5. LifeBar.ts(変更)

**実装の要点**:
- `lagHp`(float)フィールドを追加し、毎フレーム `nextLagRatio(lagHp/maxHp, clamped/maxHp, drain) * maxHp` で更新(ボスバーと同じ関数を共有)
- 描画順: 空セグメント → **ゴースト(琥珀 `DAMAGE_LAG` 系色、セグメント i が `clamped <= i < lagHp` の範囲。端数は部分幅で描く)** → 実 HP セグメント → 失ったセグメントの点滅(既存、最前)
- 点滅中はゴーストより点滅が優先(既存の視覚を壊さない)
- 危機パルス: `critical` のとき枠線を `chargePulseAlpha(now, EFFECTS.hud.criticalPulseMs, min, max)` のアルファ + 警告色で描く(非危機時は現行どおり)
- リセット: HP が増える状況は現仕様に無いが、`lagHp < clamped` なら即時 `clamped` へ(防御)

### 6. config/effects.ts(変更)

- `EFFECTS.hud` に追加: `bossBarLagDrainPerFrame: 0.012`(既存値の移設) / `lifeBarLagDrainPerFrame: 0.010` / `criticalPulseMs: 900` / `criticalPulseAlphaMin: 0.25` / `criticalPulseAlphaMax: 0.85`
- `EFFECTS.title` を新設: `moteCount: 14` / `flickerMinAlpha: 0.55` 等(タイトル演出のチューニング値)

### 7. titleFx.ts(新規・純粋ロジック)

**責務**: ロゴ明滅値と粒子軌道の決定論計算

**実装の要点**:
- `logoFlickerAlpha(nowMs, minAlpha)`: 複数周波数の sin 合成(非整数比の周期を重ねて非周期的な揺らぎを作る)+ 合成値が深く沈む瞬間だけ強く落とす整形で「時折ふっと暗くなるネオン」を表現。値域は `[minAlpha, 1]`。同じ nowMs には同じ値(決定論)
- `createMotes(seed, count)`: mulberry32 系のシード PRNG で各粒の `{ baseX(0..1), phase, riseSpeed, swayAmp, swayFreq, size, baseAlpha }` を生成(stageBackground.ts の方針を踏襲。PRNG は titleFx 内に持つ)
- `motePosition(mote, nowMs, width, height)`: `y = height - ((nowMs * riseSpeed + phase*height) % (height + margin))`(上端で下へ循環)、`x = baseX*width + sin(nowMs*swayFreq + phase) * swayAmp`、`alpha = baseAlpha * (縁でフェード)`。純粋・決定論

### 8. TitleScene(変更・描画)

- ロゴ Text を保持し、`update(time)` で `logoFlickerAlpha` を alpha に反映
- 粒子: `createMotes(固定シード, EFFECTS.title.moteCount)` を create で生成し、粒ごとに小さな circle(Graphics 1枚に毎フレーム全粒を描き直す)を `update` で `motePosition` に従い描画。色は `loopCount >= 2 ? loopRayTint(loopCount) : アクセント(#37f7d8)`
- 描画深度はロゴ・テキストの背面(背景の直上)
- TitleScene に `update` が無ければ追加する(現状 create のみ)

## データフロー

### フェーズ2目盛り
```
1. GameScene.spawnBoss: registry.set(HUD.bossPhase2Ratio, boss.phase2HpRatio)
2. UIScene: bossActive 立ち上がりで show(name, phase2Ratio)
3. BossHpBar.render: 目盛りを描画、actualRatio <= phase2Ratio で強調表示へ切替
```

### ライフバーのゴースト
```
1. 被弾で hp が減る → render(hp, maxHp, now)
2. lagHp = nextLagRatio(lagHp/maxHp, hp/maxHp, lifeBarLagDrainPerFrame) * maxHp
3. 実 HP セグメントの右に琥珀の残像(lagHp までの区間)を描画 → 毎フレーム縮む
```

## エラーハンドリング戦略

- phase2Ratio の異常値(0 以下・1 以上・非有限)は目盛り非表示(HUD は落とさない)
- registry 未設定(旧経路・テスト起動)は `?? 0.5` で既定値にフォールバック…ではなく **`?? 0` で目盛り非表示**(嘘の位置に出さない。設定漏れは Playwright 検証で検出する)

## テスト戦略

### ユニットテスト
- `tests/unit/systems/hudFx.test.ts`(追加): `nextLagRatio` — 減衰中(lag>actual)は drain だけ減る / actual を下回らない / actual >= lag は即時追従 / drain 0 でも actual までは下がる(境界)
- `tests/unit/systems/titleFx.test.ts`(新規): `logoFlickerAlpha` — 値域 [min,1] / 決定論(同時刻同値) / 単調でない(複数時刻で分散がある)。`createMotes` — 同シード同結果 / count 個生成 / 各値が期待レンジ。`motePosition` — 決定論 / y が画面範囲で循環 / x が横揺れする
- `tests/unit/ui/bossHpBar.test.ts`(既存構成を確認し、目盛りの純粋判定が切り出せる場合は追加)
- `tests/unit/config/*`: EFFECTS.hud の新規値の存在・値域(既存のスタイルに倣い、必要なら)

### 実機相当検証(Playwright)
- ボス戦を発生させ、目盛りが phase2HpRatio 位置に描かれること(Graphics は内省しにくいため、registry 値と show 呼び出しの検証 + スクリーンショット目視)
- ボス HP を閾値未満へ実弾で削り、目盛り強調への切替をスクリーンショットで確認
- プレイヤー被弾(実プレイ)でゴースト残像が出て縮むこと(連続スクリーンショット or lagHp 内省)
- HP を 25% 以下にして枠パルスの発生を確認
- タイトル: ロゴ alpha が時間で変化すること(2時点の実測値差)、粒子が移動していること(2時点の位置差)、スクリーンショット目視

## 依存ライブラリ

追加なし。

## ディレクトリ構造

```
src/
├── systems/hudFx.ts          # 変更: nextLagRatio 追加
├── entities/Boss.ts          # 変更: phase2HpRatio ゲッター公開
├── config/registryKeys.ts    # 変更: HUD.bossPhase2Ratio 追加
├── config/effects.ts         # 変更: EFFECTS.hud に減衰・パルス値追加
├── scenes/GameScene.ts       # 変更: ボス出現2箇所で registry 設定
├── scenes/UIScene.ts         # 変更: show(name, phase2Ratio) 呼び出し
├── ui/BossHpBar.ts           # 変更: 目盛り描画 + nextLagRatio 化
└── ui/LifeBar.ts             # 変更: ゴースト + 危機パルス
tests/
├── unit/systems/hudFx.test.ts   # 追加
└── unit/config/effects 系       # 必要に応じ追加
```

## 実装の順序

1. hudFx.nextLagRatio + テスト、effects.ts の値追加
2. BossHpBar の nextLagRatio 化(挙動同一の置換)+ 目盛り描画
3. Boss ゲッター + registryKeys + GameScene + UIScene の配線
4. LifeBar のゴースト + 危機パルス
5. Playwright 検証 → 品質チェック → docs 更新

## セキュリティ考慮事項

- 外部通信・localStorage 変更なし。registry の数値1つの追加のみ。

## パフォーマンス考慮事項

- 追加は毎フレームの算術数個と fillRect 数個。負荷影響なし。

## 将来の拡張性

- 目盛りは ratio の配列化で多段フェーズにも拡張できる(現状は単一値)。
- `nextLagRatio` はチャージ・シールド等、今後の「遅延追従ゲージ」全般に再利用できる。
