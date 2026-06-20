// RAY の攻撃強化(empowered: 通常弾2発化 + チャージビーム)を、どのステージで付与するかの判定。
// Phaser 非依存の純粋関数として切り出し、単体テスト可能にする。

const EMPOWERED_STAGE_ID = 'stage6';

/**
 * 指定ステージで RAY を強化(empowered)すべきかを返す。
 * - stage6(支配中枢)は物語上の固有属性として常に強化する(バスターモードの有無と独立)。
 * - バスターモードが ON のときは全ステージで強化する。
 */
export function shouldEmpowerPlayer(stageId: string, busterMode: boolean): boolean {
  return stageId === EMPOWERED_STAGE_ID || busterMode;
}
