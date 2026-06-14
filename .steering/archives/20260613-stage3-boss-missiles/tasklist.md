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
- [x] e2e: Chromium が利用可能になったため実行・解消(2026-06-13)。
      当初は Playwright ブラウザ未取得で未実行だった(環境制約)。実行にあたり、e2e がブロック当時から
      陳腐化していた点を現行ゲームに合わせて修正:
        - stage1 開始演出(背景つき CutsceneScene)で GameScene が一時停止するため、開始処理を
          共通ヘルパー `tests/e2e/_helpers.ts` の `startGame`(演出を送り切って GameScene 実行中にする)へ集約
        - SaveData v1(`cleared` boolean)前提のクリア永続化テストを v2(`clearedStages` 配列)に更新
        - リアルタイムゲームの実操作 e2e が並列競合で不安定だったため `playwright.config.ts` の worker を 2 に制限
      結果: 全9 e2e が安定パス(boss-damage=ミサイル/接地ボスの命中回帰防止 を含む)。
