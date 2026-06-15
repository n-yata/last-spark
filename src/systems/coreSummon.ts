// ECLIPSE本体(stage6 ラスボス)の配下召喚の配置計算(Phaser 非依存の純粋ロジック)。
// 「プレイヤー(RAY)に重なる位置へ湧かせない」=召喚と同時に避けられない接触ダメージを与えない、
// という不変条件を担保するためロジックを純粋関数として切り出し、ユニットテストで守る。

/** 値を [min, max] に収める(Phaser.Math.Clamp 非依存の自前実装でテスト可能にする)。 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 配下の召喚 X 座標を count 体ぶん計算する。
 * プレイヤー中心から左右へ safeRadius 以上離して交互に配置し、同じ側に複数並ぶときは
 * spacing ぶんずつ外側へずらす。アリーナ端でプレイヤー側へ食い込み safeRadius を割る場合は
 * 反対側へ折り返す(アリーナ幅が左右いずれかに safeRadius を確保できる限り、全座標が
 * |x - playerX| >= safeRadius を満たす)。
 *
 * @param playerX - プレイヤー(RAY)の中心 X。この周辺 safeRadius には湧かせない。
 * @param count - 召喚する体数。
 * @param arenaMinX - 配置可能な最小 X(コアの可動域=アリーナ左端)。
 * @param arenaMaxX - 配置可能な最大 X(アリーナ右端)。
 * @param safeRadius - プレイヤー中心から確保する最小距離(px)。重なり=避けられない被弾を防ぐ。
 * @param spacing - 同じ側に複数並ぶときの体間隔(px)。
 * @returns 各召喚位置の X 座標(長さ count)。
 */
export function computeSummonXs(
  playerX: number,
  count: number,
  arenaMinX: number,
  arenaMaxX: number,
  safeRadius: number,
  spacing: number,
): number[] {
  const xs: number[] = [];
  for (let i = 0; i < count; i += 1) {
    // 偶数番=右(+1)、奇数番=左(-1)に振り分け、左右バランス良く挟む。
    const side: 1 | -1 = i % 2 === 0 ? 1 : -1;
    // 同じ側での順番(0,1,2..)。外側へ spacing ぶんずつ離す。
    const rank = Math.floor(i / 2);
    const dist = safeRadius + rank * spacing;
    let x = clamp(playerX + side * dist, arenaMinX, arenaMaxX);
    // アリーナ端で clamp された結果プレイヤーへ safeRadius 未満まで寄ってしまったら、反対側へ置き直す。
    if (Math.abs(x - playerX) < safeRadius) {
      x = clamp(playerX - side * dist, arenaMinX, arenaMaxX);
    }
    xs.push(x);
  }
  return xs;
}
