# 設計書

## アーキテクチャ概要

既存の「純粋ロジック(systems) + Phaser エンティティ(entities)」分離を踏襲する。

- ジャンプ判定の拡張は `src/systems/playerMovement.ts` に**純粋関数**として追加し、`Player.applyInput` がタイムスタンプ状態(最終接地時刻・先行入力時刻)を保持して呼び出す。
- 触覚フィードバックは `SoundManager` と同じ「モジュールシングルトン + 設定連動」パターンで `src/systems/haptics.ts` を新設する。

```
InputState ──▶ Player.applyInput
                 ├─ lastGroundedAt / jumpBufferedAt を更新
                 └─ resolveJumpStart(純粋関数) ──▶ ジャンプ発動
CombatSystem ──▶ Player.takeDamage(実被弾時) ──▶ haptics.vibrate(短)
GameScene(ボス撃破) ──────────────────────────▶ haptics.vibrate(パターン)
optionsMenu ──▶ settings.vibration ──▶ haptics.setEnabled / SaveManager 永続化
```

## コンポーネント設計

### 1. playerMovement.ts への純粋関数追加

**責務**:
- コヨーテタイム・先行入力バッファを含む「今フレームでジャンプを開始すべきか」の判定

**実装の要点**:
- 新関数 `resolveJumpStart(params)` を追加する。入力は
  `{ jumpPressed, onGround, isJumping, now, lastGroundedAt, coyoteMs, jumpBufferedAt, jumpBufferMs }`、
  戻り値は boolean(ジャンプ開始)。判定式:
  - 立ち上がり入力かつ「接地中 or コヨーテ猶予内(`now - lastGroundedAt <= coyoteMs`)」
  - または「接地中かつバッファ有効(`now - jumpBufferedAt <= jumpBufferMs`)」
  - いずれも `isJumping`(既にジャンプ離陸済み)なら不可 → 二段ジャンプ防止
- 既存 `shouldJump` は残し、`Player` 側の呼び出しを `resolveJumpStart` に置き換える
  (他呼び出し箇所がなければ `shouldJump` は `resolveJumpStart` の特殊形として整理してよい)
- `Player` 側の状態管理:
  - 毎フレーム `onGround` なら `lastGroundedAt = now`
  - 空中で `jumpPressed` なら `jumpBufferedAt = now`
  - ジャンプ発動時に `lastGroundedAt = -Infinity`, `jumpBufferedAt = -Infinity` へリセット
    (コヨーテ・バッファの二重消費を防ぐ)
  - 梯子把持中はコヨーテ・バッファ状態をリセットし適用しない

### 2. balance.ts へのチューニング値追加

**責務**:
- 手触りパラメータの集中管理(マジックナンバー散在防止)

**実装の要点**:
- `PLAYER.coyoteMs: 100`(60fps 換算 約6フレーム)
- `PLAYER.jumpBufferMs: 120`(約7フレーム)

### 3. haptics.ts(新規)

**責務**:
- `navigator.vibrate` の抽象化(機能検出・no-op フォールバック)
- 設定(ON/OFF)の反映

**実装の要点**:
- `SoundManager` の `getSound()` と同様のモジュールシングルトン。API:
  - `setEnabled(enabled: boolean)`: 設定変更時に呼ぶ
  - `vibrateHit()`: 被弾用の短い単発(例 40ms)
  - `vibrateBossDefeat()`: 撃破用パターン(例 [60, 40, 90])
- 内部で `typeof navigator !== 'undefined' && 'vibrate' in navigator` を検出し、
  非対応なら常に no-op(例外を出さない)
- 振動パターン値は `balance.ts` ではなく `haptics.ts` 内の定数で持つ(ゲームバランスではなく演出値のため)

### 4. 設定の追加(save.ts / SaveManager / optionsMenu)

**責務**:
- `GameSettings.vibration: boolean`(既定 true)の追加と永続化・UI 切替

**実装の要点**:
- `SaveManager` の既定値マージで、既存セーブに `vibration` キーがなくても既定値 true が補われることを確認する(既存の defaults 実装に倣う)
- `optionsMenu` の音量パネルに「しんどう ON/OFF」トグルを追加(既存のミュートトグルの流儀に合わせる)
- 起動時(BootScene/PreloadScene の設定読込箇所)とオプション変更時に `haptics.setEnabled` を呼ぶ

### 5. 振動の発火点

- **被弾**: `Player.takeDamage` 内、実際にダメージが通った時のみ(`wasInvincible` が false の分岐 = 既存のリグのけぞりと同じ条件)
- **ボス撃破**: ボス撃破処理(GameScene のボス defeated イベント処理)に 1 箇所追加

## データフロー

### コヨーテタイム付きジャンプ
```
1. Player.applyInput が毎フレーム onGround を確認し lastGroundedAt を更新
2. 足場から落下(onGround=false)後 80ms でジャンプ入力
3. resolveJumpStart: now - lastGroundedAt(80ms) <= coyoteMs(100ms) → true
4. ジャンプ発動、lastGroundedAt/jumpBufferedAt をリセット
```

### 先行入力バッファ
```
1. 空中(下降中)でジャンプ入力 → jumpBufferedAt = now
2. 100ms 後に着地(onGround=true)
3. resolveJumpStart: now - jumpBufferedAt(100ms) <= jumpBufferMs(120ms) → true
4. ジャンプ発動、バッファをリセット(次の着地で再発動しない)
```

### 触覚フィードバック
```
1. CombatSystem → Player.takeDamage(実被弾) → haptics.vibrateHit()
2. haptics: enabled && navigator.vibrate 対応 → navigator.vibrate(40)
3. 非対応 or 設定OFF → 何もしない
```

## エラーハンドリング戦略

- `navigator.vibrate` は呼び出しが拒否されても false を返すだけで例外は投げないが、
  念のため機能検出(`'vibrate' in navigator`)を通してからのみ呼ぶ。
- SaveManager の既存の破損データ耐性(パース失敗時は既定値)をそのまま利用する。

## テスト戦略

### ユニットテスト
- `tests/unit/systems/playerMovement.test.ts` に追加:
  - 接地中の入力で発動(従来挙動の回帰)
  - コヨーテ猶予内/猶予超過の発動可否(境界値: ちょうど coyoteMs)
  - `isJumping` 中は発動しない(二段ジャンプ防止)
  - バッファ有効内/超過の着地発動可否(境界値: ちょうど jumpBufferMs)
  - リセット後(-Infinity)は発動しない
- `tests/unit/systems/haptics.test.ts`(新規):
  - navigator.vibrate モックで呼び出しパターンを検証
  - setEnabled(false) で vibrate が呼ばれない
  - navigator.vibrate 非対応環境(プロパティなし)で例外を出さない
- `tests/unit/persistence/SaveManager.test.ts` に追加:
  - `vibration` キーなしの既存データ読込で既定値 true が補われる

### 統合テスト
- `tests/integration/input/player-control.test.ts` の既存シナリオが全て通ること(挙動の非破壊確認)

## 依存ライブラリ

追加なし(Vibration API はブラウザ標準)。

## ディレクトリ構造

```
src/
├── config/
│   └── balance.ts            # 変更: PLAYER.coyoteMs / jumpBufferMs 追加
├── systems/
│   ├── playerMovement.ts     # 変更: resolveJumpStart 追加
│   └── haptics.ts            # 新規: 触覚フィードバック
├── entities/
│   └── Player.ts             # 変更: タイムスタンプ状態管理・被弾時振動
├── types/
│   └── save.ts               # 変更: GameSettings.vibration 追加
├── persistence/
│   └── SaveManager.ts        # 変更: 既定値に vibration: true
├── ui/
│   └── optionsMenu.ts        # 変更: 振動トグル追加
└── scenes/
    └── GameScene.ts          # 変更: ボス撃破時の振動(1箇所)
tests/
├── unit/systems/playerMovement.test.ts  # 追加
├── unit/systems/haptics.test.ts         # 新規
└── unit/persistence/SaveManager.test.ts # 追加
```

## 実装の順序

1. balance.ts にチューニング値追加 → playerMovement.ts の純粋関数 + ユニットテスト
2. Player.ts への組み込み(状態管理・呼び替え)
3. haptics.ts 新規作成 + テスト
4. save.ts / SaveManager / optionsMenu / 発火点の配線
5. 品質チェック(lint / typecheck / test / build)と実機相当の動作確認

## セキュリティ考慮事項

- 外部通信なし。localStorage への保存はブール値1つの追加のみ。
- ハードコーディング対象(URL・キー等)は扱わない。

## パフォーマンス考慮事項

- resolveJumpStart は毎フレーム1回の算術比較のみで負荷なし。
- vibrate 呼び出しは被弾・撃破時のみ(毎フレーム呼ばない)。

## 将来の拡張性

- haptics.ts に発火点を集約するため、将来「チャージ完了時の振動」等の追加は関数を1つ足すだけで済む。
- コヨーテ/バッファ値は balance.ts にあるため、難易度・実機フィードバックに応じた調整が容易。
