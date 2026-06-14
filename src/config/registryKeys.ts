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
} as const;

// プレイ進行に関わる一時状態(セーブ非保存・registry のみで揮発)。HUD 表示とは別系統の、
// シーンをまたいで持ち越す進行フラグを集約する。
export const PROGRESS = {
  // RAY の攻撃強化フラグ。stage5 を正規クリアした演出(stage5-awakening)で true になり、
  // stage6 のプレイ系列(リトライ含む)の間だけ維持する。createPlayer は読むだけで消費しない。
  // セーブには保存せず、単体選択での stage6 開始(GameSceneData.fromStageSelect)と
  // 全クリア(finalizeEnding)でクリアする。これにより「正規クリア→リトライ維持/単体選択→素」を両立する。
  playerEmpowered: 'progress.player.empowered',
} as const;
