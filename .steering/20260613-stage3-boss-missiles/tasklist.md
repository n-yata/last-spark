# タスクリスト: stage3 WardenBoss / ミサイル攻撃

- [x] 型追加: ProjectileKind 'missile' / BossAction 'missile' / BossKind 'warden'
- [x] balance.ts: SHOT ミサイル物理値 + WardenBossConfig + CONTAINMENT_WARDEN 更新
- [x] shot.ts: createProjectileSpec 'missile' 分岐 + computeLobVelocity 追加
- [x] Projectile.ts: fire の放物線拡張 + ミサイルテクスチャ + 地面回収
- [x] bossAi.ts: WARDEN_WEIGHTS / pickNextWardenBossAction / allowedWardenActions
- [x] WardenBoss.ts 新規作成(fireMissiles)
- [x] assetKeys.ts + PreloadScene.ts: projectileMissile テクスチャ
- [x] stage1.ts STAGE3 を bossKind 'warden' に
- [x] GameScene.ts spawnBoss で warden 出し分け
- [x] SpawnSystem.ts: warden のボス幅でトリガー可視位置を補正
- [x] テスト追加(wardenBossAi / shot.computeLobVelocity / wardenBoss)
- [x] lint + typecheck + test 通過
- [ ] e2e: 環境のネットワーク制限で Playwright ブラウザ未取得のため未実行
      (cdn.playwright.dev が egress 許可外。コード起因の失敗ではない)
