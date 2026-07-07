# 開発ガイドライン (Development Guidelines)

> `docs/architecture.md` / `docs/repository-structure.md` を前提に、`LAST SPARK`(Phaser 3 + Vite + PWA / TypeScript)開発のコーディング規約と開発プロセスを定義する。

## コーディング規約

### 命名規則

#### 変数・関数

```typescript
// ✅ 良い例
const chargeElapsedMs = now - player.chargeStartedAt;
function pickNextBossAction(phase: BossPhase, last: BossAction): BossAction { }

// ❌ 悪い例
const t = now - player.c;
function pick(a: any): any { }
```

**原則**:
- 変数: camelCase、名詞または名詞句。単位を含む値は単位を名前に入れる(`...Ms`, `...Px`, `...Ratio`)。
- 関数: camelCase、動詞で始める(`spawnEnemy`, `applyDamage`)。
- 定数: UPPER_SNAKE_CASE もしくは `as const` オブジェクト(`SHOT.chargeThresholdMs`)。
- Boolean: `is` / `has` / `should` で始める(`isCharging`, `onGround` のような状態名も可)。

#### クラス・インターフェース・型

```typescript
// クラス: PascalCase、名詞(レイヤー接尾辞を付ける)
class GameScene extends Phaser.Scene { }
class CombatSystem { }
class SaveManager { }

// インターフェース: PascalCase(I 接頭辞は付けない方針)
interface SaveData { }
interface InputState { }

// 型エイリアス: PascalCase
type BossAction = 'idle' | 'move' | 'shoot' | 'jump' | 'stagger' | 'dive' | 'hover' | 'missile' | 'spray' | 'summon';
```

ファイル命名はリポジトリ構造定義書に従う(シーン=PascalCase+`Scene`、定数=camelCase 等)。

### コードフォーマット

- **インデント**: 2スペース。
- **行の長さ**: 最大 100 文字を目安。
- **セミコロン**: あり。**クォート**: シングルクォート。これらは Prettier に従い手動調整しない。
- フォーマット/静的解析は ESLint + Prettier に一任する(`npm run lint` / `npm run format`)。

### マジックナンバー・ハードコーディングの禁止

CLAUDE.md のルールに従う。**特にゲームのチューニング値・キー・URL を本番コードに直書きしない。**

```typescript
// ❌ 悪い例: 速度・しきい値が散らばる
this.setVelocityX(160);
if (elapsed >= 600) fireCharged();

// ✅ 良い例: config に集約
import { PLAYER, SHOT } from '../config/balance';
this.setVelocityX(PLAYER.moveSpeed);
if (elapsed >= SHOT.chargeThresholdMs) fireCharged();
```

- ゲーム定数は `src/config/`(`balance.ts`, `sceneKeys.ts`, `storageKeys.ts`)へ。
- 外部 URL/キー等(将来導入時)は `import.meta.env.VITE_*` 経由。ソース・ドキュメントに実値を書かない。
- **テスト用の分岐(`if (testMode)`)やマジック値を本番コードに入れない。**

### コメント規約

```typescript
/**
 * ボスの次アクションを重み付き抽選で決定する。
 * 直前と同じアクションは重みを半減させ、連続を抑制する。
 *
 * @param phase - 現在のボスフェーズ
 * @param last - 直前に実行したアクション
 * @returns 次に実行するアクション
 */
function pickNextBossAction(phase: BossPhase, last: BossAction): BossAction { }
```

- インラインコメントは「なぜ」を書く。「何をしているか」はコードで表現する。

```typescript
// ✅ なぜ: iOS Safari は初回ユーザー操作までオーディオを再生できない
sound.unlockOnFirstPointer();
```

### エラーハンドリング

**原則**:
- プレイ継続を最優先。永続化・アセットの失敗でゲームを止めない(フォールバック)。
- 予期しない例外は当該シーンを安全に停止しタイトルへ復帰。内部情報をユーザーに露出しない。

```typescript
// localStorage は環境により例外/不可。throw せず既定値で継続する
load(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.save);
    if (!raw) return defaultSaveData();
    const parsed = JSON.parse(raw) as SaveData;
    return isValidSaveData(parsed) ? parsed : defaultSaveData(); // 破損/バージョン不一致は既定へ
  } catch {
    return defaultSaveData(); // 進行不能を防ぐ
  }
}
```

### セキュリティ・パフォーマンス(実装時)

- **セキュリティ**: 外部通信なし(MVP)。localStorage 読込値は型/バージョン/値域を検証。機密情報を持たない。第三者IPを使わない。
- **パフォーマンス**: 弾/エフェクトはオブジェクトプールで再利用。`update` 内で毎フレーム new しない。スプライトはアトラス化。画面外の敵は更新を抑制。物理は Arcade のみ。

### Phaser シーンのライフサイクル(イベントリスナーの後始末)

- **リスナー登録と後始末はワンセットで書く**。`input.keyboard.on(...)` 等をシーンに足したら、同じ箇所で `this.events.once(Phaser.Scenes.Events.SHUTDOWN, off)` を並べて登録し、シーン終了時に確実に解除する(登録だけ書いて解除を別所・非対称に置かない)。解除漏れはシーン再起動時の二重発火や停止済みシーンへのコールバックによる不具合・リークを生む。UI を追加するたびのレビュー定型チェックとする。
- **ポーズからの破壊的遷移は先に `scene.resume()` してから遷移を呼ぶ**。Phaser のカメラフェードはクロック停止中(ポーズ中)に進まず、`scene.start` 系の遷移が固まるため。ポーズ解除を遷移の前段に集約する。

### `GameSettings` 拡張時の手順チェックリスト

`types/save.ts` の `GameSettings` のような中核型にフィールドを追加する変更は、複数箇所への波及漏れが繰り返し発生してきた(`busterMode` 追加時・`vibration`/コヨーテタイム関連のフィールド追加時など)。フィールドを追加する際は次の手順を必ず踏む。

1. **まず任意フィールド化で表現できないか検討する**。任意フィールド(例: `bestRank?`)なら `SAVE_VERSION` を据え置ける。既存セーブは読込時に未定義のまま扱われ、`migrate()` を書かずに済む。
2. **既定値を伴う必須フィールドが要る場合のみ** `SAVE_VERSION` を繰り上げ、`SaveManager.migrate()` に旧バージョンからの補完ロジックを追加する(補完しないと旧セーブが読み込み時に既定値へ丸ごとフォールバックし、進捗が消える)。
3. 型を追加したら、**参照する全リテラルをキー名で grep するか `tsc --noEmit` に炙り出させる**。少なくとも次の置き場所を確認する: `defaultSettings` / `normalizeSettings` / `isValidSettings` 相当の検証関数、`SoundManager` 等サービス側の既定値、テストのファクトリ(`SaveManager.test.ts` の `DEFAULT_SETTINGS` 等)。
4. バージョン不一致・フィールド欠損時に**進行不能にならないこと**をテストで固定する(旧バージョンのセーブを読ませて既定補完されるケースを検証)。

### Phaser 実装の既知の罠

- **tween を同一プロパティで重ねない**: 同じ `alpha` に対してフェードと明滅を両方 tween すると競合する。片方を `scale` 等の別プロパティへ逃がして両立させる。
- **tint の基準値を保持する**: 被弾フラッシュ(`clearTint()` で解除)と恒常的な配色(周回ごとの配色変更等)を両立させる場合、フラッシュの立ち下がりで真っさらな `clearTint()` ではなく `baseTint` のような基準値へ戻す。
- **パーティクルの継続発生は `frequency` ベースの「生成即発生」が確実**。`emitting: false` にしてから `start()` する方式は Phaser のバージョンによって発生フローが復帰しないことがある。
- **`Container` の `hitArea` は左上原点で指定する**(`new Phaser.Geom.Rectangle(0, 0, w, h)`)。中央原点の `Rectangle` を使うと当たり判定が左上へ半分ズレる。
- **画面寸法の取得は `getViewportSize()`(`visualViewport` 優先)に一元化**し、新規コードで `window.innerWidth` を直読みしない(モバイルの `orientationchange` 時に stale 値を返すことがある)。
- **`Scale.NONE` + `zoom` 併用時は `resize()` → `setZoom()` の順で呼ぶ**。逆順だと生 `devicePixelRatio` が 1 の端末でだけ canvas の CSS サイズが追従しない非対称なバグになる。スケーリング周りを変更したら **DPR 1 と DPR 2 以上の両方で** e2e 検証する。
- **`scene.pause()`/`resume()` はキーの押しっぱなし状態(`isDown`)をリセットする**。長押しを検証する e2e ヘルパーは、ポーズを挟むテストで毎フレーム/毎周期キーイベントを再送する実装にする。

### 難易度・バランスパラメータの分散に関する留意点

難易度(`normal`/`hard`)・周回(New Game+)による強さの変化は、敵 HP だけでなく「移動速度」「発射頻度」「プレイヤー被ダメージ倍率」「出現経路(ステージ道中 or ボスの召喚)」など**複数軸に分散**している。特定の敵・ボスだけバランスを調整する場合は、この全軸を確認してから数値を変更する(HP だけ揃えて接触ダメージや召喚雑魚の値を揃え忘れる、といった抜けを防ぐ)。

### 演出(エフェクト)実装の指針

- **演出強度はアクションの強さと序列を一致させる**。新しいアクション(強化ショット・新ボス攻撃等)を追加したら、既存アクションと発射/着弾/撃破の演出強度(閃光スケール・カメラシェイク強度等)を比較し、序列が逆転していないか確認する。
- **短寿命エフェクトの実機検証は、本番経路の呼び出し + `scene.children.list` の増分でアサートする**。スクリーンショットは撮影間隔(300ms 程度)より短命なエフェクトのピークを逃すため、補助確認に留める。

### アクセス制御機能の実装

ステージのロック/解放、機能の有効/無効切り替えなど、**到達を制限する機能**を実装するときは、対象の操作(該当ステージへの遷移・該当機能の実行等)に到達できる**全ての経路を先に列挙**してから制御ロジックを入れる。UI 上の1経路だけ塞いでも、別画面・別導線から素通りできる抜け道が残りやすい。

### AI生成キャラアセットの取り扱い

- 横スクロールアクションでは横向き・複数フレームの歩行アートが要るが、AI 生成の一枚絵は横向き差分の生成が苦手。カットアウト・リグ(1枚絵をパーツごとにアルファ走査で切り出し、関節位置で振る)で対応する場合、脚は股関節で交差するため矩形マスクでは分離できず、**行ごとの左右クラスタ分け**でパーツ境界を判定する必要がある。
- OpenAI の `gpt-image` 等が生成する PNG は **C2PA 来歴チャンク**を含むことがある。生成画像をマスター素材としてリポジトリに含める場合は、`sharp` 等で再保存してメタデータを除去してから追加する。

## Git運用ルール

### ブランチ戦略

プロジェクト `CLAUDE.md` の Git 運用ルールを正とする。**`master` への直接コミットは禁止**し、実装・修正はすべて `feature` ブランチ + **専用の `git worktree`** で隔離して行う(複数セッションの並行作業による競合・変更の混在を防ぐ)。

- `master`: 本番(公開)にデプロイ可能な唯一の統合ブランチ(旧 `main` / `develop` は廃止)。
- `feature/<説明>`: 新機能・修正・リファクタリングすべてに用いる作業ブランチ(例: `feature/charge-shot`, `feature/stage3-cutscene`)。軽微な修正でも原則 `feature` を切る。

```
master
  ├─ feature/title-scene      (worktree: ../last-spark-title-scene)
  ├─ feature/boss-ai          (worktree: ../last-spark-boss-ai)
  └─ feature/orientation-prompt (worktree: ../last-spark-orientation-prompt)
```

#### ワークフロー

1. **作業開始**: 先に `master` を `git pull` で最新化し、その最新 `master` から `git worktree` で専用ディレクトリを作成して作業する。`master` 本体ツリーで直接実装しない。
   - 作成例: `git worktree add ../last-spark-<説明> -b feature/<説明> master`
2. **作業完了**: ① `master` を pull → ② `feature` に最新 `master` を取り込み(コンフリクト解消)→ ③ コミット前にセキュリティレビュー(security-engineer)→ ④ `feature` を push → ⑤ `gh pr create` で PR 作成 → ⑥ **Merge commit 方式**で `master` へマージ。
3. **マージ後**: `feature` ブランチを削除(ローカル/リモート両方)し、**作業に使った worktree も必ず削除**する(`git worktree remove ../last-spark-<説明>`)。マージ完了と worktree 削除はワンセット。`--force` は使わない。

### コミットメッセージ規約(Conventional Commits)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**: `feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore` / `perf`
**scope の例**: `scene` / `entity` / `system` / `input` / `pwa` / `config`

```
feat(system): ボスのフェーズ移行と行動抽選を実装

HP 50% で phase2 に移行し、jump の頻度を上げて攻勢を強める。
直前アクションの重みを半減して連続を抑制する。

Closes #12
```

### コミット前の必須チェック(CLAUDE.md 準拠)

- [ ] 型チェック(`npm run typecheck`)が通る
- [ ] Lint エラーがない(`npm run lint`)
- [ ] テストが通る(`npm test`)
- [ ] **コミット前にセキュリティレビュー(security-engineer)を実施**。ハードコーディング(URL/キー/AWS情報)・XSS・依存の脆弱性等を確認し、Critical/High は修正してから commit。

### ドキュメント同期の必須化(機能追加・仕様変更時)

ステージ・ボス・ストーリー・操作仕様など**プレイ可能な仕様に影響する変更**を加えたら、対応する永続ドキュメント(`docs/`)の更新を「実装完了の一部」として必ず行う。実装だけ進め、docs 更新を後回しにしない(`docs/` はソースを正本として同期する建て付けのため、乖離が積み上がると北極星として機能しなくなる)。

- **更新トリガーと反映先の目安**:
  - ボス系統・アクション追加 → `functional-design.md`(ボス系統/アクション)・`glossary.md`(ボスアクション表)
  - ステージ追加・`StageData` フィールド追加 → `functional-design.md`(StageData)・`repository-structure.md`
  - 操作・ショット仕様変更 → `product-requirements.md`・`functional-design.md`・`glossary.md`
  - レイヤー/依存ルールの変更 → `architecture.md`・`repository-structure.md`
- PR の「変更内容」に **docs 更新の有無**を明記する(更新不要なら理由を一言添える)。

### プルリクエストプロセス

**作成前チェック**: 上記必須チェックに加え、競合解決済みであること。

**PRテンプレート**:
```markdown
## 概要
[変更内容の簡潔な説明]

## 変更理由
[なぜこの変更が必要か / 関連する PRD・設計の項目]

## 変更内容
- [変更点1]
- [変更点2]

## テスト
- [ ] ユニット/統合テスト追加・更新
- [ ] 実機 or エミュレータで手動確認(横向き両手操作)

## スクリーンショット/動画(UI 変更時)
[画像 or 動画]

## 関連Issue
Closes #[Issue番号]
```

**レビューフロー**: セルフレビュー → 自動チェック(CI)→ レビュアーアサイン → 指摘対応 → 承認後マージ。

## テスト戦略

CLAUDE.md のテスト原則を厳守する: **意味のないアサーション禁止・テストのためのハードコード禁止・Red→Green→Refactor・境界/異常系も検証。**

### テストピラミッド
- **ユニット(多)**: Phaser 非依存の純粋ロジックを厚く。`bossAi`(抽選)、チャージ境界、`SaveManager`、ダメージ/無敵。
- **統合(中)**: System + Entity の連携(入力→移動/発射、衝突→HP→撃破)。
- **E2E(少)**: Playwright で主要ユーザーシナリオ。

### ユニットテスト例(意味のある検証 / 境界値)

```typescript
import { describe, it, expect } from 'vitest';
import { isChargedShot } from '../../src/systems/shot';
import { SHOT } from '../../src/config/balance';

describe('isChargedShot', () => {
  it('しきい値未満の長押しは通常弾になる', () => {
    expect(isChargedShot(SHOT.chargeThresholdMs - 1)).toBe(false);
  });

  it('しきい値ちょうどの長押しはチャージ弾になる', () => {
    expect(isChargedShot(SHOT.chargeThresholdMs)).toBe(true);
  });
});
```

### ボスAI(抽選)テスト例

```typescript
describe('pickNextBossAction', () => {
  it('jump は phase1 でも選ばれうる', () => {
    const results = new Set(
      Array.from({ length: 200 }, () => pickNextBossAction('phase1', 'idle'))
    );
    expect(results.has('jump')).toBe(true);
  });
});
```

### テスト命名規則
- パターン: 日本語で「条件 → 期待結果」が読み取れる説明、または `[対象]_[条件]_[期待結果]`。
- `it('test1')` や `expect(true).toBe(true)` のような無意味なテストは禁止。

### モックの方針
- Phaser のシーン/物理など外部依存は最小限のモックに留め、検証対象のロジックは実装を使う。
- 純粋ロジックは Phaser から切り出してモック不要でテストできる構造にする(`src/systems/` の関数群)。

### シーン遷移を近道するテストの注意

E2E/統合テストで `scene.scene.start(...)` を直接呼んで特定シーンへ近道する場合、本番のシーン遷移が本来伴う前処理(並行起動している別シーンの `scene.stop()` 等)を事前に確認する。近道が前処理を素通りすると、本番では起きない状態(二重起動シーンの残存等)がテストにだけ現れることがある。

### データテーブルの網羅テスト(列挙キー全数チェック)

`BGM` / `SE`(`config/audio.ts`)のように **列挙キーごとに定義を持つデータテーブル**をテストする際は、個別キーを列挙して検証するのではなく `Object.keys(...)` で**全キーを走査**し、各定義が満たすべき不変条件(必須フィールドの存在・値域・非空のノート列など)を検証する。

```typescript
// ✅ 新トラック/新SEを足しても自動でテスト対象に含まれる
for (const key of Object.keys(BGM) as BgmKey[]) {
  const track = BGM[key];
  expect(track.notes.length).toBeGreaterThan(0);
  // 各トラックが満たすべき不変条件を検証
}
```

個別キーをハードコードして検証すると、**キーを追加したときにテストが追従せず**(新トラックが未検証のまま通る)抜けが生じる。列挙キーの全数走査ならテーブル拡張に自動で追従する。

### カバレッジ
- コアロジック(config/system の純粋関数)で 80% 以上を目安。数値より実質的な検証を優先。

## コードレビュー基準

**機能性**: 要件(PRD 受け入れ条件)を満たすか / エッジケース(縦持ち・localStorage 不可・連打)/ エラーハンドリング。
**可読性**: 命名 / なぜを説明するコメント / 複雑なロジックの説明。
**保守性**: 重複排除 / レイヤー責務の分離(依存方向違反がないか)/ 影響範囲。
**パフォーマンス**: `update` 内の無駄な生成がないか / プール利用 / 画面外更新の抑制。
**セキュリティ**: 入力検証 / ハードコーディング(URL/キー/AWS情報)がないか / 第三者IPの混入がないか。

### レビューコメントの優先度
- `[必須]` 修正必須 / `[推奨]` 修正推奨 / `[提案]` 検討依頼 / `[質問]` 確認。建設的に、理由とともに書く。

## 品質自動化(CI)

CI(GitHub Actions 想定)で以下を自動実行する:
- `npm run typecheck`(tsc --noEmit)
- `npm run lint`
- `npm test`(Vitest)
- `npm run build`(Vite ビルドの成功確認)

開発体験を優先し、feature ブランチへの push では PR と重複する CI を起動しない。

PR では `typecheck` / `lint` / Vitest / build(`verify` ジョブ)に加えて、`e2e-smoke`(`npm run test:e2e:smoke`)を**並列**かつ**非必須チェック**(branch protection 対象外)として実行する。リリース速度を落とさずに E2E カバレッジを得るための設計は次の3点セット: ①並列ジョブ化(`verify` を待たせない)②非必須チェック化(`verify` が緑になればマージ可能、smoke の失敗はブロックしない)③ブラウザキャッシュ(起動コストを抑える)。個人開発では、まずこの非ブロッキング運用から始めるのが妥当(必須化は安定稼働の実績を積んでから検討する)。

全件の E2E(`npm run test:e2e`)は `workflow_dispatch` で明示実行する(`e2e_suite: full`)。通しプレイや物理タイミング検証は有用だが、PR/push ごとに毎回待たせるゲートにはしない。

master への push では GitHub Pages deploy を実行する。master に入る変更は PR CI で検証済みとみなし、deploy job は公開アーティファクト生成に必要な `npm run build` を中心に短く保つ。

## 開発環境セットアップ

### 必要なツール

| ツール | バージョン | 備考 |
|--------|-----------|------|
| Node.js | v24.11.0 | devcontainer に同梱 |
| npm | 11.x | Node に同梱 |

### セットアップ手順

```bash
# 1. リポジトリのクローン
git clone <REPOSITORY_URL>
cd last-spark

# 2. 依存関係のインストール
npm install

# 3. 環境変数(将来導入時のみ)
cp .env.example .env   # 現状 MVP は外部通信なしのため不要な場合あり

# 4. 開発サーバーの起動(Vite)
npm run dev

# 5. 各種チェック
npm run typecheck
npm run lint
npm test
npm run build         # 本番ビルド(PWA 生成を含む)
```

### 推奨開発ツール
- **VS Code 拡張**: ESLint / Prettier。
- **実機確認**: スマホ実機(iOS Safari / Android Chrome)で横向き・両手操作を確認(仮想ボタンの透明度/サイズ調整)。
