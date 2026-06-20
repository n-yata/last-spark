import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { getStageData, type StageData, type EnemySpawn } from '../config/stages';
import {
  BOSS,
  FLYING_BOSS,
  ENVOY,
  CONTAINMENT_WARDEN,
  ECLIPSE_CORE,
  getStageTuning,
  NEUTRAL_STAGE_TUNING,
  type StageTuning,
} from '../config/balance';
import type { DifficultyMode } from '../types/save';
import { applyDifficultyToEnemySpawns, applyDifficultyToStageTuning } from './difficulty';

// ステージ進行(カメラ位置)に応じた雑魚敵の出現と、ボス戦突入の検知。

export class SpawnSystem {
  private readonly scene: Phaser.Scene;
  private readonly enemies: Phaser.Physics.Arcade.Group;
  private readonly enemyShots: Phaser.Physics.Arcade.Group;

  private stage!: StageData;
  private pending: EnemySpawn[] = [];
  private bossTriggered = false;
  private bossCallback?: () => void;
  /** ボス戦突入を発火するカメラ右端 X(loadStage で確定)。 */
  private bossTriggerX = Infinity;
  /** 現在ステージの難易度係数。spawn する敵へ伝搬する。 */
  private tuning: StageTuning = NEUTRAL_STAGE_TUNING;

  /** 画面右端からこの距離手前で先行出現させる(出現の唐突さを抑える)。 */
  private static readonly SPAWN_MARGIN_PX = 80;

  /** ボス全身が画面内に収まったうえで、さらにこの余白だけ内側に見えてから戦闘開始する。 */
  private static readonly BOSS_VISIBLE_MARGIN_PX = 24;

  /**
   * プレイヤー自身がボス出現地点のこの距離手前まで到達したら、カメラ右端に依らず必ず発火する
   * フォールバック距離(px)。横長/縦長など端末のアスペクト比によっては「カメラ右端」が
   * bossTriggerX に届かず(ステージ幅とボス位置が近いと顕著)ボスが永久に出ない不具合があるため、
   * プレイヤー到達でも確実にボス戦へ移行させる。
   *
   * この値は「ボスが出現する最低保証距離」も兼ねる。狭い/縦長画面ではカメラ経路が遅れ、
   * この距離まで近づいて初めてボスが出る = 接近しすぎないと出ない体感になる。広い画面の
   * カメラ経路と概ね揃う距離まで広げ、端末によらず少し手前でボスが出るようにする。
   */
  private static readonly BOSS_PLAYER_FALLBACK_PX = 400;

  constructor(
    scene: Phaser.Scene,
    enemies: Phaser.Physics.Arcade.Group,
    enemyShots: Phaser.Physics.Arcade.Group,
  ) {
    this.scene = scene;
    this.enemies = enemies;
    this.enemyShots = enemyShots;
  }

  /** ステージデータを読み込み、出現待ち敵を準備する。 */
  loadStage(stageId: string, difficulty: DifficultyMode = 'normal'): StageData {
    this.stage = getStageData(stageId);
    this.tuning = applyDifficultyToStageTuning(getStageTuning(stageId), difficulty);
    // x 昇順にして左から順に出現判定する
    this.pending = applyDifficultyToEnemySpawns(this.stage.enemies, difficulty).sort(
      (a, b) => a.x - b.x,
    );
    this.bossTriggered = false;
    // ボスが画面外のまま戦闘(BGM 切替・HP バー・アリーナ固定)が始まらないよう、
    // 「ボスの全身が画面内に見える位置」までトリガーを遅らせる。bossTriggerX は
    // 設計上の最短地点として尊重しつつ、可視位置との遅い方を採用する。
    const bossWidth =
      this.stage.bossKind === 'flying'
        ? this.stage.bossVariant === 'envoy'
          ? ENVOY.width
          : FLYING_BOSS.width
        : this.stage.bossKind === 'warden'
          ? CONTAINMENT_WARDEN.width
          : this.stage.bossKind === 'core'
            ? ECLIPSE_CORE.width
            : BOSS.width;
    const bossHalfWidth = bossWidth / 2;
    this.bossTriggerX = Math.max(
      this.stage.bossTriggerX,
      this.stage.bossSpawn.x + bossHalfWidth + SpawnSystem.BOSS_VISIBLE_MARGIN_PX,
    );
    return this.stage;
  }

  onBossTrigger(cb: () => void): void {
    this.bossCallback = cb;
  }

  /**
   * カメラ右端 X(と任意でプレイヤー X)に応じて出現/ボストリガを処理する。
   * ボス戦突入は「カメラ右端が bossTriggerX に到達」が基本だが、端末アスペクト比によっては
   * カメラ右端が bossTriggerX へ届かない場合があるため、「プレイヤーがボス出現地点付近へ到達」
   * でも発火させる(端末非依存でボスが必ず出る)。
   */
  update(cameraRightX: number, playerX = -Infinity): void {
    const spawnLine = cameraRightX + SpawnSystem.SPAWN_MARGIN_PX;
    while (this.pending.length > 0 && this.pending[0].x <= spawnLine) {
      const spawn = this.pending.shift() as EnemySpawn;
      this.spawnEnemy(spawn);
    }

    const cameraReached = cameraRightX >= this.bossTriggerX;
    const playerReached = playerX >= this.stage.bossSpawn.x - SpawnSystem.BOSS_PLAYER_FALLBACK_PX;
    if (!this.bossTriggered && (cameraReached || playerReached)) {
      this.bossTriggered = true;
      this.bossCallback?.();
    }
  }

  private spawnEnemy(spawn: EnemySpawn): void {
    const enemy = new Enemy(this.scene, spawn.x, spawn.y, spawn.pattern, this.tuning);
    enemy.setProjectiles(this.enemyShots);
    this.enemies.add(enemy);
    // Arcade の Group.add() はグループ既定値でボディ設定を上書きするため、
    // 追加後にボディ設定(重力 ON × 可動)を再適用して接地挙動を保証する。
    enemy.configureBody();
  }

  /** 生存中の敵すべてに毎フレームの振る舞いを適用する。 */
  updateEnemies(now: number, playerX: number): void {
    this.enemies.children.iterate((child) => {
      const enemy = child as Enemy;
      if (enemy && enemy.active) {
        enemy.updateBehavior(now, playerX);
      }
      return true;
    });
  }

  isBossTriggered(): boolean {
    return this.bossTriggered;
  }
}
