# ハードモード追加 振り返り

## 実施内容

- `GameSettings` に `difficulty` を追加し、v2/v3 以前のセーブは `normal` を補完して v4 へ移行するようにした。
- オプションの音量設定パネルへ `MODE: NORMAL/HARD` トグルを追加した。
- `hard` ではプレイヤー被ダメージ、雑魚敵 HP、walker 速度、turret 発射間隔に係数を適用するようにした。
- タイトル画面から難易度を切り替えて localStorage に保存されることを E2E で検証した。

## 学び

- Phaser の canvas UI は DOM テキストで直接検証できないため、E2E では `window.lastSpark` のゲーム座標と canvas bounding box を対応させる必要がある。
- Pixel 5 landscape 相当の短い高さでは、固定行間のオプションパネルが下にはみ出す。メニュー行が増える場合は `height` から逆算した可変行間にする。

## 次回への申し送り

- 難易度をさらに拡張する場合は `src/systems/difficulty.ts` に係数を追加し、Scene/Entity 側へ直接マジックナンバーを足さない。
- ポーズ中に難易度を切り替えた場合、既に出現済みの敵には即時反映しない。新規開始・リトライ・次ステージから反映する設計として扱う。
