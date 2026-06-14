import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { getSound } from '../systems/SoundManager';
import { createOptionsMenu } from '../ui/optionsMenu';
// 型のみ(ビルド時に消去)。GameScene のポーズ/遷移フックを呼ぶために型を借りる。
import type { GameScene } from './GameScene';

// ポーズ制御シーン。GameScene + UIScene が pause された状態の上に重ねて起動し、
// 統合オプションメニュー(音量/操作説明/ステージ移動)を表示する。
// ゲームの pause/resume と破壊的遷移は GameScene 側のフックへ委譲する(本シーンは UI を持つだけ)。

/** PauseScene 起動データ。 */
export interface PauseSceneData {
  /** 現在のステージ(リトライ/選択の起点)。 */
  stageId: string;
}

export class PauseScene extends Phaser.Scene {
  private stageId = 'stage1';

  constructor() {
    super({ key: SCENE_KEYS.pause });
  }

  init(data: PauseSceneData): void {
    this.stageId = data?.stageId ?? 'stage1';
  }

  create(): void {
    const game = this.scene.get(SCENE_KEYS.game) as GameScene;
    getSound().playSe('uiTap');

    const resume = (): void => {
      game.requestResume();
      this.scene.stop();
    };

    const menu = createOptionsMenu({
      scene: this,
      enableStageNav: true,
      stageNav: {
        currentStageId: this.stageId,
        // 破壊的遷移/選択は GameScene が PauseScene/UIScene を停止しつつ実行する。
        onRetry: () => game.retry(),
        onReturnTitle: () => game.returnToTitle(),
        onSelectStage: (stageId) => game.goToStage(stageId),
      },
      onClose: resume,
    });

    // ESC キーでも素早く再開できるようにする(キーボードプレイ時の利便)。
    this.input.keyboard?.once('keydown-ESC', resume);

    // シーン終了時にオーバーレイを確実に破棄する(resume/遷移どちらの経路でも)。
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => menu.destroy());
  }
}
