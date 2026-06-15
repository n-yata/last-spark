# 設計: stage6 ラスボス強化

## 方針

「中・バランス重視」。火力(HP/弾速/接触ダメ)は据え置き、**テンポと盤面圧**で強化する。
最大の強化点は「phase2 でも召喚を継続する」こと自体(プレイヤーが雑魚処理に追われ、ボスへの
火力が分散し続ける = 実質的にボスが硬く感じる)。

## 変更詳細

### 1. `src/systems/bossAi.ts` — CORE_WEIGHTS.phase2 に summon 追加

変更前:
```
phase2: { shoot: 75, idle: 25 },
```
変更後:
```
phase2: { summon: 30, shoot: 50, idle: 20 },
```
- `shoot`(50) を引き続き最多にして「直接攻撃型」の性格を保つ。
- `summon`(30) を織り交ぜ、HP が減っても雑魚が湧き続ける。
- `idle`(25→20) を僅かに減らしテンポを上げる(攻勢の強化)。
- summon の連続抑制(REPEAT_PENALTY)は既存ロジックで効く。

### 2. `src/config/balance.ts` — ECLIPSE_CORE.summonMaxActive 6→8

- phase2 でも召喚機会が増えるため、上限が低いとすぐ張り付き召喚がスキップされ「出続ける」
  体感が薄れる。上限を少し引き上げ、盤面に常時雑魚が居る圧を作る。
- summonCount は 3 のまま(1回の召喚で 3 体)。summonCount(3) <= summonMaxActive(8) を満たす。
- HP(56)・bulletSpeed(340)・contactDamage(3) は据え置き。

### 3. コメント整合(設計記述の更新)

「phase2 は召喚を止める / summon は phase1 のみ」と書かれた箇所を「phase2 も召喚を継続する
(shoot 主軸 + summon を織り交ぜる)」へ更新する:
- `src/systems/bossAi.ts`(CORE_WEIGHTS の docコメント)
- `src/config/balance.ts`(ECLIPSE_CORE の docコメント)
- `src/entities/CoreBoss.ts`(クラス冒頭コメント・updateRig 周辺の「phase2 は召喚を止め」記述)

### 4. テスト更新

- `tests/unit/systems/coreBossAi.test.ts`:
  - 「phase2 は summon を一切含まない」→「phase2 も summon を含む(HP が減っても召喚継続)」へ反転。
  - phase2 で shoot が主軸(最多)であることを検証(性格維持の担保)。
  - allowedCoreActions: phase2 も summon を許可する、へ更新。
  - 連続抑制テストは維持。
- `tests/unit/config/coreBoss.test.ts`:
  - summonCount <= summonMaxActive の不変条件は維持(6→8 でも成立)。
  - 既存の硬さ・移動0・サイズ検証はそのまま通る。

## 検証

- `npm run lint` / `npm run typecheck` / `npm test` / `npm run build` を全て通す。
- クルトワ(security-engineer)のセキュリティレビューをコミット前に実施。
