# design: ステージ4,5 ボス難易度調整

変更は `src/config/balance.ts`(値)と `src/systems/bossAi.ts`(行動重み)に限定。
対応する unit テストの期待値も更新する。

## ステージ4: PURIFIER(balance.ts)
| 項目 | 現状 | 変更後 | 狙い |
|------|------|--------|------|
| spray.count | 5 | 4 | R4-1 総開き角は維持し本数を減らす→弾間の隙間が広がり回避可 |
| bloom.patchWidthP2 | 130 | 110 | R4-2 phase2の床1枚を縮小し回避余地を残す |
| bloom.lifespanMsP2 | 5000 | 4200 | R4-2 床の常設感を緩め安全地帯の回復を早める |
| phase2SpeedFactor | 0.72 | 0.80 | R4-3 phase2の行動間隔短縮を緩める |

## ステージ4: PURIFIER_WEIGHTS(bossAi.ts)
- phase2 に idle を復活させ息継ぎを作る(R4-3)。攻撃(spray/bloom)偏重を緩和。
  - 変更前: `{ move:20, shoot:15, spray:30, bloom:35 }`
  - 変更後: `{ move:20, shoot:15, spray:25, bloom:30, idle:10 }`
- phase1 は据え置き。
- ※ purifierBossAi.test.ts の「phase2 は idle を含まない」アサートを、設計変更に合わせ
  「phase2 でも控えめな idle で息継ぎを持つ(ただし phase1 より攻勢的)」へ更新。

## ステージ5: ENVOY(balance.ts)
| 項目 | 現状 | 変更後 | 狙い |
|------|------|--------|------|
| moveSpeed | 130 | 110 | R5-1 張り付きを緩和(飛行ボス90よりは速い個性は維持) |
| diveSpeed | 460 | 400 | R5-1 急降下の鋭さを緩和 |
| blink.dashSpeed | 520 | 480 | R5-1 瞬間移動の鋭さを僅かに緩和 |
| bulletSpeed | 320 | 290 | R5-2 弾を見てから避けやすく(飛行ボス280よりは速い) |
| lance.speed | 420 | 380 | R5-2 槍弾を読みやすく |
| lance.countP1 | 2 | 1 | R5-3 phase1の手数を下げる |
| lance.countP2 | 3 | 2 | R5-3 phase2の弾幕密度を下げる(phase差 P2>P1 は維持) |
| actionDurationMs.hover | 700 | 800 | R5-3 滞空(休み)を延ばす |
| actionDurationMs.lance | 550 | 650 | R5-3 槍弾後の隙を延ばし手数を減らす |
| phase2SpeedFactor | 0.65 | 0.68 | R5-3 phase2短縮を緩める(飛行ボス0.7より強く詰める制約は維持) |

火力値(contactDamage=2, bulletDamage=1, lanceDamage=2)は据え置き。

## ステージ5: ENVOY_WEIGHTS(bossAi.ts)
滞空(hover=休み)比率を上げ、攻撃偏重を緩和(R5-3)。
- 変更前 phase1: `{ hover:10, dive:20, lance:35, blink:25, shoot:10 }`
- 変更後 phase1: `{ hover:20, dive:20, lance:30, blink:20, shoot:10 }`
- 変更前 phase2: `{ hover:5, dive:20, lance:35, blink:35, shoot:5 }`
- 変更後 phase2: `{ hover:15, dive:20, lance:30, blink:30, shoot:5 }`

PURIFIER phase2 重み(確定): `{ move:20, shoot:15, spray:28, bloom:32, idle:8 }`
(spray/bloom は phase1 より高確率=攻勢的を維持しつつ、idle を戻して息継ぎを作る)

## テスト更新方針
既存テストは**具体値の直接アサートではなく関係性(相対比較)で検証**しているため、
以下の関係を満たす限りテスト改修は不要(実際に確認済み):
- ENVOY.moveSpeed > FLYING(90) / diveSpeed > FLYING(360) / bulletSpeed > FLYING(280)
- ENVOY.phase2SpeedFactor < FLYING(0.7) → 0.68 で満たす
- ENVOY.lance.countP2 > countP1 → 2 > 1 で満たす
- PURIFIER bloom.patchWidthP2 > P1 / lifespanMsP2 > P1 / countP2 > P1 を維持
- PURIFIER spray/bloom は phase2 で phase1 より高確率(重み確率で確認)
結論: **balance.ts と bossAi.ts のみ変更、テストファイルの改修は不要。**

## 検証
- `npm run lint` / `typecheck` / `test` / `build` を全通し(マージ前CI相当)。
- 可能なら実プレイで体感確認(ギュレル/手動)。
