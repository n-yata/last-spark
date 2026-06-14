# design: ステージ5ボス 追加調整

変更は `src/config/balance.ts`(ダメージ値)と `src/systems/bossAi.ts`(行動重み)に限定。

## ダメージ減(R1)
| 項目 | 現状 | 変更後 | 根拠 |
|------|------|--------|------|
| ENVOY.contactDamage | 2 | 1 | 高速接近で接触が頻繁。無敵時間(800ms)下では1ヒット/0.8sに制限されるため、1ヒットの重さを半減=実質の被ダメ速度が半分になる |
| SHOT.lanceDamage | 2 | 1 | 槍弾も重い単発。lance は ENVOY 専用アクション(shot.ts の kind==='lance' のみ参照、他ボスは未使用)のため stage5 のみに影響 |

これで使者の被ダメ源は contact=1 / bullet=1 / lance=1 に揃う。脅威は速度・本数・任意角度で残す。
bulletDamage は既に 1 のため据え置き。接触/弾の「数値」を下げるのは今回が初(前回は避けやすさ・頻度で対応)。

## 移動頻度減(R2)
ENVOY の移動主因は blink(瞬間移動)。blink 重みを下げ hover(滞空=休み)へ回す。dive(攻撃急降下)は維持。

ENVOY_WEIGHTS:
- 変更前 phase1: `{ hover:20, dive:20, lance:30, blink:20, shoot:10 }`
- 変更後 phase1: `{ hover:25, dive:20, lance:30, blink:15, shoot:10 }`
- 変更前 phase2: `{ hover:15, dive:20, lance:30, blink:30, shoot:5 }`
- 変更後 phase2: `{ hover:23, dive:20, lance:30, blink:22, shoot:5 }`

blink 出現率: phase1 0.20→0.15 / phase2 0.30→0.22(いずれも約25%減=「もう少し」)。
hover(休み)はその分増加。

## テスト整合
ダメージ値を直接アサートするテストは存在しない(grep 確認済み)。重みは関係性で検証:
- envoyBossAi.test.ts「blink は phase2 でより出やすい」→ phase2 blink(0.22) > phase1 blink(0.15) を維持。
- 許可アクション集合(hover/dive/lance/blink/shoot)は不変。
結論: **balance.ts と bossAi.ts のみ変更、テスト改修は不要。**

## 検証
- npm: lint / typecheck / test / build を全通し。
- セキュリティレビュー(クルトワ)実施後コミット。
