import type { LogSlot } from '../types/story';

// ログ閲覧(LogViewerScene)の表示モデルを組み立てる純粋ロジック。
// Phaser 非依存に切り出し、母集合の構築・取得済みの突き合わせ・行ラベル整形をテスト可能にする。
// 本文は二重保存せず、呼び出し側が getLogs(stageId) で都度引いて渡す。

/** ログスロットの固定表示順。一覧の並びをこの順で安定させる。 */
export const LOG_SLOT_ORDER: readonly LogSlot[] = ['early', 'preBoss', 'postBoss'];

/** ログ閲覧の1行分のモデル。 */
export interface LogEntry {
  /** 母集合内の固定インデックス(1始まり)。表示番号に使う。 */
  index: number;
  stageId: string;
  slot: LogSlot;
  /** 収集キー。SaveData.collectedLogs と同形式 "stageId:slot"。 */
  key: string;
  /** ログ本文(複数行は \n 区切り)。取得済みのみ画面に表示する。 */
  body: string;
  /** 取得済みか。 */
  collected: boolean;
}

/** "stageId:slot" 形式の収集キーを作る(SaveManager.markLogCollected と一致させる)。 */
export function logKey(stageId: string, slot: LogSlot): string {
  return `${stageId}:${slot}`;
}

/**
 * 全ログの母集合を固定順で構築し、取得済みフラグを突き合わせる。
 * - stageIds の順 × LOG_SLOT_ORDER の順で、実在する logs スロットのみを列挙する。
 * - collectedKeys に含まれるキーは collected=true とする。
 * - index は実在ログの通し番号(1始まり)。
 */
export function buildLogEntries(
  stageIds: readonly string[],
  getLogs: (stageId: string) => Partial<Record<LogSlot, string>> | undefined,
  collectedKeys: readonly string[],
): LogEntry[] {
  const collected = new Set(collectedKeys);
  const entries: LogEntry[] = [];
  let index = 0;
  for (const stageId of stageIds) {
    const logs = getLogs(stageId);
    if (!logs) continue;
    for (const slot of LOG_SLOT_ORDER) {
      const body = logs[slot];
      if (body === undefined) continue;
      index += 1;
      const key = logKey(stageId, slot);
      entries.push({ index, stageId, slot, key, body, collected: collected.has(key) });
    }
  }
  return entries;
}

/**
 * 一覧行のラベル。取得済みは本文1行目を見出しに、未取得はロック表示にする。
 * ネタバレ防止のため slot 名(early/preBoss/postBoss)は出さない。
 */
export function logRowLabel(entry: LogEntry): string {
  const no = entry.index.toString().padStart(2, '0');
  if (!entry.collected) return `No.${no}  ??? ―― 未取得`;
  const firstLine = entry.body.split('\n')[0] ?? '';
  return `No.${no}  ${firstLine}`;
}
