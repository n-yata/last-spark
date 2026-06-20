import Phaser from 'phaser';
import { getSound } from '../systems/SoundManager';
import { SaveManager } from '../persistence/SaveManager';
import type { GameSettings } from '../types/save';
import { scaled, scaledFontPx } from '../config/uiScale';
import { makeMenuButton } from './menuButton';
import { PLAYABLE_STAGES } from '../stageSelect/stages';
import { getControlEntries } from './controlsData';
import { adjustStep, stepToVolume, volumeToStep, volumeBar, volumePercent } from './volumeSteps';
import { difficultyLabel, toggleDifficulty } from '../systems/difficulty';

// タイトル/ポーズ双方から開ける共通オプションオーバーレイ(ファクトリ関数)。
// stageSelect.ts の「Container オーバーレイ + 暗幕 + 縦並びボタン」流儀を一般化し、
// 「音量設定 / 操作説明 / ステージ移動」をパネル切替で1画面に束ねる。
// 描画の絶対px・fontSize は uiScale の scaled()/scaledFontPx() を経由する(高DPI規約)。

/** ステージ移動パネルの各アクション(ポーズ時のみ使用)。 */
export interface StageNavActions {
  /** 現ステージ(リトライ/選択の起点。表示用)。 */
  currentStageId: string;
  /** 現ステージを最初からやり直す。 */
  onRetry: () => void;
  /** タイトル画面へ戻る。 */
  onReturnTitle: () => void;
  /** 選択したステージへ移動する(効果音・遷移は委譲先で行う)。 */
  onSelectStage: (stageId: string) => void;
}

export interface OptionsMenuConfig {
  scene: Phaser.Scene;
  /** ステージ移動パネルを出すか。タイトル=false(音量・操作説明のみ)、ポーズ=true。 */
  enableStageNav: boolean;
  /** enableStageNav=true のとき必須。ステージ移動の各アクション。 */
  stageNav?: StageNavActions;
  /** 閉じたとき(とじる/ゲームに戻る)の処理。タイトル=破棄のみ、ポーズ=再開。 */
  onClose: () => void;
}

export interface OptionsMenu {
  /** ルート Container(呼び出し側が depth/破棄を管理したい場合に参照)。 */
  readonly container: Phaser.GameObjects.Container;
  isOpen(): boolean;
  destroy(): void;
}

// 配色(既存パレットに準拠)。
const COLOR_TITLE = '#37f7d8';
const COLOR_LABEL = '#cfe9e2';
const COLOR_VALUE = '#9fffe8';
const COLOR_MUTED = '#5a6b6a';
const COLOR_DANGER = '#ff9a8a';
const COLOR_DANGER_HOVER = '#ffd27a';

/**
 * 共通オプションオーバーレイを生成してシーンに追加する。
 * ルート(暗幕 + タイトル)は常設し、中央の「パネル」だけを差し替えて画面遷移する。
 */
export function createOptionsMenu(config: OptionsMenuConfig): OptionsMenu {
  const { scene } = config;
  const { width, height } = scene.scale;
  const sound = getSound();
  const playTap = (): void => sound.playSe('uiTap');

  // 設定はメニュー内で保持し、変更ごとに即時反映(applySettings)+永続化(updateSettings)する。
  const save = new SaveManager();
  let settings: GameSettings = save.getData().settings;

  let open = true;
  const root = scene.add.container(0, 0).setDepth(1000);

  // 暗幕: 背後シーン/ゾーンへの透過とクリックを防ぐ。
  root.add(scene.add.rectangle(0, 0, width, height, 0x05080c, 0.9).setOrigin(0).setInteractive());
  // 見出し
  root.add(
    scene.add
      .text(width / 2, height * 0.12, 'OPTIONS', {
        fontFamily: 'monospace',
        fontSize: scaledFontPx(28),
        color: COLOR_TITLE,
        fontStyle: 'bold',
      })
      .setOrigin(0.5),
  );

  // 現在表示中のパネル(切替時に破棄して差し替える)。
  let panel: Phaser.GameObjects.Container | undefined;
  const setPanel = (build: () => Phaser.GameObjects.Container): void => {
    panel?.destroy();
    panel = build();
    root.add(panel);
  };

  // --- ルート(メニュー項目) ---
  const buildRoot = (): Phaser.GameObjects.Container => {
    const c = scene.add.container(0, 0);
    const items: Array<[string, () => void]> = [
      [`MODE: ${difficultyLabel(settings.difficulty)}`, () => {
        settings = { ...settings, difficulty: toggleDifficulty(settings.difficulty) };
        save.updateSettings({ difficulty: settings.difficulty });
        playTap();
        setPanel(buildRoot);
      }],
      [`BUSTER: ${settings.busterMode ? 'ON' : 'OFF'}`, () => {
        settings = { ...settings, busterMode: !settings.busterMode };
        save.updateSettings({ busterMode: settings.busterMode });
        playTap();
        setPanel(buildRoot);
      }],
      ['音量設定', () => { playTap(); showVolume(); }],
      ['操作説明', () => { playTap(); showControls(); }],
    ];
    if (config.enableStageNav) {
      items.push(['ステージ移動', () => { playTap(); showStageNav(); }]);
    }
    items.push([
      config.enableStageNav ? '▶ ゲームに戻る' : '◂ とじる',
      () => { playTap(); config.onClose(); },
    ]);

    const top = height * 0.32;
    const bottom = height * 0.82;
    const gap = Math.min(scaled(60), (bottom - top) / Math.max(1, items.length - 1));
    items.forEach(([label, fn], i) => c.add(makeMenuButton(scene, width / 2, top + gap * i, label, fn)));
    return c;
  };

  // --- 音量設定パネル ---
  const changeVolume = (role: 'bgm' | 'se', delta: number): void => {
    if (role === 'bgm') {
      const next = stepToVolume(adjustStep(volumeToStep(settings.bgmVolume), delta));
      settings = { ...settings, bgmVolume: next };
      save.updateSettings({ bgmVolume: next });
    } else {
      const next = stepToVolume(adjustStep(volumeToStep(settings.seVolume), delta));
      settings = { ...settings, seVolume: next };
      save.updateSettings({ seVolume: next });
    }
    sound.applySettings(settings);
    // 変更を耳で確認できるようテスト音を鳴らす(BGM は applySettings で即変化する)。
    playTap();
  };

  const buildVolume = (): Phaser.GameObjects.Container => {
    const c = scene.add.container(0, 0);
    let y = height * 0.3;
    const rowGap = Math.min(scaled(74), (height * 0.88 - y) / 4);

    const addChannel = (label: string, role: 'bgm' | 'se'): void => {
      const rowY = y;
      c.add(
        scene.add
          .text(width / 2, rowY, label, {
            fontFamily: 'monospace',
            fontSize: scaledFontPx(18),
            color: COLOR_LABEL,
          })
          .setOrigin(0.5),
      );
      const bar = scene.add
        .text(width / 2, rowY + scaled(28), '', {
          fontFamily: 'monospace',
          fontSize: scaledFontPx(20),
        })
        .setOrigin(0.5);
      const refresh = (): void => {
        const step = volumeToStep(role === 'bgm' ? settings.bgmVolume : settings.seVolume);
        bar.setText(`${volumeBar(step)}  ${volumePercent(step)}%`);
        bar.setColor(settings.muted ? COLOR_MUTED : COLOR_VALUE);
      };
      refresh();
      c.add(bar);
      c.add(
        makeMenuButton(scene, width / 2 - scaled(120), rowY + scaled(28), '◂', () => {
          changeVolume(role, -1);
          refresh();
        }, { fontSize: 24 }),
      );
      c.add(
        makeMenuButton(scene, width / 2 + scaled(120), rowY + scaled(28), '▸', () => {
          changeVolume(role, 1);
          refresh();
        }, { fontSize: 24 }),
      );
      y += rowGap;
    };

    addChannel('BGM', 'bgm');
    addChannel('SE', 'se');

    // ミュートトグル: 切替後はバー色も変わるためパネルを作り直す。
    c.add(
      makeMenuButton(scene, width / 2, y, `MUTE: ${settings.muted ? 'ON' : 'OFF'}`, () => {
        settings = { ...settings, muted: !settings.muted };
        save.updateSettings({ muted: settings.muted });
        sound.applySettings(settings);
        playTap();
        setPanel(buildVolume);
      }),
    );
    y += rowGap * 0.85;

    c.add(makeMenuButton(scene, width / 2, y, '◂ BACK', () => { playTap(); showRoot(); }));
    return c;
  };

  // --- 操作説明パネル ---
  const buildControls = (): Phaser.GameObjects.Container => {
    const c = scene.add.container(0, 0);
    let y = height * 0.26;
    c.add(
      scene.add
        .text(width / 2, y, '― そうさ ―', {
          fontFamily: 'monospace',
          fontSize: scaledFontPx(16),
          color: COLOR_LABEL,
        })
        .setOrigin(0.5),
    );
    y += scaled(40);
    for (const e of getControlEntries()) {
      c.add(
        scene.add
          .text(width / 2, y, e.action, {
            fontFamily: 'monospace',
            fontSize: scaledFontPx(18),
            color: COLOR_TITLE,
          })
          .setOrigin(0.5),
      );
      c.add(
        scene.add
          .text(width / 2, y + scaled(22), `KEY ${e.keyboard}    TOUCH ${e.touch}`, {
            fontFamily: 'monospace',
            fontSize: scaledFontPx(13),
            color: COLOR_LABEL,
            align: 'center',
          })
          .setOrigin(0.5),
      );
      y += scaled(54);
    }
    c.add(makeMenuButton(scene, width / 2, y + scaled(8), '◂ BACK', () => { playTap(); showRoot(); }));
    return c;
  };

  // --- ステージ移動パネル(ポーズ専用) ---
  const buildStageNav = (): Phaser.GameObjects.Container => {
    const c = scene.add.container(0, 0);
    const nav = config.stageNav;
    if (!nav) return c; // enableStageNav=true のとき必ず stageNav がある前提
    let y = height * 0.34;
    const gap = scaled(62);
    c.add(
      makeMenuButton(scene, width / 2, y, '↻ もう一度プレイ', () => {
        playTap();
        setPanel(() => buildConfirm('もう一度\n最初からプレイしますか？', nav.onRetry));
      }),
    );
    y += gap;
    c.add(
      makeMenuButton(scene, width / 2, y, '⌂ タイトルへ戻る', () => {
        playTap();
        setPanel(() =>
          buildConfirm('タイトルへ戻りますか？\n進行中のプレイは失われます', nav.onReturnTitle),
        );
      }),
    );
    y += gap;
    c.add(
      makeMenuButton(scene, width / 2, y, 'ステージ選択', () => {
        playTap();
        setPanel(buildStageList);
      }),
    );
    y += gap;
    c.add(makeMenuButton(scene, width / 2, y, '◂ BACK', () => { playTap(); showRoot(); }));
    return c;
  };

  // 破壊的遷移(リトライ/タイトル)の確認サブパネル。
  const buildConfirm = (
    message: string,
    onYes: () => void,
  ): Phaser.GameObjects.Container => {
    const c = scene.add.container(0, 0);
    c.add(
      scene.add
        .text(width / 2, height * 0.4, message, {
          fontFamily: 'monospace',
          fontSize: scaledFontPx(18),
          color: COLOR_LABEL,
          align: 'center',
        })
        .setOrigin(0.5),
    );
    c.add(
      makeMenuButton(scene, width / 2 - scaled(80), height * 0.58, 'はい', () => {
        playTap();
        onYes();
      }, { color: COLOR_DANGER, hoverColor: COLOR_DANGER_HOVER }),
    );
    c.add(
      makeMenuButton(scene, width / 2 + scaled(80), height * 0.58, 'いいえ', () => {
        playTap();
        showStageNav();
      }),
    );
    return c;
  };

  // ステージ選択サブパネル(stageSelect と同様、全ステージから選べる)。
  const buildStageList = (): Phaser.GameObjects.Container => {
    const c = scene.add.container(0, 0);
    const nav = config.stageNav;
    if (!nav) return c;
    const top = height * 0.22;
    const bottom = height * 0.9;
    const rows = PLAYABLE_STAGES.length + 1;
    const gap = Math.min(scaled(50), (bottom - top) / (rows - 1));
    PLAYABLE_STAGES.forEach((stage, i) => {
      c.add(
        makeMenuButton(scene, width / 2, top + gap * i, stage.label, () => {
          // 効果音・遷移は onSelectStage 側に委譲し二重再生を避ける。
          nav.onSelectStage(stage.id);
        }, { fontSize: 18 }),
      );
    });
    c.add(
      makeMenuButton(scene, width / 2, top + gap * PLAYABLE_STAGES.length, '◂ BACK', () => {
        playTap();
        showStageNav();
      }),
    );
    return c;
  };

  const showRoot = (): void => setPanel(buildRoot);
  const showVolume = (): void => setPanel(buildVolume);
  const showControls = (): void => setPanel(buildControls);
  const showStageNav = (): void => setPanel(buildStageNav);

  showRoot();

  return {
    container: root,
    isOpen: () => open,
    destroy: () => {
      if (!open) return;
      open = false;
      root.destroy();
    },
  };
}
