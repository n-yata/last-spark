// 操作説明の表示データ(Phaser 非依存・純データ)。
// オプションメニューの「操作説明」パネルがこれを 2 列(キーボード/タッチ)で描画する。
// キーボード表記は systems/InputController.ts のキーマップ(矢印=移動 / SPACE=ジャンプ /
// J=ショット / 上下=梯子)と一致させる単一の真実源として扱う。
// 変更時は InputController と必ず突き合わせること(ユニットテストで主要キーの存在を担保)。

/** 操作 1 項目。action=操作名, keyboard=キーボード表記, touch=タッチ操作の説明。 */
export interface ControlEntry {
  action: string;
  keyboard: string;
  touch: string;
}

/**
 * 操作説明の表示データを返す。表示順は基本操作(移動→ジャンプ→ショット)→補助(梯子)。
 * InputController のキー割り当てに対応:
 *   move=LEFT/RIGHT, climb=UP/DOWN, jump=SPACE, shoot=J。
 */
export function getControlEntries(): ControlEntry[] {
  return [
    { action: '移動', keyboard: '← →', touch: '画面左半分をなぞる' },
    { action: 'ジャンプ', keyboard: 'SPACE', touch: '右側のジャンプボタン' },
    { action: 'ショット', keyboard: 'J', touch: '右側のショットボタン(長押しでチャージ)' },
    { action: '梯子の昇降', keyboard: '↑ ↓', touch: '梯子上で移動パッドを上下' },
  ];
}
