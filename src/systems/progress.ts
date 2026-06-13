// ゲーム進行(全クリア判定)の純粋ロジック。Phaser / 永続化に依存しないため単体テストできる。

/**
 * 全ステージをクリアしたか判定する。`allStageIds` のすべてが `clearedStages` に含まれていれば true。
 * 余分なクリア記録(未知ステージ等)があっても、必要なステージが揃っていれば全クリアとみなす。
 * 空の `allStageIds`(ステージ未定義)は「全クリア」とはみなさない(false)。
 *
 * @param clearedStages - クリア済みステージ ID の配列(SaveData.clearedStages)
 * @param allStageIds - 全ステージ ID の配列(config の STAGE_IDS)
 */
export function isAllStagesCleared(
  clearedStages: readonly string[],
  allStageIds: readonly string[],
): boolean {
  if (allStageIds.length === 0) return false;
  const cleared = new Set(clearedStages);
  return allStageIds.every((id) => cleared.has(id));
}
