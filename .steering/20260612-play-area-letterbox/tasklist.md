# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: コントロール帯モジュール

- [x] `src/config/controlBand.ts` を新規作成
  - [x] 定数 `CONTROL_BAND_MIN_PX` / `CONTROL_BAND_MAX_PX` / `CONTROL_BAND_RATIO` を定義
  - [x] `controlBandHeight(screenHeight, enabled)` 純粋関数を実装（非タッチ/高さ0以下で0、タッチ時クランプ）
  - [x] `isTouchControlEnabled(game)` を実装（`game.device.input.touch`）
  - [x] `resolveControlBand(scene)` を実装
- [x] `tests/unit/config/controlBand.test.ts` を新規作成
  - [x] 非タッチで 0 を返す
  - [x] タッチ時に比率値を返す（中間値）
  - [x] 背の高い画面で MAX にクランプ
  - [x] 背の低い画面で MIN にクランプ
  - [x] screenHeight<=0 で 0

## フェーズ2: タッチレイアウトの帯対応

- [x] `src/config/touchLayout.ts` の `createTouchLayout` に `bandHeight = 0` 引数を追加
  - [x] `bandHeight<=0` は従来の対角配置を維持（後方互換）
  - [x] `bandHeight>0` は JUMP/SHOT を帯の縦中央に水平配置（非重なり維持）
- [x] `tests/unit/config/touchLayout.test.ts` に帯ありケースを追記
  - [x] band>0 でボタンが帯の縦範囲内に収まる
  - [x] band>0 でボタンが帯の縦中央付近に来る
  - [x] band>0 でも両ボタンは移動ゾーン外（右側）
  - [x] band>0 でも 2 ボタンが重ならない
  - [x] band 省略時は従来位置（後方互換）

## フェーズ3: 帯背景の描画

- [x] `src/ui/TouchControls.ts` の `render` に `width` と `bandHeight` を追加
  - [x] `bandHeight>0` のとき帯背景塗り + 上端アクセント線を描画
  - [x] ボタン/ラベルは layout 座標に追従（配置は touchLayout 一元化）

## フェーズ4: カメラ viewport の縮小

- [x] `src/scenes/GameScene.ts` の `applyCameraZoom` を `applyCameraLayout` に拡張
  - [x] `resolveControlBand` で帯高さを解決
  - [x] viewport 高さを `scale.height - band` に設定
  - [x] zoom を viewport 高さ基準に再計算
  - [x] RESIZE ハンドラ/SHUTDOWN 解除を新メソッドに差し替え

## フェーズ5: UIScene / InputController への伝播

- [x] `src/scenes/UIScene.ts` で band を解決し createTouchLayout / render に反映
- [x] `src/systems/InputController.ts` のレイアウト生成を band 基準に変更
  - [x] コンストラクタの初期レイアウト
  - [x] `refreshLayout`

## フェーズ6: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`（161 tests pass）
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`

## フェーズ6.5: 実装検証(ギュレル)の指摘反映

- [x] 移動ゾーンの高さを帯ありパスで `height - bandHeight` に切り詰め（ガイド枠が帯へ食い込まない）
- [x] 移動ヒント `◀ MOVE ▶` を帯ありのときプレイ領域下端へ移動（帯との視覚的分離）
- [x] テスト追記: 移動ゾーン高さがプレイ領域に切り詰まる / 最小帯高さでもボタン収容 / 画面高さ1pxのMINクランプ

## フェーズ7: ドキュメント更新

- [x] 永続ドキュメント(`docs/`)への影響を判断し、必要なら更新
  - [x] `docs/functional-design.md` のタッチUIセクションを下部コントロール帯ベースに更新
- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 追加修正(リリース後フィードバック対応 2026-06-12)

シャビから「プレイ画面が小さくなって見えづらい」「ボスの出現がおかしな位置から発生する」報告。
Playwright で実機相当を観察し原因を特定・修正した。

- [x] 原因特定(実測): ①`device.input.touch` はタッチ対応PCでも true → デスクトップで帯が出て約22%縮小。②ズームを `viewH/GAME_HEIGHT` に変えたため displayWidth 膨張でボストリガーが早まり縦フレーミングも drift。
- [x] 端末判定を厳格化: `(pointer: coarse)` かつ `(any-pointer: fine)` 無しの純タッチ端末のみ帯を出す。マウス併用PC/デスクトップはフル画面維持(`isTouchControlEnabled`)。
- [x] 帯の縮小を緩和: `CONTROL_BAND_RATIO` 0.22→0.18、`MIN` 112→104、`MAX` 168→140。
- [x] テスト追加: `isTouchControlEnabled` の判定(純タッチ/タッチPC/デスクトップ/フォールバック)。定数変更に伴う期待値更新。
- [x] 目視検証(Playwright): デスクトップ=帯なしフル画面で元の描画に復帰 / モバイル=帯が正しく分離表示されボスがプレイ領域に見える。
- [x] ドキュメント更新: `functional-design.md` の端末判定条件を反映。

## 実装後の振り返り

### 実装完了日
2026-06-12

### 計画と実績の差分

**計画通り進んだ点**:
- `controlBand.ts`(帯高さ純粋関数 + タッチ判定)を分離し、GameScene/UIScene/InputController が共有する設計を予定通り実装。
- `bandHeight<=0` での従来挙動維持により、非タッチ実行の既存 E2E を一切壊さず後方互換を確保。

**計画から追加した点(検証フィードバック反映)**:
- ギュレル(implementation-validator)の指摘を受け、帯ありパスで `moveZone.height` をプレイ領域高さに切り詰め、移動ゾーンのガイド枠が帯に食い込まないようにした(描画順の偶然依存を解消)。
- 移動ヒント `◀ MOVE ▶` を帯ありのときプレイ領域下端へ移動し、帯との視覚的分離を明確化。
- 境界値テストを追加(画面高さ1pxのMINクランプ / 最小帯高さでのボタン収容 / 移動ゾーン高さの切り詰め)。テスト総数 161→164。

**技術的理由でスキップしたタスク**: なし(全タスク完了)。

### 学んだこと

**技術的な学び**:
- Scale.RESIZE 構成では `scene.scale.height` が実キャンバスpx。カメラ viewport を `height - band` に縮め、zoom を viewport 基準にすればワールド全高(GAME_HEIGHT)を保ったまま下部に帯を作れる。
- 入力判定(`isInMoveZone`)が横座標のみのため、`moveZone.height` は当たり判定に影響せず純粋に描画用。役割を理解した上で切り詰めると安全に整理できる。

**プロセス上の改善点**:
- requirements(plan-feature)→design/tasklist(add-feature)の分業がスムーズ。帯高さポリシー等の未決事項を requirements に残しておくと設計フェーズで既定を決めやすい。

### 次回への改善提案
- 視覚要素を含む変更は、ユニット/検証に加え実機相当(タッチ有効ブラウザ)でのスクリーンショット確認を1回挟むと、帯の見栄え(高さ・色)の実機調整が早く回る。
- 帯高さの実機調整値(`CONTROL_BAND_RATIO`/MIN/MAX)は実機フィードバックで微調整余地あり。
