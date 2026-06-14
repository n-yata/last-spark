import { describe, it, expect, vi, beforeEach } from 'vitest';
// 型のみのインポート(実行時には消去されるため phaser モックと競合しない)。
// テスト本文の型注釈で Phaser.Physics.Arcade.Group / Phaser.Scene を使うために必要。
import type Phaser from 'phaser';
import { FLYING_BOSS } from '../../../src/config/balance';
import { getStageData } from '../../../src/config/stages';

// SpawnSystem のボス戦突入トリガ発火ロジックの回帰テスト。
//
// 背景: 以前のトリガ条件は「カメラ右端 cameraRightX が bossTriggerX に到達したら発火」だけだった。
// しかし端末のアスペクト比(横長/縦長)によってはカメラ右端が bossTriggerX に届かず
// (ステージ幅とボス位置が近い stage2 で顕著)、ボスが永久に出ない不具合があった。
// 修正で「プレイヤー自身がボス出現地点の手前 BOSS_PLAYER_FALLBACK_PX まで到達」でも
// 発火するフォールバックを OR 条件で追加した。本テストはその両経路と二重発火防止・後方互換を守る。
//
// Phaser は Canvas/WebGL 前提で jsdom では直接動かせないため phaser をモックする。
// また update() はボス到達前に雑魚敵を spawn する(new Enemy(...))が、本テストの関心は
// ボストリガ発火のみのため Enemy をモックして spawnEnemy() を無害化し、実プロダクトの
// update()/onBossTrigger() ロジックそのものを検証する(ロジックの再実装ではない)。

vi.mock('phaser', () => {
  return {
    default: {
      Physics: {
        Arcade: {
          Sprite: class MockSprite {},
          Body: class MockBody {},
          Group: class MockGroup {},
        },
      },
      Scene: class MockScene {},
    },
  };
});

// Enemy 実体は Phaser スプライト(Canvas 依存)を継承するため、spawnEnemy() が呼ばれても
// 安全なスタブに差し替える。setProjectiles/configureBody も no-op で受ける。
vi.mock('../../../src/entities/Enemy', () => {
  class MockEnemy {
    setProjectiles() {
      return this;
    }
    configureBody() {
      return this;
    }
  }
  return { Enemy: MockEnemy };
});

// phaser / Enemy モック確立後に対象をインポートする(vi.mock はホイスティングされる)。
import { SpawnSystem } from '../../../src/systems/SpawnSystem';

// Arcade.Group の最小スタブ。SpawnSystem は add() のみ使う(雑魚敵追加)。
function makeMockGroup() {
  return {
    add: vi.fn(),
    children: { iterate: vi.fn() },
  } as unknown as Phaser.Physics.Arcade.Group;
}

// SpawnSystem の private フィールドへアクセスするための緩い型(テスト専用)。
// クラス型との交差は private 名衝突で never に潰れるため、独立した形で表現する。
type SpawnSystemInternals = {
  bossTriggerX: number;
};

// loadStage 後に確定する実効 bossTriggerX(private)を読むためのヘルパー。
function readBossTriggerX(spawn: SpawnSystem): number {
  return (spawn as unknown as SpawnSystemInternals).bossTriggerX;
}

const STAGE_ID = 'stage2';

// テスト対象ステージの素の定義値(マジックナンバー直書きを避け、stage 定義から導く)。
const stage = getStageData(STAGE_ID);
const RAW_BOSS_TRIGGER_X = stage.bossTriggerX; // 3700
const BOSS_SPAWN_X = stage.bossSpawn.x; // 3950
// 修正で導入されたフォールバック距離(px)。private static のため定義値を参照する。
const BOSS_PLAYER_FALLBACK_PX = 400;

function makeSpawnSystem(): SpawnSystem {
  const scene = {} as unknown as Phaser.Scene;
  const spawn = new SpawnSystem(scene, makeMockGroup(), makeMockGroup());
  spawn.loadStage(STAGE_ID);
  return spawn;
}

describe('SpawnSystem ボス戦突入トリガ', () => {
  let spawn: SpawnSystem;
  let onBoss: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    spawn = makeSpawnSystem();
    onBoss = vi.fn();
    spawn.onBossTrigger(onBoss);
  });

  // loadStage 後の実効 bossTriggerX は「素の bossTriggerX」と「ボス全身が画面内に見える位置
  // (bossSpawn.x + bossHalfWidth + 可視余白)」の遅い方。stage2(飛行ボス)では後者が勝つため、
  // ここを基準に「カメラ到達」「未到達」の閾値を組む(マジックナンバー直書きを避ける)。
  it('実効 bossTriggerX は素の値とボス可視位置の遅い方になっている(前提の健全性確認)', () => {
    const effective = readBossTriggerX(spawn);
    // 素の bossTriggerX 以上であること(可視位置遅延で前に出ない)。
    expect(effective).toBeGreaterThanOrEqual(RAW_BOSS_TRIGGER_X);
    // stage2 は飛行ボスで bossSpawn が後方にあるため、可視位置が素の値を上回る。
    const visiblePos = BOSS_SPAWN_X + FLYING_BOSS.width / 2; // + 可視余白(24)
    expect(effective).toBeGreaterThanOrEqual(visiblePos);
  });

  // ケース1: カメラ右端が bossTriggerX に到達 → プレイヤー位置に依らず発火する。
  it('カメラ右端が bossTriggerX に到達すると発火する(従来経路)', () => {
    const effective = readBossTriggerX(spawn);
    // プレイヤーはフォールバック圏外(十分手前)に置き、純粋にカメラ到達だけで発火することを示す。
    const playerFarBehind = BOSS_SPAWN_X - BOSS_PLAYER_FALLBACK_PX - 100;

    spawn.update(effective, playerFarBehind);

    expect(onBoss).toHaveBeenCalledTimes(1);
    expect(spawn.isBossTriggered()).toBe(true);
  });

  // ケース2(回帰ガードの核心): カメラ右端が bossTriggerX に届かないのに、
  // プレイヤーがボス出現地点の手前 BOSS_PLAYER_FALLBACK_PX まで到達 → 発火する。
  it('カメラ未到達でもプレイヤーがボス手前に到達すれば発火する(フォールバック・回帰ガード)', () => {
    const effective = readBossTriggerX(spawn);
    // カメラは実効 bossTriggerX に「届かない」値(アスペクト比依存の症状を再現)。
    const cameraNotReaching = effective - 1;
    // プレイヤーはフォールバック閾値ちょうどに到達(>= bossSpawn.x - 400)。
    const playerAtFallback = BOSS_SPAWN_X - BOSS_PLAYER_FALLBACK_PX;

    // 事前条件: このカメラ値だけでは従来経路では発火しないことを担保する。
    expect(cameraNotReaching).toBeLessThan(effective);

    spawn.update(cameraNotReaching, playerAtFallback);

    expect(onBoss).toHaveBeenCalledTimes(1);
    expect(spawn.isBossTriggered()).toBe(true);
  });

  // ケース3: カメラ・プレイヤーいずれも未達なら発火しない。
  it('カメラもプレイヤーも未達なら発火しない', () => {
    const effective = readBossTriggerX(spawn);
    const cameraNotReaching = effective - 1;
    // プレイヤーはフォールバック閾値より 1px 手前(未達)。
    const playerJustBeforeFallback = BOSS_SPAWN_X - BOSS_PLAYER_FALLBACK_PX - 1;

    spawn.update(cameraNotReaching, playerJustBeforeFallback);

    expect(onBoss).not.toHaveBeenCalled();
    expect(spawn.isBossTriggered()).toBe(false);
  });

  // ケース4: 一度発火したら、その後の update では二度と発火しない(bossTriggered ラッチ)。
  it('二重発火しない(発火後の再 update でコールバックは1回きり)', () => {
    const effective = readBossTriggerX(spawn);

    // 1回目: カメラ到達で発火。
    spawn.update(effective, -Infinity);
    expect(onBoss).toHaveBeenCalledTimes(1);

    // 2回目以降: 条件を満たし続けても再発火しない。
    spawn.update(effective, BOSS_SPAWN_X); // カメラ・プレイヤーとも到達状態
    spawn.update(effective + 500, BOSS_SPAWN_X + 500);

    expect(onBoss).toHaveBeenCalledTimes(1);
  });

  // ケース5: playerX 省略時(デフォルト -Infinity)でも従来どおりカメラ到達のみで発火する(後方互換)。
  it('playerX 省略時はカメラ到達のみで発火する(後方互換)', () => {
    const effective = readBossTriggerX(spawn);

    // カメラ未到達 & playerX 省略 → 発火しない(プレイヤー経路は -Infinity で無効)。
    spawn.update(effective - 1);
    expect(onBoss).not.toHaveBeenCalled();
    expect(spawn.isBossTriggered()).toBe(false);

    // カメラ到達 & playerX 省略 → 発火する。
    spawn.update(effective);
    expect(onBoss).toHaveBeenCalledTimes(1);
    expect(spawn.isBossTriggered()).toBe(true);
  });
});
