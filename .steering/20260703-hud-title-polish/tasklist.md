# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 実装可能なタスクのみを計画
- 計画段階で「実装可能なタスク」のみをリストアップ
- 「将来やるかもしれないタスク」は含めない
- 「検討中のタスク」は含めない

### タスクスキップが許可される唯一のケース
以下の技術的理由に該当する場合のみスキップ可能:
- 実装方針の変更により、機能自体が不要になった
- アーキテクチャ変更により、別の実装方法に置き換わった
- 依存関係の変更により、タスクが実行不可能になった

スキップ時は必ず理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

### タスクが大きすぎる場合
- タスクを小さなサブタスクに分割
- 分割したサブタスクをこのファイルに追加
- サブタスクを1つずつ完了させる

---

## フェーズ1: 純粋ロジックとチューニング値

- [ ] hudFx.ts に `nextLagRatio(lag, actual, drainPerFrame)` を追加(BossHpBar のインライン残像ロジックの抽出)
- [ ] config/effects.ts の EFFECTS.hud に値を追加
  - [ ] `bossBarLagDrainPerFrame: 0.012`(既存マジックナンバーの移設)
  - [ ] `lifeBarLagDrainPerFrame: 0.010`
  - [ ] `criticalPulseMs / criticalPulseAlphaMin / criticalPulseAlphaMax`
- [ ] hudFx.test.ts に `nextLagRatio` のテストを追加
  - [ ] 減衰中(lag>actual)は drainPerFrame だけ減る
  - [ ] actual を下回らない(クランプ)
  - [ ] actual >= lag は即時追従
  - [ ] 境界: drain 0 / lag==actual
- [ ] titleFx.ts を新規作成(純粋ロジック)
  - [ ] `logoFlickerAlpha(nowMs, minAlpha)`: 非整数比の複数 sin 合成 + 深沈み整形、値域 [min,1]、決定論
  - [ ] `createMotes(seed, count)`: シード PRNG で粒子パラメータ生成(決定論)
  - [ ] `motePosition(mote, nowMs, width, height)`: 上昇 + 横揺れ + 上端循環 + 縁フェード
- [ ] config/effects.ts に `EFFECTS.title` を新設(moteCount / flickerMinAlpha 等)
- [ ] titleFx.test.ts を新規作成
  - [ ] logoFlickerAlpha: 値域・決定論・複数時刻で値が分散する(単調でない)
  - [ ] createMotes: 同シード同結果・count 個・各値のレンジ
  - [ ] motePosition: 決定論・y の循環・x の横揺れ

## フェーズ2: ボス HP バー(目盛り + 残像の共通化)

- [ ] Boss.ts に `phase2HpRatio` 公開ゲッターを追加
- [ ] registryKeys.ts に `HUD.bossPhase2Ratio` を追加
- [ ] GameScene のボス出現2箇所(通常 / 裏ボス)で registry に phase2HpRatio を設定
- [ ] UIScene: `BossHpBar.show(name, phase2Ratio)` へ渡す(registry 未設定は 0 = 目盛り非表示)
- [ ] BossHpBar.ts の変更
  - [ ] 残像更新を `nextLagRatio` + EFFECTS.hud 値へ置換(挙動同一)
  - [ ] フェーズ2目盛りの描画(フェーズ1中=控えめ / 突入後=強調)
  - [ ] 異常値(0以下・1以上・非有限)は目盛り非表示

## フェーズ3: ライフバー(ゴースト + 危機パルス)

- [ ] LifeBar.ts の変更
  - [ ] `lagHp` を追加し `nextLagRatio` で毎フレーム更新(HP 増加時は即時追従の防御)
  - [ ] ゴースト描画(琥珀色、実 HP と lagHp の差分区間、端数は部分幅。点滅が最前)
  - [ ] 危機(25%以下)時のパネル枠パルス(`chargePulseAlpha` 再利用 + 警告色)

## フェーズ3.5: タイトル演出(TitleScene)

- [ ] TitleScene にロゴ参照と `update(time)` を追加し、`logoFlickerAlpha` を alpha へ反映
- [ ] 粒子の生成(固定シード)と毎フレーム描画(Graphics 1枚、ロゴ背面)
- [ ] 周回数 2 以上で粒色を `loopRayTint` に切替
- [ ] シーン再入(クリア→タイトル復帰)でリーク・二重生成がないことを確認(SHUTDOWN での後始末 or create 冪等)

## フェーズ4: 実機相当検証(Playwright)

- [ ] ボス戦で目盛りが phase2HpRatio 位置に表示される(スクリーンショット目視 + registry 実測)
- [ ] ボス HP を実弾で閾値未満へ削り、目盛り強調への切替を確認
- [ ] 実プレイ被弾でゴースト残像が出て縮む(lagHp の時系列実測)
- [ ] HP 25% 以下で枠パルスが出る(スクリーンショット)
- [ ] 裏ボス相当の spawn 経路でも phase2Ratio が設定される(registry 実測)
- [ ] タイトル: ロゴ alpha の時間変化と粒子の移動を2時点実測、スクリーンショット目視
- [ ] タイトル→ゲーム→タイトル再入で演出が正常(二重生成・リークなし)

## フェーズ5: 品質チェックと修正

- [ ] すべてのテストが通ることを確認
  - [ ] `npm test`
- [ ] リントエラーがないことを確認
  - [ ] `npm run lint`
- [ ] 型エラーがないことを確認
  - [ ] `npm run typecheck`
- [ ] ビルドが成功することを確認
  - [ ] `npm run build`

## フェーズ6: ドキュメント更新・振り返り

- [ ] docs/functional-design.md の UIScene/HUD・TitleScene 記述を更新(目盛り・ゴースト・危機パルス・ロゴ明滅・粒子)
- [ ] docs/repository-structure.md の systems 一覧に titleFx.ts を追記
- [ ] 実装後の振り返りを記録（別ファイル `retrospective.md` に記録 → モード3）

---

> **振り返りについて**: 実装後の振り返りはこのファイルではなく、同じディレクトリの
> `retrospective.md` に記録する（テンプレート: `.claude/skills/steering/templates/retrospective.md`）。
> 全タスクが `[x]` になったことを確認してから作成すること。
