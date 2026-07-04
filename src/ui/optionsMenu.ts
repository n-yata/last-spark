import Phaser from 'phaser';
import { getSound } from '../systems/SoundManager';
import { getHaptics } from '../systems/haptics';
import { SaveManager } from '../persistence/SaveManager';
import type { GameSettings } from '../types/save';
import { scaled, scaledFontPx } from '../config/uiScale';
import { createNeonButton, type NeonButtonStyle } from './neonButton';
import { PLAYABLE_STAGES } from '../stageSelect/stages';
import { isStageUnlocked } from '../stageSelect/stageCards';
import { getControlEntries } from './controlsData';
import { adjustStep, stepToVolume, volumeToStep, volumeBar, volumePercent } from './volumeSteps';
import { difficultyLabel, toggleDifficulty } from '../systems/difficulty';
import { graphicsFxLabel, cycleGraphicsFx } from '../config/graphicsQuality';
import { SETTINGS } from '../config/registryKeys';

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

// 配色(既存パレットに準拠)。ボタンの配色は neonButton の variant 側で持つ。
const COLOR_TITLE = '#37f7d8';
const COLOR_LABEL = '#cfe9e2';
const COLOR_VALUE = '#9fffe8';
const COLOR_MUTED = '#5a6b6a';

/** 縦並びメニューのパネル幅を揃える下限(ベースpx)。 */
const MENU_MIN_WIDTH = 240;

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

  // NeonButton を生成して Container へ追加する薄いヘルパー(呼び出しの重複を減らす)。
  const addButton = (
    c: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    style?: NeonButtonStyle,
  ): void => {
    c.add(createNeonButton(scene, x, y, label, onClick, style).container);
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
      [`エフェクト: ${graphicsFxLabel(settings.graphicsFx)}`, () => {
        settings = { ...settings, graphicsFx: cycleGraphicsFx(settings.graphicsFx) };
        save.updateSettings({ graphicsFx: settings.graphicsFx });
        // 実行中の GameScene へ即時反映を通知する(ポーズ中でも postFX を付け替えられる)。
        // タイトルから開いた場合は購読者不在で無害。正本はあくまで SaveManager。
        scene.registry.set(SETTINGS.graphicsFx, settings.graphicsFx);
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

    // パネル型ボタンはテキストより背が高いため、縦レンジを旧実装(0.32〜0.82)より広く取る。
    const top = height * 0.28;
    const bottom = height * 0.87;
    const gap = Math.min(scaled(60), (bottom - top) / Math.max(1, items.length - 1));
    items.forEach(([label, fn], i) => {
      // 最後の項目(ゲームに戻る/とじる)は主導線として primary で強調する。
      const variant = i === items.length - 1 ? 'primary' : 'default';
      addButton(c, width / 2, top + gap * i, label, fn, { variant, minWidth: MENU_MIN_WIDTH });
    });
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
    const rowGap = Math.min(scaled(74), (height * 0.88 - y) / 5);

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
      addButton(c, width / 2 - scaled(120), rowY + scaled(28), '◂', () => {
        changeVolume(role, -1);
        refresh();
      }, { variant: 'ghost', fontSize: 24 });
      addButton(c, width / 2 + scaled(120), rowY + scaled(28), '▸', () => {
        changeVolume(role, 1);
        refresh();
      }, { variant: 'ghost', fontSize: 24 });
      y += rowGap;
    };

    addChannel('BGM', 'bgm');
    addChannel('SE', 'se');
    // チャンネル行(ラベル+バー)はパネル型ボタンより背が低い前提の rowGap のため、
    // パネル型の MUTE がバー行に食い込まないよう追加の余白を挟む。
    y += scaled(14);

    // ミュートトグル: 切替後はバー色も変わるためパネルを作り直す。
    addButton(c, width / 2, y, `MUTE: ${settings.muted ? 'ON' : 'OFF'}`, () => {
      settings = { ...settings, muted: !settings.muted };
      save.updateSettings({ muted: settings.muted });
      sound.applySettings(settings);
      playTap();
      setPanel(buildVolume);
    }, { fontSize: 18, minWidth: MENU_MIN_WIDTH });
    y += rowGap * 0.85;

    // 振動トグル: ON へ切り替えた瞬間に試し振動を出し、手元で効果を確認できるようにする。
    addButton(c, width / 2, y, `しんどう: ${settings.vibration ? 'ON' : 'OFF'}`, () => {
      settings = { ...settings, vibration: !settings.vibration };
      save.updateSettings({ vibration: settings.vibration });
      getHaptics().setEnabled(settings.vibration);
      if (settings.vibration) getHaptics().vibrateHit();
      playTap();
      setPanel(buildVolume);
    }, { fontSize: 18, minWidth: MENU_MIN_WIDTH });
    y += rowGap * 0.85;

    addButton(c, width / 2, y, '◂ BACK', () => { playTap(); showRoot(); }, { variant: 'ghost' });
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
    addButton(c, width / 2, y + scaled(8), '◂ BACK', () => { playTap(); showRoot(); }, {
      variant: 'ghost',
    });
    return c;
  };

  // --- ステージ移動パネル(ポーズ専用) ---
  const buildStageNav = (): Phaser.GameObjects.Container => {
    const c = scene.add.container(0, 0);
    const nav = config.stageNav;
    if (!nav) return c; // enableStageNav=true のとき必ず stageNav がある前提
    let y = height * 0.34;
    const gap = scaled(62);
    addButton(c, width / 2, y, '↻ もう一度プレイ', () => {
      playTap();
      setPanel(() => buildConfirm('もう一度\n最初からプレイしますか？', nav.onRetry));
    }, { minWidth: MENU_MIN_WIDTH });
    y += gap;
    addButton(c, width / 2, y, '⌂ タイトルへ戻る', () => {
      playTap();
      setPanel(() =>
        buildConfirm('タイトルへ戻りますか？\n進行中のプレイは失われます', nav.onReturnTitle),
      );
    }, { minWidth: MENU_MIN_WIDTH });
    y += gap;
    addButton(c, width / 2, y, 'ステージ選択', () => {
      playTap();
      setPanel(buildStageList);
    }, { minWidth: MENU_MIN_WIDTH });
    y += gap;
    addButton(c, width / 2, y, '◂ BACK', () => { playTap(); showRoot(); }, { variant: 'ghost' });
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
    // 破壊的操作(はい)は danger で強調し、取り消し(いいえ)と誤認しにくくする。
    addButton(c, width / 2 - scaled(80), height * 0.58, 'はい', () => {
      playTap();
      onYes();
    }, { variant: 'danger', minWidth: 120 });
    addButton(c, width / 2 + scaled(80), height * 0.58, 'いいえ', () => {
      playTap();
      showStageNav();
    }, { minWidth: 120 });
    return c;
  };

  // ステージ選択サブパネル。タイトルのカード式ステージセレクトと同じ解放ルールを適用し、
  // 未解放ステージはこの経路からも選べない(ロックの素通りを防ぐ)。
  const buildStageList = (): Phaser.GameObjects.Container => {
    const c = scene.add.container(0, 0);
    const nav = config.stageNav;
    if (!nav) return c;
    const progress = save.getData();
    const top = height * 0.22;
    const bottom = height * 0.9;
    const rows = PLAYABLE_STAGES.length + 1;
    const gap = Math.min(scaled(50), (bottom - top) / (rows - 1));
    PLAYABLE_STAGES.forEach((stage, i) => {
      if (!isStageUnlocked(i, progress.clearedStages, progress.bestTimeMs)) {
        c.add(
          scene.add
            .text(width / 2, top + gap * i, `${stage.label}  [LOCKED]`, {
              fontFamily: 'monospace',
              fontSize: scaledFontPx(18),
              color: COLOR_MUTED,
            })
            .setOrigin(0.5),
        );
        return;
      }
      addButton(c, width / 2, top + gap * i, stage.label, () => {
        // 効果音・遷移は onSelectStage 側に委譲し二重再生を避ける。
        nav.onSelectStage(stage.id);
      }, { fontSize: 18, minWidth: MENU_MIN_WIDTH });
    });
    addButton(c, width / 2, top + gap * PLAYABLE_STAGES.length, '◂ BACK', () => {
      playTap();
      showStageNav();
    }, { variant: 'ghost' });
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
