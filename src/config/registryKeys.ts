// GameScene → UIScene の HUD 状態共有に使うレジストリキー。
// Scene 間の直接参照を避け、registry 経由で疎結合に状態を渡す。

export const HUD = {
  playerHp: 'hud.player.hp',
  playerMaxHp: 'hud.player.maxHp',
  chargeRatio: 'hud.charge.ratio',
  bossActive: 'hud.boss.active',
  bossHp: 'hud.boss.hp',
  bossMaxHp: 'hud.boss.maxHp',
  // 仮想ボタンの押下状態(押下フィードバック描画用)
  shootHeld: 'hud.touch.shootHeld',
  jumpHeld: 'hud.touch.jumpHeld',
  // 追従式タッチパッド(描画用)
  movePadActive: 'hud.movepad.active',
  movePadBaseX: 'hud.movepad.baseX',
  movePadBaseY: 'hud.movepad.baseY',
  movePadCurX: 'hud.movepad.curX',
  movePadCurY: 'hud.movepad.curY',
  // 取得フィードバックの軽量トースト。GameScene が表示メッセージを積み、UIScene が drain して表示する。
  toast: 'hud.toast',
} as const;
