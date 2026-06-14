import { STAGE_IDS } from '../config/stages';

// タイトルのステージ選択で使うステージ一覧データ(Phaser 非依存)。
// UI(stageSelect.ts)と分離することで、Phaser を読み込まずに単体テストできる。

// ステージ ID → 表示ラベル。未知 ID は ID をそのまま表示する。
const STAGE_LABELS: Record<string, string> = {
  stage1: '崩れた都市',
  stage2: '立坑の街',
  stage3: '収容施設',
  stage4: '汚染地帯',
  stage5: 'ECLIPSE外縁部',
  stage6: 'ECLIPSE支配中枢',
};

/** プレイ可能なステージ一覧(STAGES 登録順)。STAGE_IDS から導出し定義の二重管理を避ける。 */
export const PLAYABLE_STAGES: ReadonlyArray<{ id: string; label: string }> = STAGE_IDS.map(
  (id, index) => ({ id, label: `STAGE ${index + 1}  ${STAGE_LABELS[id] ?? id}` }),
);
