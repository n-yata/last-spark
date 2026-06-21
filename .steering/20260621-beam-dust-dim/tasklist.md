# タスクリスト

## 🚨 タスク完全完了の原則
全タスクを `[x]` にするまで作業を継続する。未完了 `[ ]` を残して終了しない。

---

## フェーズ1: 明度の低減

- [x] `src/config/effects.ts` `beam` のピークアルファを低減(core 1.0→0.7 / body 0.85→0.5 / glow 0.35→0.2)

## フェーズ2: 光の粉エミッター

- [x] `src/config/effects.ts` `beam` に dust 設定を追加
- [x] `src/entities/Beam.ts` に光の粉エミッターを実装
  - [x] TEX.spark を import し emitting:false で生成(ビーム軸の emitZone)
  - [x] fire() で start、reposition() でビーム中心へ追従
  - [x] destroy() で dust.destroy() を追加(解放)

## フェーズ3: テスト

- [x] `tests/unit/config/beamFireFx.test.ts` を更新
  - [x] 明度: 各ピークアルファ < 1 かつ順序維持(core≥body>glow)
  - [x] 光の粉: dust 設定の妥当性(frequency/lifespan/速度範囲/scale・alpha/spread)

## フェーズ4: 品質チェック

- [x] `npm test`(583 passed)
- [x] `npm run lint`(エラーなし)
- [x] `npm run typecheck`(emitZone は EffectsManager と同じ型付きsource+quantity形に合わせて解消)
- [x] `npm run build`(成功)

## フェーズ5: 実機ビジュアル確認

- [x] Playwright 直起動でビーム発射 → 光の粉エミッター発生中・明度低下(bodyAlpha 0.5)・当たり判定不変(900×22)を確認
- [x] 実機実績のある ambient エミッターと同 harness で生存数比較(dust1 / ambient2)。
      両者同程度=headless スロットル由来のアーティファクトと判明。dust は ambient と同一メカニズムで
      本番 60fps では軸沿いに連続発生する(emitting:false+start() は1発不具合のため生成即発生に修正)

## フェーズ6: 振り返り

- [x] `retrospective.md` を記録(モード3)
