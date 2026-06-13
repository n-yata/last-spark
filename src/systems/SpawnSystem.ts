import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { getStageData, type StageData, type EnemySpawn } from '../config/stage1';
import {
  BOSS,
  FLYING_BOSS,
  getStageTuning,
  NEUTRAL_STAGE_TUNING,
  type StageTuning,
} from '../config/balance';

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
  loadStage(stageId: string): StageData {
    this.stage = getStageData(stageId);
    this.tuning = getStageTuning(stageId);
    // x 昇順にして左から順に出現判定する
    this.pending = [...this.stage.enemies].sort((a, b) => a.x - b.x);
    this.bossTriggered = false;
    // ボスが画面外のまま戦闘(BGM 切替・HP バー・アリーナ固定)が始まらないよう、
    // 「ボスの全身が画面内に見える位置」までトリガーを遅らせる。bossTriggerX は
    // 設計上の最短地点として尊重しつつ、可視位置との遅い方を採用する。
    const bossHalfWidth =
      (this.stage.bossKind === 'flying' ? FLYING_BOSS.width : BOSS.width) / 2;
    this.bossTriggerX = Math.max(
      this.stage.bossTriggerX,
      this.stage.bossSpawn.x + bossHalfWidth + SpawnSystem.BOSS_VISIBLE_MARGIN_PX,
    );
    return this.stage;
  }

  onBossTrigger(cb: () => void): void {
    this.bossCallback = cb;
  }

  /** カメラ右端 X に応じて出現/ボストリガを処理する。 */
  update(cameraRightX: number): void {
    const spawnLine = cameraRightX + SpawnSystem.SPAWN_MARGIN_PX;
    while (this.pending.length > 0 && this.pending[0].x <= spawnLine) {
      const spawn = this.pending.shift() as EnemySpawn;
      this.spawnEnemy(spawn);
    }

    if (!this.bossTriggered && cameraRightX >= this.bossTriggerX) {
      this.bossTriggered = true;
      this.bossCallback?.();
    }
  }

  private spawnEnemy(spawn: EnemySpawn): void {
    const enemy = new Enemy(this.scene, spawn.x, spawn.y, spawn.pattern, this.tuning);
    enemy.setProjectiles(this.enemyShots);
    this.enemies.add(enemy);
    // Arcade の Group.add() はグループ既定値(allowGravity=true)でボディ設定を
    // 上書きする。turret の重力 OFF が打ち消されると床をすり抜けて落下するため、
    // 追加後に系統別のボディ設定を再適用する。
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
