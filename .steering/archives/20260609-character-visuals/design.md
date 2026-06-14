# 設計書

## アーキテクチャ概要

**方針: 「物理エンティティ」と「見た目リグ」を分離する。**

既存の Player / Enemy / Boss は `Phaser.Physics.Arcade.Sprite` のまま据え置き、
物理ボディ・衝突・`update` 駆動・HP/フェーズ等のロジックは一切変更しない
（非機能要件「物理ボディサイズ踏襲」「既存ロジックを壊さない」を満たす最小侵襲策）。

各エンティティは自身のスプライト表示を隠し（`setVisible(false)`）、代わりに
`CharacterRig`（`Phaser.GameObjects.Container`。頭・胴・腕・脚のパーツ画像を子に持つ）を
生成・保持する。リグは毎フレーム、所有エンティティの座標へ追従し、エンティティの
状態（移動/接地/発射/被弾 等）に応じて手続き的にパーツを動かす。

アニメーションは**スプライトシートを使わず、トゥイーン/手続き駆動**（脚スイング、
ジャンプのスクワッシュ&ストレッチ、攻撃リコイル、被弾のけぞり）。アニメ計算は純粋関数
モジュールに切り出し、Phaser 非依存でユニットテスト可能にする。

```
GameScene.update(time)
  └─ entity.applyInput / entity.update        (物理・ロジック: 既存のまま)
        └─ entity が rig を駆動:
             rig.syncTo(entity)               座標/向き/可視を同期
             rig.setMotionState(state)        idle/walk/jump/fall/attack/hit/stagger/dead
             rig.update(time)                 パーツを手続きアニメ

CharacterRig (Container)
  ├─ head / torso / armBack / armFront(=cannon) / legBack / legFront  (Image 部品)
  └─ rigAnimation.ts の純粋関数で各パーツの角度/オフセット/スケールを算出

PreloadScene
  └─ パーツのテクスチャを Graphics で手続き生成 (ネオン配色, assetKeys に集約)
```

## コンポーネント設計

### 1. パーツテクスチャ生成（`PreloadScene` + `assetKeys`）

**責務**:
- 頭・胴・腕・脚など、キャラ系統（player / walker / turret / boss）ごとのパーツ
  テクスチャを `Graphics` で手続き生成する。
- 暗め基調＋ネオン発光（系統ごとに異なるアクセント色）で描く。

**実装の要点**:
- `assetKeys.ts` に `PART` キー群を追加（例: `part-player-head` 等）。将来のアトラス
  差し替えに備え、文字列直書きせずキーで集約する既存方針を踏襲。
- 既存の `makeCharacter`（箱＋コア）は弾/地形等で使わないなら段階的に整理するが、
  キャラ4種はパーツ生成へ置き換える。互換のため当面は併存可。
- 物理ボディサイズは `balance.ts` の width/height を引き続き `body.setSize` で使用し、
  リグの見た目寸法はそこから導出（はみ出しすぎない範囲で調整）。

### 2. リグ構成定義（`src/config/characterRig.ts` 新規）

**責務**:
- 系統ごとのパーツ構成（各パーツのテクスチャキー・基準オフセット・関節ピボット・
  スイング量・配色アクセント）をデータとして定義する。

**実装の要点**:
- `balance.ts` の各キャラ width/height を入力に、パーツ配置を比率で算出。
- マジックナンバーを本番ロジックに散らさず、調整の単一窓口にする（既存 `balance`/
  `touchLayout` と同じ設計思想）。
- turret は脚なし（砲台）、boss は重量級プロポーション、walker は二足、player は
  ヘルメット頭＋片腕アームキャノン、と系統差をここで表現。

### 3. アニメーション計算（`src/systems/rigAnimation.ts` 新規・純粋関数）

**責務**:
- 状態と時刻/速度から、各パーツの変位を返す純粋関数群。
  - `legSwing(phase)`: 歩行の脚振り角（sin 波）。
  - `walkPhase(distanceOrTime, speed)`: 歩行位相の進行。
  - `squashStretch(vy)`: 上昇/下降に応じた縦横スケール（踏切で縮み空中で伸びる）。
  - `armRecoil(elapsed, duration)`: 発射後の腕リコイル量（時間減衰）。
  - `hitLean(active)`: 被弾のけぞり角。
- `MotionState` 型（'idle'|'walk'|'jump'|'fall'|'attack'|'hit'|'stagger'|'dead'）を定義。

**実装の要点**:
- Phaser へ非依存（数値 in / 数値 out）。これによりユニットテストを厚くできる。
- 境界（phase 折返し、vy=0、elapsed>=duration）を明示的に扱う。

### 4. 見た目リグ（`src/entities/CharacterRig.ts` 新規）

**責務**:
- パーツ Image を `characterRig` 定義から生成し Container に組み立てる。
- `syncTo(entity)`: 位置・深度・可視・左右向き（facing）を同期。
- `setMotionState(state)`: 状態遷移を受け取り、攻撃/被弾などの一過性タイマを開始。
- `update(time)`: `rigAnimation` を用いてパーツの角度/オフセット/スケールを更新。
- `setTint/clearTint`（ボス stagger 用）、`setAlpha`（被弾点滅用）を子パーツへ適用。
- `destroy()`: エンティティ破棄時にリグも破棄（リーク防止）。

**実装の要点**:
- facing は Container の `scaleX` 符号で反転（既存 `setFlipX` 相当を置換）。
- 深度は所有エンティティと同じに設定（player 10 / boss 9 / enemy 8）。
- Container には `setTint` が無いため、子 Image を走査して個別適用するヘルパを持つ。

### 5. エンティティ結線（`Player.ts` / `Enemy.ts` / `Boss.ts`）

**責務**:
- 既存ロジックは維持しつつ、コンストラクタでリグ生成＆自スプライト非表示。
- 各 `update`/`applyInput` の末尾でリグへ状態を渡し同期する。
- 既存の `setFlipX`/`setTint`/`setAlpha`（向き・stagger・点滅）をリグ呼び出しに置換。

**実装の要点**:
- Player: 接地/速度/ジャンプ/発射/無敵から MotionState を導出。`releaseShot` で
  リグに attack を通知。`updateBlink` を rig.setAlpha へ委譲。
- Enemy: walker は walk 固定＋反転、turret は idle＋発射時 attack。`disableBody` 時に
  リグも非表示、`destroy` でリグ破棄。
- Boss: 現在の `currentAction`（idle/move/jump/shoot/stagger）を MotionState へマップ。
  既存の stagger ティントを rig.setTint に置換。

## データフロー

### プレイヤーの歩行〜発射
```
1. GameScene.update → player.applyInput(input, time)
2. 既存の移動/ジャンプ/発射ロジックが速度・状態を更新
3. applyInput 末尾で motionState を導出（接地&横入力→walk 等）
4. rig.syncTo(player); rig.setMotionState(state); rig.update(time)
5. rig が rigAnimation で脚振り/リコイルを算出しパーツへ反映
```

### ボスの被弾→stagger
```
1. boss.takeDamage → 蓄積が閾値で currentAction='stagger'
2. boss.update → executeAction が stagger を検知
3. rig.setMotionState('stagger'); rig.setTint(0xff6b6b)
4. rig.update で hitLean によりのけぞり姿勢
```

## エラーハンドリング戦略

### カスタムエラークラス
- 不要（描画レイヤーであり、外部 I/O・例外発生源を持たない）。

### エラーハンドリングパターン
- リグ生成時にテクスチャキー未登録でも Phaser が警告を出すだけで落ちないが、
  `assetKeys` の `PART` を単一の真実とし、PreloadScene 生成と齟齬が出ないようにする。
- エンティティ破棄とリグ破棄の対応漏れ（リーク）を防ぐため、`destroy` を必ず連動。

## テスト戦略

### ユニットテスト
- `rigAnimation.ts` の純粋関数（`tests/unit/systems/rigAnimation.test.ts` 新規）:
  - `legSwing` が位相 0/π で 0、π/2 で最大など符号・境界を検証。
  - `squashStretch` が vy<0（上昇）で縦伸び、vy>0（下降）で別挙動、vy=0 で中立。
  - `armRecoil` が elapsed=0 で最大、duration 経過で 0、範囲内単調減少。
  - `walkPhase` の折返し（2π 周期）。
- `characterRig` 設定の整合（任意）: 系統ごとに必須パーツキーが存在すること。

### 統合テスト
- 既存ユニットテスト（boss AI / charge 境界 / SaveManager / damage）が**全て green** の
  ままであること（リグ導入が物理・ロジックに影響しないことの確認）。
- 目視: `npm run dev` で4キャラの歩行/ジャンプ/攻撃/被弾を確認（受け入れ条件）。

## 依存ライブラリ

新規追加なし（要件: 外部アセット・新規 npm 依存を追加しない）。

```json
{}
```

## ディレクトリ構造

```
src/
  config/
    assetKeys.ts        # PART キー追加
    characterRig.ts     # 新規: 系統別リグ構成
  systems/
    rigAnimation.ts     # 新規: アニメ計算(純粋関数) + MotionState 型
  entities/
    CharacterRig.ts     # 新規: Container ベースの見た目リグ
    Player.ts           # 結線(自表示非表示, rig 駆動)
    Enemy.ts            # 結線
    Boss.ts             # 結線
  scenes/
    PreloadScene.ts     # パーツテクスチャ生成
tests/
  unit/
    systems/
      rigAnimation.test.ts  # 新規
```

## 実装の順序

1. `assetKeys` に PART キー追加 → `PreloadScene` でパーツテクスチャ生成。
2. `characterRig` 設定（系統別構成）を定義。
3. `rigAnimation`（純粋関数 + 型）と そのユニットテストを実装（Red→Green）。
4. `CharacterRig`（Container 見た目リグ）を実装。
5. `Player` → `Enemy` → `Boss` の順に結線（自表示非表示・状態マップ・flip/tint/alpha 置換）。
6. テスト/リント/型/ビルドを通す。目視確認。

## セキュリティ考慮事項

- 外部入力・ネットワーク・シークレットを扱わない純粋な描画変更。新たな攻撃面なし。
- ハードコーディング禁止方針に沿い、URL/キー等は導入しない（描画定数のみ）。

## パフォーマンス考慮事項

- パーツ数は1キャラ最大6枚程度に抑える。敵が増えても Container 子要素は定数。
- `update` 内で毎フレーム new しない（パーツは生成時に確保し、以後は変位更新のみ）。
- アニメは sin/線形の軽量計算。60fps 維持（既存の性能要件）を阻害しない。
- 破棄時にリグを destroy し、テクスチャ/オブジェクトのリークを防ぐ。

## 将来の拡張性

- リグ層を分離したことで、後日「外部スプライトシート + `anims`」へ移行する際は
  `CharacterRig` の中身を差し替えるだけでよく、物理エンティティに触れずに済む。
- `characterRig` 設定を増やせば新キャラの見た目を宣言的に追加できる。
- `rigAnimation` に新モーション（しゃがみ等）を純粋関数として足せる。
