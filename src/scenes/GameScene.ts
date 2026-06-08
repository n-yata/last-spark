import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { TEX } from '../config/assetKeys';
import { HUD } from '../config/registryKeys';
import { STAGE, BOSS } from '../config/balance';
import { getStageData, type StageData } from '../config/stage1';
import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { Projectile } from '../entities/Projectile';
import { InputController } from '../systems/InputController';
import { CombatSystem } from '../systems/CombatSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { chargeRatio } from '../systems/shot';

// ステージ本体。プレイヤー/敵/ボス/弾/カメラ/物理を統括する。

const STAGE_ID = 'stage1';
const PROJECTILE_POOL = 32;

export class GameScene extends Phaser.Scene {
  private stage!: StageData;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private playerShots!: Phaser.Physics.Arcade.Group;
  private enemyShots!: Phaser.Physics.Arcade.Group;
  private inputController!: InputController;
  private combat!: CombatSystem;
  private spawn!: SpawnSystem;
  private boss?: Boss;
  private startTime = 0;
  private ended = false;

  constructor() {
    super(SCENE_KEYS.game);
  }

  create(): void {
    this.ended = false;
    this.stage = getStageData(STAGE_ID);
    this.physics.world.setBounds(0, 0, this.stage.width, STAGE.height + 200);

    this.buildPlatforms();
    this.createGroups();
    this.createPlayer();
    this.createSystems();
    this.setupCamera();

    this.startTime = this.time.now;
    this.scene.launch(SCENE_KEYS.ui);
    this.initHud();
    this.setupOrientationHandling();
  }

  private buildPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();
    for (const rect of this.stage.platforms) {
      const isGround = rect.height > 40;
      const tex = isGround ? TEX.ground : TEX.platform;
      const img = this.platforms
        .create(rect.x + rect.width / 2, rect.y + rect.height / 2, tex) as Phaser.Physics.Arcade.Sprite;
      img.setDisplaySize(rect.width, rect.height);
      img.refreshBody();
    }
  }

  private createGroups(): void {
    this.enemies = this.physics.add.group();
    this.playerShots = this.physics.add.group({
      classType: Projectile,
      maxSize: PROJECTILE_POOL,
      runChildUpdate: true,
    });
    this.enemyShots = this.physics.add.group({
      classType: Projectile,
      maxSize: PROJECTILE_POOL,
      runChildUpdate: true,
    });
  }

  private createPlayer(): void {
    this.player = new Player(this, this.stage.playerStart.x, this.stage.playerStart.y);
    this.player.setProjectiles(this.playerShots);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
  }

  private createSystems(): void {
    this.inputController = new InputController(this);
    this.inputController.attachTouchZones();

    this.combat = new CombatSystem(this, {
      onHit: (x, y) => this.spawnHitEffect(x, y),
      onBossDefeated: () => this.handleClear(),
      onPlayerDeath: () => this.handleGameOver(),
    });
    this.combat.registerColliders({
      player: this.player,
      enemies: this.enemies,
      playerShots: this.playerShots,
      enemyShots: this.enemyShots,
    });

    this.spawn = new SpawnSystem(this, this.enemies, this.enemyShots);
    this.spawn.loadStage(STAGE_ID);
    this.spawn.onBossTrigger(() => this.spawnBoss());
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.stage.width, STAGE.height);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setBackgroundColor('#0a0e14');
  }

  private spawnBoss(): void {
    if (this.boss) return;
    this.boss = new Boss(this, this.stage.bossSpawn.x, this.stage.bossSpawn.y);
    this.boss.setProjectiles(this.enemyShots);
    this.combat.registerBoss(this.boss);

    // ボスアリーナに閉じ込める(後退防止の壁 + カメラ範囲を固定)
    const wall = this.add.rectangle(
      this.stage.bossArenaMinX,
      STAGE.height / 2,
      8,
      STAGE.height,
      0x37f7d8,
      0.15,
    );
    this.physics.add.existing(wall, true);
    this.physics.add.collider(this.player, wall);
    this.cameras.main.setBounds(
      this.stage.bossArenaMinX,
      0,
      this.stage.width - this.stage.bossArenaMinX,
      STAGE.height,
    );

    this.registry.set(HUD.bossActive, true);
    this.registry.set(HUD.bossMaxHp, BOSS.maxHp);
  }

  private spawnHitEffect(x: number, y: number): void {
    const hit = this.add.image(x, y, TEX.hit).setDepth(20);
    this.tweens.add({
      targets: hit,
      alpha: 0,
      scale: 1.8,
      duration: 180,
      onComplete: () => hit.destroy(),
    });
  }

  private initHud(): void {
    this.registry.set(HUD.playerHp, this.player.hp);
    this.registry.set(HUD.playerMaxHp, this.player.maxHp);
    this.registry.set(HUD.chargeRatio, 0);
    this.registry.set(HUD.bossActive, false);
    this.registry.set(HUD.bossHp, 0);
    this.registry.set(HUD.bossMaxHp, BOSS.maxHp);
  }

  override update(time: number): void {
    if (this.ended) return;

    const inputState = this.inputController.update();
    this.player.applyInput(inputState, time);

    const cam = this.cameras.main;
    this.spawn.update(cam.scrollX + cam.width);
    this.spawn.updateEnemies(time, this.player.x);

    if (this.boss) {
      this.boss.update(time, this.player.x);
      this.registry.set(HUD.bossHp, this.boss.hp);
    }

    this.checkFallDeath();
    this.updateChargeHud(time, inputState.shootHeld);
    this.registry.set(HUD.playerHp, this.player.hp);
  }

  private checkFallDeath(): void {
    if (this.player.y > STAGE.deathY && !this.player.isDead()) {
      this.player.hp = 0;
      this.handleGameOver();
    }
  }

  private updateChargeHud(time: number, shootHeld: boolean): void {
    const ratio = shootHeld ? chargeRatio(this.player.chargeElapsed(time)) : 0;
    this.registry.set(HUD.chargeRatio, ratio);
  }

  private handleClear(): void {
    if (this.ended) return;
    this.ended = true;
    const clearTimeMs = this.time.now - this.startTime;
    this.inputController.destroy();
    this.scene.stop(SCENE_KEYS.ui);
    this.scene.start(SCENE_KEYS.clear, { clearTimeMs });
  }

  private handleGameOver(): void {
    if (this.ended) return;
    this.ended = true;
    this.inputController.destroy();
    this.scene.stop(SCENE_KEYS.ui);
    this.scene.start(SCENE_KEYS.gameOver);
  }

  private setupOrientationHandling(): void {
    const check = (): void => {
      // FIT モードでは scale.width/height は論理サイズ(固定)、displaySize は
      // アスペクト比維持で常に 16:9 になる。実ビューポート(端末の向き)を反映する
      // window のサイズで縦持ちを判定する。
      const portrait = window.innerHeight > window.innerWidth;
      const orientationActive = this.scene.isActive(SCENE_KEYS.orientation);
      if (portrait && !orientationActive) {
        this.scene.launch(SCENE_KEYS.orientation);
        this.scene.pause();
      } else if (!portrait && orientationActive) {
        this.scene.stop(SCENE_KEYS.orientation);
        this.scene.resume();
      }
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, check);
    check();
  }
}
