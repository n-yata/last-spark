# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### タスクスキップが許可される唯一のケース
- 実装方針の変更により機能自体が不要になった / アーキテクチャ変更で別実装に置換 / 依存変更で実行不可能になった場合のみ。理由を明記する。

---

## フェーズ1: プロジェクト基盤

- [x] package.json 作成(scripts: dev/build/preview/test/lint/format/typecheck、依存定義)
- [x] tsconfig.json 作成(strict、bundler 解決、Phaser 型)
- [x] index.html 作成(横向き前提の viewport、ルート要素)
- [x] vite.config.ts 作成(vite-plugin-pwa 設定、manifest、SW)
- [x] vitest.config.ts 作成(jsdom 環境、カバレッジ)
- [x] playwright.config.ts 作成(モバイル横向きプロジェクト)
- [x] ESLint/Prettier 設定(eslint.config.js / .prettierrc / ignore)
- [x] .gitignore 作成(repository-structure.md の除外設定に準拠)
- [x] 依存インストール(`npm install`)と最小 main.ts で起動確認(typecheck 通過)

## フェーズ2: config / types(最下位レイヤー)

- [x] types: save.ts / input.ts / combat.ts / boss.ts / enemy.ts
- [x] config/balance.ts(PLAYER/SHOT/BOSS/ENEMY)
- [x] config/sceneKeys.ts / storageKeys.ts / assetKeys.ts
- [x] config/gameConfig.ts(解像度/Scale/Arcade物理/重力)
- [x] config/stage1.ts(足場・敵配置・ボストリガ)

## フェーズ3: Persistence

- [x] persistence/SaveManager.ts(load/save/markCleared/updateSettings、isValidSaveData/defaultSaveData 分離)
- [x] tests/unit/persistence/SaveManager.test.ts(既定値/version不一致/例外時 no-throw、15件パス)

## フェーズ4: System 純粋ロジック

- [x] systems/bossAi.ts(weightedRandom/pickNextBossAction、rng 注入)
- [x] systems/shot.ts(isChargedShot/createProjectileSpec/canFire/chargeRatio)
- [x] systems/combatRules.ts(isInvincible/applyDamageToHp/isDead/bossPhaseForHp)
- [x] tests/unit/systems/bossAi.test.ts
- [x] tests/unit/systems/shot.test.ts
- [x] tests/unit/systems/combatRules.test.ts(計 29 件パス)

## フェーズ5: Entity レイヤー

- [x] entities/Projectile.ts(normal/charged、プール対応)
- [x] entities/Player.ts(applyInput/takeDamage/startCharge/releaseShot/点滅無敵)
- [x] entities/Enemy.ts(walker/turret)
- [x] entities/Boss.ts(フェーズ/アクション遷移、bossAi 利用)
- [x] systems/playerMovement.ts(移動の純粋ロジック、テスト容易化のため追加)

## フェーズ6: System クラス

- [x] systems/InputController.ts(左ゾーン移動/右仮想ボタン/キーボード、マルチタッチ)
- [x] systems/CombatSystem.ts(collider 登録/applyDamage/無敵/撃破通知)
- [x] systems/SpawnSystem.ts(loadStage/update/onBossTrigger)
- [x] config/touchLayout.ts(タッチUIレイアウト共有、InputController/TouchControls 用)

## フェーズ7: UI レイヤー

- [x] ui/LifeBar.ts
- [x] ui/BossHpBar.ts
- [x] ui/ChargeGauge.ts
- [x] ui/TouchControls.ts(左右ゾーン/仮想ボタンの描画)

## フェーズ8: Scene レイヤー + エントリ

- [x] scenes/BootScene.ts
- [x] scenes/PreloadScene.ts(生成テクスチャ/アニメ定義)
- [x] scenes/TitleScene.ts
- [x] scenes/GameScene.ts(プレイヤー/敵/ボス/カメラ/物理統括)
- [x] scenes/UIScene.ts(HUD 並行起動)
- [x] scenes/GameOverScene.ts
- [x] scenes/ClearScene.ts(クリア保存)
- [x] scenes/OrientationScene.ts(縦持ち案内)
- [x] main.ts 完成(全シーン登録、build 成功)
- [x] config/registryKeys.ts(HUD 状態共有、追加)

## フェーズ9: PWA

- [x] public/icons 生成(scripts/generate-icons.mjs で 192/512/512-maskable PNG)+ manifest 設定確定
- [x] Service Worker 動作(vite-plugin-pwa、precache 10 エントリにアイコン含む)

## フェーズ10: 統合 / E2E テスト

- [x] tests/integration/input/player-control.test.ts(7件)
- [x] tests/integration/combat/damage-flow.test.ts(7件)
- [x] tests/e2e/play-through/title-to-clear.spec.ts(4件)
- [x] tests/e2e/orientation/rotate-prompt.spec.ts(1件、E2E 計5件パス)
- [x] systems/combatRules.ts に resolveInvincibleDamage 追加(Player と統合テストで共有)

## フェーズ11: 品質チェックと修正

- [x] `npm run typecheck`(エラーなし)
- [x] `npm run lint`(エラーなし)
- [x] `npm test`(58件パス)
- [x] `npm run build`(成功、PWA precache 10 エントリ)

## フェーズ12: ドキュメント更新

- [x] README.md 作成
- [x] CREDITS.md 作成(アセットライセンス: 生成図形のみ)
- [x] docs/architecture.md / repository-structure.md の依存ルール明文化(検証 High 対応: 純粋関数モジュールは最下位扱い)
- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-08

### 最終結果
- `npm run typecheck` / `npm run lint`: エラーなし
- `npm test`(Vitest): ユニット43 + 統合14 = **58件パス**
- `npm run test:e2e`(Playwright, mobile-landscape): **5件パス**
- `npm run build`: 成功(PWA precache 10 エントリ、バンドル gzip 約349KB)
- PRD の P0 受け入れ条件をすべて充足(implementation-validator で確認)

### 計画と実績の差分

**計画と異なった点**:
- **アセット**: 本番スプライト/Tiledタイルマップ未用意のため、design.md の方針どおり Phaser 図形生成のプレースホルダ(`PreloadScene`)とコード定義ステージ(`config/stage1.ts`)で成立させた。将来アトラス/Tiled へ差し替え可能なキー設計を維持。
- **PWAアイコン**: 外部画像を持ち込まず、依存ゼロの Node スクリプト(`scripts/generate-icons.mjs`、自作PNGエンコーダ)で生成。第三者IP混入を回避。
- **E2E検証方法**: Phaser は canvas 描画で DOM からテキストを読めないため、`window.lastSpark` でゲームインスタンスを公開し「アクティブシーンキー」と localStorage を検証する方式にした(テスト専用分岐ではなく常時有効な実行時イントロスペクション)。

**新たに必要になったタスク**:
- `systems/playerMovement.ts`(移動の純粋ロジック): 入力→移動/向き/ジャンプ判定をテスト容易化のため切り出し。
- `systems/combatRules.ts` の `resolveInvincibleDamage`: 無敵時間付きダメージを純粋関数化し、Player と統合テストで同一実装を共有。
- `config/touchLayout.ts` / `config/registryKeys.ts`: タッチUIレイアウトの共有、Scene 間 HUD 状態の疎結合受け渡し。

**検証(implementation-validator)指摘への対応**:
- [High] entities→systems の依存ルール違反 → **docs改訂で整合**(シャビ承認)。architecture.md/repository-structure.md に「systems/ の Phaser 非依存純粋関数モジュール(camelCase)は最下位扱いで entities から参照可。禁止対象は System クラスのみ」を明文化。コード無変更で全テスト維持。
- [Low] `Boss.active2` → `isAlive` にリネーム済み。
- [Medium] 受容(将来対応): 統合テストが実 Player/Enemy を経由していない点 → Phaser を jsdom で動かすのは重く脆いため、純粋ロジックの結合検証 + E2E(実ブラウザ)で代替。`releaseShot` の muzzle/velocity 計算の純粋関数化は次回候補。
- [Low] 受容: `config` のユニットテスト(`getStageData` フォールバック等)は次回追加候補。

### 学んだこと

**技術的な学び**:
- Phaser の `as const` 定数を Entity プロパティ初期化に使うとリテラル型が推論され後続代入で型エラーになる → `: number` 明示で解消。
- Phaser.Scene の組み込みプロパティ(`input`)と同名フィールドは衝突する → `inputController` にリネーム。
- FITスケールモードでは `scale.width/height` は論理サイズ、`displaySize` はアスペクト比維持で常に16:9 → 端末の向き判定は `window.innerWidth/innerHeight` で行う。
- 純粋ロジックの徹底分離(rng注入含む)が、Phaser非依存で意味のあるテストを書く鍵だった。

**プロセス上の改善点**:
- tasklist.md をフェーズ単位でリアルタイム更新し、各フェーズ末に型チェック/テストを挟む刻みが、手戻りを最小化した。
- 検証で出た「docs と実装の依存ルールの粒度ズレ」は、北極星(docs)側を実態に合わせて精緻化することで解消でき、コード churn を避けられた。

### 次回への改善提案
- 本番アセット(スプライトアトラス/Tiledステージ/BGM・SE)の差し替えと、音声解放(iOS自動再生制約)の実装。
- 実 Player/Enemy を経由する統合テストの追加(Phaser 最小モック or muzzle 計算の純粋関数化)。
- バンドル分割(Phaser を manualChunks で別チャンク化)で初回ロード体感を改善。
- 実機(iOS Safari/Android Chrome)での横向き両手操作・仮想ボタン透明度/サイズの調整。
