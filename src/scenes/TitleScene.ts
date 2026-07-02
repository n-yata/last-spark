import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { SaveManager } from '../persistence/SaveManager';
import { STAGE_IDS } from '../config/stages';
import { isAllStagesCleared } from '../systems/progress';
import { getSound } from '../systems/SoundManager';
import { transitionTo, fadeIn } from '../systems/sceneTransition';
import { scaled, scaledFontPx } from '../config/uiScale';
import { TITLE_TEX } from '../config/assetKeys';
import { loopRayTint } from '../config/balance';
import { createOptionsMenu } from '../ui/optionsMenu';
import { createNeonButton } from '../ui/neonButton';
import { formatBestTime } from '../stageSelect/stageCards';
// 型のみの import はビルド時に消去される。
import type { StageSelect } from '../stageSelect/stageSelect';
import type { OptionsMenu } from '../ui/optionsMenu';

// タイトル画面。ロゴ + スタート導線。クリア済みフラグと最速タイムを表示する。
// 「STAGE SELECT」導線を動的 import で追加し、任意のステージから始められる(一般向け機能)。
// UI は表示確定後に遅延ロードして初期表示を軽く保つ。

export class TitleScene extends Phaser.Scene {
  // スタート用の全画面入力ゾーン。ステージ選択を開いている間は無効化する。
  private startZone?: Phaser.GameObjects.Zone;
  // ステージ選択のコントローラ。
  private stageSelect?: StageSelect;
  // オプションメニュー(音量・操作説明)。開いている間はスタートを抑止する。
  private optionsMenu?: OptionsMenu;

  constructor() {
    super(SCENE_KEYS.title);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0e14');
    fadeIn(this);
    // シーン再入(クリア→タイトル復帰など)に備えて状態を初期化する。
    this.stageSelect = undefined;
    this.optionsMenu = undefined;

    const save = new SaveManager().getData();

    // 背景: キービジュアルの一枚絵があれば cover 配置で敷く。未ロード時は簡易シルエットへ。
    // 周回数に応じて発光ラインの色味を変え、見た目の報酬(タイトル演出変化)とする。
    this.drawBackground(width, height, save.loopCount);

    // スタート判定は全画面ゾーンで受ける。最背面(最初に追加)に置くことで、後から重ねる
    // STAGE SELECT ボタンが Phaser の topOnly(既定 true)で前面となり、スタートに巻き込まれない。
    this.startZone = this.add.zone(0, 0, width, height).setOrigin(0).setInteractive();
    this.startZone.on(Phaser.Input.Events.POINTER_DOWN, () => this.startGame());
    this.input.keyboard?.on('keydown', this.onKeyDown, this);
    // シーン再入(クリア→タイトル復帰)でリスナーが重複しないよう、終了時に必ず外す。
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.onKeyDown, this);
    });

    // ロゴ
    this.add
      .text(width / 2, height * 0.34, 'LAST SPARK', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(64),
        color: '#37f7d8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#37f7d8', scaled(18), true, true);

    this.add
      .text(width / 2, height * 0.34 + scaled(52), '― すさんだ世界の、のぞみ ―', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(18),
        color: '#7fe9dd',
      })
      .setOrigin(0.5)
      .setShadow(0, scaled(2), '#05080d', scaled(5), true, true);

    // スタート導線(点滅)
    const start = this.add
      .text(width / 2, height * 0.66, 'TAP TO START', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(26),
        color: '#fff27a',
      })
      .setOrigin(0.5)
      .setStroke('#05080d', scaled(3))
      .setShadow(0, scaled(2), '#000000', scaled(6), true, true);
    this.tweens.add({
      targets: start,
      alpha: 0.2,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // クリア状況の表示。全6ステージ制覇なら「ALL CLEAR」、1ステージ以上なら「CLEARED」。
    // BEST はステージ1のタイムを代表値とする。周回数が2以上なら「LOOP n」を併記する(見た目の報酬)。
    const loopSuffix = save.loopCount >= 2 ? `  LOOP ${save.loopCount}` : '';
    if (save.clearedStages.length > 0) {
      const allClear = isAllStagesCleared(save.clearedStages, STAGE_IDS);
      const stage1Best = save.bestTimeMs?.stage1;
      const best = stage1Best !== undefined ? `  BEST ${formatBestTime(stage1Best)}` : '';
      this.add
        .text(width / 2, height * 0.82, `${allClear ? 'ALL CLEAR' : 'CLEARED'}${best}${loopSuffix}`, {
          fontFamily: 'monospace',
          fontSize: scaledFontPx(16),
          color: allClear ? '#fff27a' : '#9fffe8',
          fontStyle: allClear ? 'bold' : 'normal',
        })
        .setOrigin(0.5)
        .setShadow(0, scaled(2), '#05080d', scaled(5), true, true);
    } else if (save.loopCount >= 2) {
      // clearedStages はリセットされていても(周回中)、周回数は表示して報酬感を残す。
      this.add
        .text(width / 2, height * 0.82, `LOOP ${save.loopCount}`, {
          fontFamily: 'monospace',
          fontSize: scaledFontPx(16),
          color: '#9fffe8',
        })
        .setOrigin(0.5)
        .setShadow(0, scaled(2), '#05080d', scaled(5), true, true);
    }

    // 「STAGE SELECT」導線を追加する。UI は表示確定後に動的 import で遅延ロードし、
    // 初期表示を軽く保つ(導線をタップして初めて使うため別チャンクに分けても体験を損なわない)。
    // import 解決は非同期のため、遷移で既にシーンが停止していたら何もしない。
    void import('../stageSelect/stageSelect').then(({ createStageSelect }) => {
      if (!this.scene.isActive() || !this.startZone) {
        return;
      }
      this.stageSelect = createStageSelect(this, this.startZone, (stageId) =>
        this.startGame(stageId),
      );
    });

    // 「OPTIONS」導線。STAGE SELECT(右下)と対になるよう左下に控えめに配置する。
    // startZone の後に追加するため topOnly(既定)で前面となりスタートに巻き込まれない。
    // 小型パネル(NeonButton)は暗背景を持つため、キービジュアルの明部でも読める。
    // NeonButton は中央原点の Container なので、左下アンカーは寸法確定後に座標へ換算する。
    const optionsBtn = createNeonButton(this, 0, 0, '⚙ OPTIONS', () => this.openOptions(), {
      fontSize: 16,
    });
    optionsBtn.container.setPosition(
      scaled(16) + optionsBtn.container.width / 2,
      height - scaled(16) - optionsBtn.container.height / 2,
    );

    // タイトル BGM(初回タップで AudioContext が解放されると鳴り出す)
    getSound().playBgm('title');
  }

  // キーボード操作: ステージ選択/オプションを開いている間は開始を抑止する(誤発進防止)。
  private onKeyDown(): void {
    if (this.stageSelect?.isOverlayOpen() || this.optionsMenu?.isOpen()) {
      return;
    }
    this.startGame();
  }

  // オプションメニュー(ステージ移動なし)を開く。表示中はスタート判定を無効化する。
  private openOptions(): void {
    if (this.optionsMenu?.isOpen()) {
      return;
    }
    getSound().playSe('uiTap');
    this.startZone?.disableInteractive();
    this.optionsMenu = createOptionsMenu({
      scene: this,
      enableStageNav: false,
      onClose: () => {
        this.optionsMenu?.destroy();
        this.optionsMenu = undefined;
        this.startZone?.setInteractive();
      },
    });
  }

  private startGame(stageId = 'stage1'): void {
    getSound().playSe('uiTap');
    // タイトルからの開始は既定で stage1 から(最初から)。ステージ選択では選んだ stageId。
    // scene.start に data を渡さないと Phaser は前回の data(継続時の stageId)を
    // 保持して init に渡すため、明示的に stageId を指定してクリア後の引き継ぎを断つ。
    transitionTo(this, SCENE_KEYS.game, { stageId });
  }

  /**
   * 背景を敷く。キービジュアル(TITLE_TEX.background)がロード済みなら cover 配置
   * (画面比が論理解像度と異なっても隙間を作らず、はみ出しはトリミング)。さらに上下へ
   * 薄い暗幕を重ね、絵の明部(夜明け・発光)に乗るロゴ/導線テキストの視認性を確保する。
   * 未ロード時は従来の簡易シルエット(drawBackdrop)へフォールバックする。
   * loopCount が2以上のときは周回配色(loopRayTint)の薄いオーバーレイを重ね、
   * 見た目の報酬(タイトル演出変化)として周回を重ねた実感を出す。
   */
  private drawBackground(width: number, height: number, loopCount: number): void {
    const bgKey = TITLE_TEX.background;
    if (this.textures.exists(bgKey)) {
      const src = this.textures.get(bgKey).getSourceImage();
      const scale = Math.max(width / src.width, height / src.height);
      this.add.image(width / 2, height / 2, bgKey).setScale(scale);
      // ロゴ帯(上部)と導線帯(中央〜下部)を軽く沈めて文字を読みやすくする暗幕。
      this.add.rectangle(0, 0, width, height * 0.46, 0x05080d, 0.4).setOrigin(0);
      this.add.rectangle(0, height * 0.6, width, height * 0.4, 0x05080d, 0.35).setOrigin(0);
    } else {
      this.drawBackdrop(width, height, loopCount);
    }
    if (loopCount >= 2) {
      this.add.rectangle(0, 0, width, height, loopRayTint(loopCount), 0.08).setOrigin(0);
    }
  }

  private drawBackdrop(width: number, height: number, loopCount: number): void {
    const g = this.add.graphics();
    // 遠景の発光ライン(地平線)。周回数に応じて色を変え、周回を重ねた実感を出す。
    const glowColor = loopRayTint(loopCount);
    g.fillStyle(0x12303a, 0.5);
    g.fillRect(0, height * 0.7, width, height * 0.3);
    g.lineStyle(scaled(2), glowColor, 0.25);
    g.lineBetween(0, height * 0.7, width, height * 0.7);
    // 崩れたビルのシルエット。配置/横幅の絶対px は scaled() で物理px換算する
    // (左端側は絶対座標、右端側は画面幅基準。w は全て絶対px)。
    g.fillStyle(0x0d141b, 1);
    const buildings = [
      [scaled(40), 0.55, scaled(90)],
      [scaled(160), 0.62, scaled(70)],
      [scaled(260), 0.5, scaled(110)],
      [width - scaled(320), 0.58, scaled(100)],
      [width - scaled(180), 0.52, scaled(130)],
      [width - scaled(80), 0.64, scaled(60)],
    ] as const;
    for (const [x, topRatio, w] of buildings) {
      g.fillRect(x, height * topRatio, w, height);
    }
  }

}
