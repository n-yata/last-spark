import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { SaveManager } from '../persistence/SaveManager';
import { STAGE_IDS } from '../config/stage1';
import { isAllStagesCleared } from '../systems/progress';
import { getSound } from '../systems/SoundManager';
import { transitionTo, fadeIn } from '../systems/sceneTransition';
// 型のみの import はビルド時に消去されるため本番バンドルには含まれない。
import type { DevMode } from '../devMode/stageSelect';

// タイトル画面。ロゴ + スタート導線。クリア済みフラグと最速タイムを表示する。
// 開発ビルド(import.meta.env.DEV)では「DEV MODE」導線を動的 import で追加し、任意ステージから
// 開始できる。本番ビルドでは下記ガードが除去され、開発モードのコード/文字列は同梱されない。

export class TitleScene extends Phaser.Scene {
  // スタート用の全画面入力ゾーン。開発モードのステージ選択を開いている間は無効化する。
  private startZone?: Phaser.GameObjects.Zone;
  // 開発モードのコントローラ(開発ビルドでのみ生成)。
  private devMode?: DevMode;

  constructor() {
    super(SCENE_KEYS.title);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0e14');
    fadeIn(this);
    // シーン再入(クリア→タイトル復帰など)に備えて状態を初期化する。
    this.devMode = undefined;

    // 背景: 暗め基調 + 発光アクセント(廃墟のシルエット風グラデーション)
    this.drawBackdrop(width, height);

    // スタート判定は全画面ゾーンで受ける。最背面(最初に追加)に置くことで、後から重ねる
    // DEV MODE ボタンが Phaser の topOnly(既定 true)で前面となり、スタートに巻き込まれない。
    this.startZone = this.add.zone(0, 0, width, height).setOrigin(0).setInteractive();
    this.startZone.on(Phaser.Input.Events.POINTER_DOWN, () => this.startGame());
    this.input.keyboard?.on('keydown', this.onKeyDown, this);

    // ロゴ
    this.add
      .text(width / 2, height * 0.34, 'LAST SPARK', {
        fontFamily: 'monospace',
        fontSize: '64px',
        color: '#37f7d8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#37f7d8', 18, true, true);

    this.add
      .text(width / 2, height * 0.34 + 52, '― すさんだ世界の、のぞみ ―', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#7fe9dd',
      })
      .setOrigin(0.5);

    // スタート導線(点滅)
    const start = this.add
      .text(width / 2, height * 0.66, 'TAP TO START', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#fff27a',
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: start,
      alpha: 0.2,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // クリア状況の表示。全6ステージ制覇なら「ALL CLEAR」、1ステージ以上なら「CLEARED」。
    // BEST はステージ1のタイムを代表値とする。
    const save = new SaveManager().getData();
    if (save.clearedStages.length > 0) {
      const allClear = isAllStagesCleared(save.clearedStages, STAGE_IDS);
      const stage1Best = save.bestTimeMs?.stage1;
      const best = stage1Best !== undefined ? `  BEST ${this.formatTime(stage1Best)}` : '';
      this.add
        .text(width / 2, height * 0.82, `${allClear ? 'ALL CLEAR' : 'CLEARED'}${best}`, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: allClear ? '#fff27a' : '#9fffe8',
          fontStyle: allClear ? 'bold' : 'normal',
        })
        .setOrigin(0.5);
    }

    // 「DEV MODE」導線を追加する。有効化条件:
    //   - ローカル開発(import.meta.env.DEV)
    //   - ビルド時フラグ VITE_DEV_MODE='true'(GitHub Pages の確認用デプロイで指定)
    // どちらでもないビルド(素の本番リリース)では下記ガードが false に畳まれ、動的 import の
    // モジュールごと本番バンドルから切り離される(コードも文字列も含まれない)。
    // import 解決は非同期のため、遷移で既にシーンが停止していたら何もしない。
    if (import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true') {
      void import('../devMode/stageSelect').then(({ createDevMode }) => {
        if (!this.scene.isActive() || !this.startZone) {
          return;
        }
        this.devMode = createDevMode(this, this.startZone, (stageId) => this.startGame(stageId));
      });
    }

    // タイトル BGM(初回タップで AudioContext が解放されると鳴り出す)
    getSound().playBgm('title');
  }

  // キーボード操作: 開発モードのステージ選択を開いている間は開始を抑止する(誤発進防止)。
  private onKeyDown(): void {
    if (this.devMode?.isOverlayOpen()) {
      return;
    }
    this.startGame();
  }

  private startGame(stageId = 'stage1'): void {
    getSound().playSe('uiTap');
    // タイトルからの開始は既定で stage1 から(最初から)。開発モードでは選択した stageId。
    // scene.start に data を渡さないと Phaser は前回の data(継続時の stageId)を
    // 保持して init に渡すため、明示的に stageId を指定してクリア後の引き継ぎを断つ。
    transitionTo(this, SCENE_KEYS.game, { stageId });
  }

  private drawBackdrop(width: number, height: number): void {
    const g = this.add.graphics();
    // 遠景の発光ライン(地平線)
    g.fillStyle(0x12303a, 0.5);
    g.fillRect(0, height * 0.7, width, height * 0.3);
    g.lineStyle(2, 0x37f7d8, 0.25);
    g.lineBetween(0, height * 0.7, width, height * 0.7);
    // 崩れたビルのシルエット
    g.fillStyle(0x0d141b, 1);
    const buildings = [
      [40, 0.55, 90],
      [160, 0.62, 70],
      [260, 0.5, 110],
      [width - 320, 0.58, 100],
      [width - 180, 0.52, 130],
      [width - 80, 0.64, 60],
    ] as const;
    for (const [x, topRatio, w] of buildings) {
      g.fillRect(x, height * topRatio, w, height);
    }
  }

  private formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
