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

- [x] hudFx.ts に `nextLagRatio(lag, actual, drainPerFrame)` を追加(BossHpBar のインライン残像ロジックの抽出)
- [x] config/effects.ts の EFFECTS.hud に値を追加
  - [x] `bossBarLagDrainPerFrame: 0.012`(既存マジックナンバーの移設)
  - [x] `lifeBarLagDrainPerFrame: 0.010`
  - [x] `criticalPulseMs / criticalPulseAlphaMin / criticalPulseAlphaMax`
- [x] hudFx.test.ts に `nextLagRatio` のテストを追加
  - [x] 減衰中(lag>actual)は drainPerFrame だけ減る
  - [x] actual を下回らない(クランプ)
  - [x] actual >= lag は即時追従
  - [x] 境界: drain 0 / lag==actual
- [x] titleFx.ts を新規作成(純粋ロジック)
  - [x] `logoFlickerAlpha(nowMs, minAlpha)`: 非整数比の複数 sin 合成 + 深沈み整形、値域 [min,1]、決定論
  - [x] `createMotes(seed, count)`: シード PRNG で粒子パラメータ生成(決定論)
  - [x] `motePosition(mote, nowMs, width, height)`: 上昇 + 横揺れ + 上端循環 + 縁フェード
- [x] config/effects.ts に `EFFECTS.title` を新設(moteCount / flickerMinAlpha 等)
- [x] titleFx.test.ts を新規作成
  - [x] logoFlickerAlpha: 値域・決定論・複数時刻で値が分散する(単調でない)
  - [x] createMotes: 同シード同結果・count 個・各値のレンジ
  - [x] motePosition: 決定論・y の循環・x の横揺れ

## フェーズ2: ボス HP バー(目盛り + 残像の共通化)

- [x] Boss.ts に `phase2HpRatio` 公開ゲッターを追加
- [x] registryKeys.ts に `HUD.bossPhase2Ratio` を追加
- [x] GameScene のボス出現2箇所(通常 / 裏ボス)で registry に phase2HpRatio を設定
- [x] UIScene: `BossHpBar.show(name, phase2Ratio)` へ渡す(registry 未設定は 0 = 目盛り非表示)
- [x] BossHpBar.ts の変更
  - [x] 残像更新を `nextLagRatio` + EFFECTS.hud 値へ置換(挙動同一)
  - [x] フェーズ2目盛りの描画(フェーズ1中=控えめ / 突入後=強調)
  - [x] 異常値(0以下・1以上・非有限)は目盛り非表示

## フェーズ3: ライフバー(ゴースト + 危機パルス)

- [x] LifeBar.ts の変更
  - [x] `lagHp` を追加し `nextLagRatio` で毎フレーム更新(HP 増加時は即時追従の防御)
  - [x] ゴースト描画(琥珀色、実 HP と lagHp の差分区間、端数は部分幅。点滅が最前)
  - [x] 危機(25%以下)時のパネル枠パルス(`chargePulseAlpha` 再利用 + 警告色)
- [x] tests/unit/ui/lifeBar.test.ts を新規作成(BossHpBar と同水準のモックで検証)
  - [x] ゴースト: 被弾直後は lagHp が実 HP より大きく残り、フレーム経過で縮む
  - [x] 危機(25%以下)で枠線パルスの alpha が時刻により変化する
  - [x] 非危機時は既存の固定 alpha(0.28)のまま

## フェーズ3.5: タイトル演出(TitleScene)

- [x] TitleScene にロゴ参照と `update(time)` を追加し、`logoFlickerAlpha` を alpha へ反映
- [x] 粒子の生成(固定シード)と毎フレーム描画(Graphics 1枚、ロゴ背面)
- [x] 周回数 2 以上で粒色を `loopRayTint` に切替
- [x] シーン再入(クリア→タイトル復帰)でリーク・二重生成がないことを確認(SHUTDOWN での後始末 or create 冪等)

## フェーズ4: 実機相当検証(Playwright)

- [x] ボス戦で目盛りが phase2HpRatio 位置に表示される(スクリーンショット目視 + registry 実測)
- [x] ボス HP を実弾で閾値未満へ削り、目盛り強調への切替を確認
- [x] 実プレイ被弾でゴースト残像が出て縮む(lagHp の時系列実測)
- [x] HP 25% 以下で枠パルスが出る(スクリーンショット)
- [x] 裏ボス相当の spawn 経路でも phase2Ratio が設定される(registry 実測)
- [x] タイトル: ロゴ alpha の時間変化と粒子の移動を2時点実測、スクリーンショット目視
- [x] タイトル→ゲーム→タイトル再入で演出が正常(二重生成・リークなし)
  - 検証中に UIScene が停止されない状態でタイトルへ戻ると HUD が残留することが判明。
    本番経路(GameOverScene/ClearScene 等)は必ず `scene.stop(SCENE_KEYS.ui)` を伴うため
    実際のバグではないが、テストもその手順に揃えて修正した(詳細は retrospective.md)。

## フェーズ5: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`(705 件、ユニットテスト全通過)
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`
- [x] (追加) Playwright e2e フルスイート(24件、フェーズ4新規分含む)も全通過を確認

## フェーズ6: ドキュメント更新・振り返り

- [x] docs/functional-design.md の UIScene/HUD・TitleScene 記述を更新(目盛り・ゴースト・危機パルス・ロゴ明滅・粒子)
- [x] docs/repository-structure.md の systems 一覧に titleFx.ts を追記
- [x] 実装後の振り返りを記録（別ファイル `retrospective.md` に記録 → モード3）

---

> **振り返りについて**: 実装後の振り返りはこのファイルではなく、同じディレクトリの
> `retrospective.md` に記録する（テンプレート: `.claude/skills/steering/templates/retrospective.md`）。
> 全タスクが `[x]` になったことを確認してから作成すること。
