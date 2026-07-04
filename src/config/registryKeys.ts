// GameScene → UIScene の HUD 状態共有に使うレジストリキー。
// Scene 間の直接参照を避け、registry 経由で疎結合に状態を渡す。

export const HUD = {
  playerHp: 'hud.player.hp',
  playerMaxHp: 'hud.player.maxHp',
  chargeRatio: 'hud.charge.ratio',
  bossActive: 'hud.boss.active',
  bossHp: 'hud.boss.hp',
  bossMaxHp: 'hud.boss.maxHp',
  // ボスの固有名(HP バーのラベルに表示)。ステージごとに出し分ける。
  bossName: 'hud.boss.name',
  // 仮想ボタンの押下状態(押下フィードバック描画用)
  shootHeld: 'hud.touch.shootHeld',
  jumpHeld: 'hud.touch.jumpHeld',
  // 追従式タッチパッド(描画用)
  movePadActive: 'hud.movepad.active',
  movePadBaseX: 'hud.movepad.baseX',
  movePadBaseY: 'hud.movepad.baseY',
  movePadCurX: 'hud.movepad.curX',
  movePadCurY: 'hud.movepad.curY',
  // UIScene のポーズボタン → GameScene へのポーズ要求(疎結合のトリガ)。
  pauseRequested: 'hud.pause.requested',
} as const;

// オプションメニュー → GameScene の設定変更通知に使うレジストリキー。
// 値の正本は SaveManager(localStorage)であり、registry は「実行中セッションへの
// 変更イベントの搬送路」としてのみ使う(GameScene は changedata を購読して再適用する)。
export const SETTINGS = {
  graphicsFx: 'settings.graphicsFx',
} as const;
