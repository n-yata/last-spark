import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { TEX } from '../config/assetKeys';
import { HUD } from '../config/registryKeys';
import { STAGE, BOSS } from '../config/balance';
import { GAME_HEIGHT } from '../config/dimensions';
import { resolveControlBand } from '../config/controlBand';
import { getStageData, type StageData } from '../config/stage1';
import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { FlyingBoss } from '../entities/FlyingBoss';
import { Projectile } from '../entities/Projectile';
import { InputController } from '../systems/InputController';
import { CombatSystem } from '../systems/CombatSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { chargeRatio } from '../systems/shot';
import { shouldLandOnOneWay } from '../systems/playerMovement';
import { getSound } from '../systems/SoundManager';

// ステージ本体。プレイヤー/敵/ボス/弾/カメラ/物理を統括する。

const DEFAULT_STAGE_ID = 'stage1';
const PROJECTILE_POOL = 32;

/** GameScene 起動データ。stageId 未指定なら stage1 から開始する。 */
export interface GameSceneData {
  stageId?: string;
}

/** collider の processCallback が受け取りうるオブジェクト型(Phaser の ArcadePhysicsCallback 準拠)。 */
type ArcadeColliderObject =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

export class GameScene extends Phaser.Scene {
  private stage!: StageData;
  private stageId = DEFAULT_STAGE_ID;
  private player!: Player;
  /** 地面(全面衝突=壁/床)。 */
  private groundGroup!: Phaser.Physics.Arcade.StaticGroup;
  /** 浮遊足場(ワンウェイ=上からのみ着地、下から通過)。 */
  private platformGroup!: Phaser.Physics.Arcade.StaticGroup;
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

  /** 起動データから開始ステージを決める(stage1→stage2 の遷移で stageId を渡す)。 */
  init(data: GameSceneData): void {
    this.stageId = data?.stageId ?? DEFAULT_STAGE_ID;
  }

  create(): void {
    this.ended = false;
    // シーンはステージ継続(stage1→stage2)で再利用される。前ステージのボス参照が残ると
    // spawnBoss の早期 return で次ステージのボスが出ないため、必ずクリアする。
    this.boss = undefined;
    this.stage = getStageData(this.stageId);
    this.physics.world.setBounds(0, 0, this.stage.width, STAGE.height + 200);

    this.buildPlatforms();
    this.buildLadders();
    this.createGroups();
    this.createPlayer();
    this.createSystems();
    this.setupCamera();

    this.startTime = this.time.now;
    this.scene.launch(SCENE_KEYS.ui);
    this.initHud();
    this.setupOrientationHandling();
    getSound().playBgm('stage');
  }

  private buildPlatforms(): void {
    // 地面(全面衝突)と浮遊足場(ワンウェイ)を別グループに分ける。
    // 判定は従来どおり高さ: height>40 を地面、それ以下を足場とみなす。
    this.groundGroup = this.physics.add.staticGroup();
    this.platformGroup = this.physics.add.staticGroup();
    for (const rect of this.stage.platforms) {
      const isGround = rect.height > 40;
      const group = isGround ? this.groundGroup : this.platformGroup;
      const tex = isGround ? TEX.ground : TEX.platform;
      const img = group
        .create(rect.x + rect.width / 2, rect.y + rect.height / 2, tex) as Phaser.Physics.Arcade.Sprite;
      img.setDisplaySize(rect.width, rect.height);
      img.refreshBody();
    }
  }

  /** 梯子の見た目を敷き、矩形領域を Player の重なり判定へ渡す(物理衝突はさせない)。 */
  private buildLadders(): void {
    const ladders = this.stage.ladders ?? [];
    for (const l of ladders) {
      // テクスチャ(32x32)をタイル状に縦へ繰り返して梯子の見た目にする。
      const img = this.add.tileSprite(
        l.x + l.width / 2,
        l.y + l.height / 2,
        l.width,
        l.height,
        TEX.ladder,
      );
      img.setDepth(5); // プレイヤー(10)より背面、地形と同程度
    }
  }

  /**
   * ワンウェイ床のコライダ判定。対象(プレイヤー/敵)が下降中かつ足元が床上端付近の時だけ
   * 衝突を有効化する。プレイヤーが梯子につかまっている間は衝突させない(梯子で貫通)。
   */
  private oneWayProcess = (
    obj: ArcadeColliderObject,
    platform: ArcadeColliderObject,
  ): boolean => {
    const objGo = obj as Phaser.Types.Physics.Arcade.GameObjectWithBody;
    const platGo = platform as Phaser.Types.Physics.Arcade.GameObjectWithBody;
    const objBody = objGo.body as Phaser.Physics.Arcade.Body;
    const platBody = platGo.body as Phaser.Physics.Arcade.Body;
    if (objGo === this.player && this.player.isOnLadder) return false;
    return shouldLandOnOneWay(objBody.bottom, objBody.velocity.y, platBody.top);
  };

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
    this.player.setLadders(this.stage.ladders ?? []);
    // 地面は全面衝突、足場はワンウェイ(上から着地・下から通過、梯子中は貫通)。
    this.physics.add.collider(this.player, this.groundGroup);
    this.physics.add.collider(this.player, this.platformGroup, undefined, this.oneWayProcess);
    // 敵も地面+足場に乗る(足場は上からのみ。stage1 の足場上の配置を維持)。
    this.physics.add.collider(this.enemies, this.groundGroup);
    this.physics.add.collider(this.enemies, this.platformGroup, undefined, this.oneWayProcess);
  }

  private createSystems(): void {
    this.inputController = new InputController(this);
    this.inputController.attachTouchZones();

    this.combat = new CombatSystem(this, {
      onHit: (x, y, target) => {
        this.spawnHitEffect(x, y);
        getSound().playSe(target === 'boss' ? 'bossHit' : 'enemyHit');
      },
      onEnemyDefeated: () => getSound().playSe('enemyDefeated'),
      onPlayerDamaged: () => getSound().playSe('playerDamaged'),
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
    this.spawn.loadStage(this.stageId);
    this.spawn.onBossTrigger(() => this.spawnBoss());
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.stage.width, STAGE.height);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setBackgroundColor('#0a0e14');
    this.applyCameraLayout();
    // RESIZE でキャンバスが伸縮しても、ワールドの縦の見え方(高さ540相当)を一定に保つ
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyCameraLayout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyCameraLayout, this);
    });
  }

  private applyCameraLayout(): void {
    // タッチ時は下部コントロール帯ぶん viewport を下側から削り、ゲーム描画を帯の上へ収める。
    // 非タッチ(band=0)では viewport=フル画面となる。
    const band = resolveControlBand(this);
    const viewH = Math.max(1, this.scale.height - band);
    const cam = this.cameras.main;
    cam.setViewport(0, 0, this.scale.width, viewH);
    // ズーム倍率は常に「画面全体の高さ」基準を維持する。帯の有無で世界の見かけの大きさを
    // 変えないことで、(1)帯ぶん世界が縮小して見える問題、(2)displayWidth 変化でボストリガーが
    // ズレる問題を同時に防ぐ。帯はあくまで viewport を下から削るだけ(縦の可視範囲が帯ぶん減る)。
    const zoom = this.scale.height / GAME_HEIGHT;
    cam.setZoom(zoom > 0 ? zoom : 1);
  }

  private spawnBoss(): void {
    if (this.boss) return;

    // アリーナ左端は「現在のカメラ左端」にする。これによりカメラ範囲を固定しても
    // 画面がジャンプせず(プレイヤーが画面外に消えない)、かつ後退も防げる。
    const cam = this.cameras.main;
    const arenaLeft = Math.floor(cam.scrollX);
    const arenaRight = this.stage.width;

    // ステージ系統に応じてボスを出し分ける。飛行型は重力なしで空中に滞空するため
    // 地面コライダーを付けない(接地型のみ地面に乗りジャンプ着地する)。
    const flying = this.stage.bossKind === 'flying';
    this.boss = flying
      ? new FlyingBoss(this, this.stage.bossSpawn.x, this.stage.bossSpawn.y)
      : new Boss(this, this.stage.bossSpawn.x, this.stage.bossSpawn.y);
    this.boss.setProjectiles(this.enemyShots);
    this.boss.setArenaBounds(arenaLeft, arenaRight);
    if (!flying) {
      this.physics.add.collider(this.boss, this.groundGroup); // 重力で接地・ジャンプ着地(地面のみ)
    }
    this.combat.registerBoss(this.boss);

    // アリーナ両端の壁(プレイヤーの後退・行き過ぎを防ぐ)
    this.addArenaWall(arenaLeft);
    this.addArenaWall(arenaRight);

    // カメラはプレイヤー追従を維持しつつ、左へはこれ以上戻らないよう範囲を固定する
    cam.setBounds(arenaLeft, 0, arenaRight - arenaLeft, STAGE.height);

    this.registry.set(HUD.bossActive, true);
    // 設定値ではなく実際のボスの maxHp を使う(系統で硬さが異なっても HUD が一致する)。
    this.registry.set(HUD.bossMaxHp, this.boss.maxHp);
    getSound().playBgm('boss');
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
    // カメラ右端はワールド座標。ズーム適用時 cam.width(ビューポートpx)と実可視幅は
    // 異なるため、displayWidth(=width/zoom)で算出する。これを誤ると画面アスペクト比に
    // よってボストリガー地点に届かず「ボスが出ない」不具合になる。
    const cameraRightX = cam.scrollX + cam.displayWidth;
    this.spawn.update(cameraRightX);
    this.spawn.updateEnemies(time, this.player.x);

    if (this.boss) {
      this.boss.update(time, this.player.x, this.player.y);
      this.registry.set(HUD.bossHp, this.boss.hp);
    }

    this.checkFallDeath();
    this.updateChargeHud(time);
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

  private updateChargeHud(time: number): void {
    // chargeElapsed はチャージ中のみ正、それ以外は 0 を返す(状態機械で管理)。
    const ratio = chargeRatio(this.player.chargeElapsed(time));
    this.registry.set(HUD.chargeRatio, ratio);
  }

  private handleClear(): void {
    if (this.ended) return;
    this.ended = true;
    getSound().stopBgm(); // ボス BGM を止めてから撃破音を鳴らす(GameOver と対称)
    getSound().playSe('bossDefeated');
    const clearTimeMs = this.time.now - this.startTime;
    this.inputController.destroy();
    this.scene.stop(SCENE_KEYS.ui);
    // 次ステージがあれば中継して継続、なければ最終クリアとしてタイトルへ。
    this.scene.start(SCENE_KEYS.clear, {
      clearTimeMs,
      nextStageId: this.stage.nextStageId,
    });
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
