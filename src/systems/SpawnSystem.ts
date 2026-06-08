import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { getStageData, type StageData, type EnemySpawn } from '../config/stage1';

// ステージ進行(カメラ位置)に応じた雑魚敵の出現と、ボス戦突入の検知。

export class SpawnSystem {
  private readonly scene: Phaser.Scene;
  private readonly enemies: Phaser.Physics.Arcade.Group;
  private readonly enemyShots: Phaser.Physics.Arcade.Group;

  private stage!: StageData;
  private pending: EnemySpawn[] = [];
  private bossTriggered = false;
  private bossCallback?: () => void;

  /** 画面右端からこの距離手前で先行出現させる(出現の唐突さを抑える)。 */
  private static readonly SPAWN_MARGIN_PX = 80;

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
    // x 昇順にして左から順に出現判定する
    this.pending = [...this.stage.enemies].sort((a, b) => a.x - b.x);
    this.bossTriggered = false;
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

    if (!this.bossTriggered && cameraRightX >= this.stage.bossTriggerX) {
      this.bossTriggered = true;
      this.bossCallback?.();
    }
  }

  private spawnEnemy(spawn: EnemySpawn): void {
    const enemy = new Enemy(this.scene, spawn.x, spawn.y, spawn.pattern);
    enemy.setProjectiles(this.enemyShots);
    this.enemies.add(enemy);
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
