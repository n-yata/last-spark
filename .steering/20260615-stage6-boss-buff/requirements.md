# 要求: stage6 ラスボス(ECLIPSE本体)の強化

## 背景

シャビ(監督)からの依頼。stage6 のラスボス「ECLIPSE本体」(CoreBoss)を強化する。
特に「ボスのHPが減っても雑魚敵を出現させ続ける」ことが必須要件。

## 現状(変更前)

- `CORE_WEIGHTS`(`src/systems/bossAi.ts`)
  - phase1(HP 50%超): `summon` 40 / `shoot` 35 / `idle` 25 — 配下召喚の支援型
  - phase2(HP 50%以下): `shoot` 75 / `idle` 25 — **召喚を完全に止め**コア直接攻撃型へ切替
- つまり HP が減って phase2 に入ると雑魚召喚が止まる。
- `ECLIPSE_CORE`(`src/config/balance.ts`): summonCount 3 / summonMaxActive 6。

## 要求内容

1. **phase2 でも雑魚召喚を継続する**(必須)。HP が減っても雑魚が出続けるようにする。
2. **ボスを強化する**。度合いは「中・バランス重視」(シャビ確認済み):
   - phase2 は `shoot` 主軸を維持しつつ `summon` を織り交ぜる(直接攻撃型の性格は保つ)。
   - 同時召喚上限を少し引き上げ、phase2 継続召喚で上限張り付きによる「出ない」体感を防ぐ。
   - HP・弾速・接触ダメージは据え置き(stage6 で覚醒した RAY の火力倍化で溶けない範囲を維持)。

## 制約

- 変更は config(`balance.ts`)と行動重みテーブル(`bossAi.ts`)に閉じる。CoreBoss の召喚処理コードは
  phase 非依存(summon アクションが抽選されれば召喚する)なので、ロジック変更は不要。
- 「phase2 は召喚しない」という既存の設計コメント・テストを新仕様へ全面的に更新する。
- マジックナンバーは balance.ts / bossAi.ts に集約する(ロジックへ埋め込まない)。
