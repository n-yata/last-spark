import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { TEX } from '../config/assetKeys';
import { HUD } from '../config/registryKeys';
import { STAGE, BOSS } from '../config/balance';
import { GAME_HEIGHT } from '../config/dimensions';
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
    this.applyCameraZoom();
    // RESIZE でキャンバスが伸縮しても、ワールドの縦の見え方(高さ540相当)を一定に保つ
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyCameraZoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyCameraZoom, this);
    });
  }

  private applyCameraZoom(): void {
    // 高さ基準のズーム。画面高さ = ワールド高さ(GAME_HEIGHT)になるよう拡大率を合わせる。
    const zoom = this.scale.height / GAME_HEIGHT;
    this.cameras.main.setZoom(zoom > 0 ? zoom : 1);
  }

  private spawnBoss(): void {
    if (this.boss) return;

    // アリーナ左端は「現在のカメラ左端」にする。これによりカメラ範囲を固定しても
    // 画面がジャンプせず(プレイヤーが画面外に消えない)、かつ後退も防げる。
    const cam = this.cameras.main;
    const arenaLeft = Math.floor(cam.scrollX);
    const arenaRight = this.stage.width;

    this.boss = new Boss(this, this.stage.bossSpawn.x, this.stage.bossSpawn.y);
    this.boss.setProjectiles(this.enemyShots);
    this.boss.setArenaBounds(arenaLeft, arenaRight);
    this.combat.registerBoss(this.boss);

    // アリーナ両端の壁(プレイヤーの後退・行き過ぎを防ぐ)
    this.addArenaWall(arenaLeft);
    this.addArenaWall(arenaRight);

    // カメラはプレイヤー追従を維持しつつ、左へはこれ以上戻らないよう範囲を固定する
    cam.setBounds(arenaLeft, 0, arenaRight - arenaLeft, STAGE.height);

    this.registry.set(HUD.bossActive, true);
    this.registry.set(HUD.bossMaxHp, BOSS.maxHp);
  }

  private addArenaWall(x: number): void {
    const wall = this.add.rectangle(x, STAGE.height / 2, 10, STAGE.height, 0x37f7d8, 0.12);
    this.physics.add.existing(wall, true);
    this.physics.add.collider(this.player, wall);
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
    this.publishMovePad();
    this.registry.set(HUD.playerHp, this.player.hp);
  }

  private publishMovePad(): void {
    const pad = this.inputController.getMovePad();
    this.registry.set(HUD.movePadActive, pad.active);
    if (pad.active) {
      this.registry.set(HUD.movePadBaseX, pad.baseX);
      this.registry.set(HUD.movePadBaseY, pad.baseY);
      this.registry.set(HUD.movePadCurX, pad.curX);
      this.registry.set(HUD.movePadCurY, pad.curY);
    }
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
