# タスクリスト

## 🚨 タスク完全完了の原則
全タスクを `[x]` にするまで作業を継続する。未完了 `[ ]` を残して終了しない。

---

## フェーズ1: カメラ揺れの廃止

- [x] `src/systems/EffectsManager.ts` `beamFire()` のカメラシェイク呼び出しを削除
- [x] `src/config/effects.ts` `EFFECTS.beamFire.shake` 設定を削除
- [x] `tests/unit/config/beamFireFx.test.ts` の shake 序列テストを削除

## フェーズ2: ビーム帯の多層発光化

- [x] `src/config/effects.ts` に描画専用 `beam` ブロックを追加
- [x] `src/entities/Beam.ts` に glow/core 装飾レイヤーと脈動を実装
  - [x] 装飾レイヤーは物理なし(scene.add.rectangle)、当たり判定本体は不変
  - [x] reposition で glow/core を本体へ追従
  - [x] フェード(in/out)を本体と同尺で glow/core にも適用
  - [x] core の scaleY 脈動 + glow の scaleY 呼吸(alpha 競合回避のため scaleY に統一)
  - [x] destroy で装飾レイヤー・tween を確実に解放

## フェーズ3: バリア破り強化

- [x] `src/config/balance.ts` `BOSS_SHIELD.beamDamage` を 5 へ更新(コメントも更新)

## フェーズ4: テスト

- [x] `tests/unit/systems/combatRules.test.ts` にビームのシールド貫通テストを追加
  - [x] beam のシールドダメージが新値(=chargedと同等)
  - [x] 1発射の最大tick数(3)でバリア(maxHp)を破壊できる(ceil(maxHp/beamDamage) <= 3)
- [x] `tests/unit/config/beamFireFx.test.ts` に描画 `beam` ブロック妥当性テストを追加

## フェーズ5: 品質チェック

- [x] `npm test`(579 passed)
- [x] `npm run lint`(エラーなし)
- [x] `npm run typecheck`(BOSS_SHIELD.maxHp のリテラル型に対し let に型注釈を補完)
- [x] `npm run build`(成功)

## フェーズ6: 実機ビジュアル確認

- [x] Playwright 直起動でビーム発射 → 多層発光(glow52.8/body22/core8.8)・当たり判定不変(900×22)・
      カメラ無揺れ(shakeRunning=false)を確認。スクショでも発光帯を目視

## フェーズ7: 振り返り

- [x] `retrospective.md` を記録(モード3)

---

> 振り返りは全タスク `[x]` 確認後に `retrospective.md` へ記録する。
