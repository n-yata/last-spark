import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { TEX } from '../config/assetKeys';
import { HUD } from '../config/registryKeys';
import { STAGE, BOSS, FLYING_BOSS, ENVOY, getStageTuning } from '../config/balance';
import { GAME_HEIGHT } from '../config/dimensions';
import { resolveControlBand } from '../config/controlBand';
import { getStageData, type StageData } from '../config/stage1';
import { STORY } from '../config/storyEvents';
import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { FlyingBoss } from '../entities/FlyingBoss';
import { WardenBoss } from '../entities/WardenBoss';
import { PurifierBoss } from '../entities/PurifierBoss';
import { CoreBoss } from '../entities/CoreBoss';
import { Projectile } from '../entities/Projectile';
import { LogTrigger } from '../entities/LogTrigger';
import { InputController } from '../systems/InputController';
import { CombatSystem } from '../systems/CombatSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { EffectsManager } from '../systems/EffectsManager';
import { transitionTo, fadeIn } from '../systems/sceneTransition';
import { resolveStoryEvent, readingDurationMs } from '../systems/storyDirector';
import { chargeRatio } from '../systems/shot';
import { shouldLandOnOneWay } from '../systems/playerMovement';
import { getSound } from '../systems/SoundManager';
import { selectExplorationBgm } from '../systems/soundSynth';
import { getStageStory } from '../config/story';
import { getCutscene } from '../config/story/cutscenes';
import { SaveManager } from '../persistence/SaveManager';
import type { StageStory, StoryEvent, TextRequest } from '../types/story';

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
  private effects!: EffectsManager;
  private boss?: Boss;
  private startTime = 0;
  private ended = false;
  /** 現在ステージの確定テキスト(未登録ステージなら undefined)。 */
  private story?: StageStory;
  private logTriggers!: Phaser.Physics.Arcade.Group;
  /** 内心トリガの一度きり発火フラグ。 */
  private firstEnemyInnerDone = false;
  private firstLogDone = false;
  /** セーブ管理(クリア記録)。再生成を避け単一インスタンスで保持する。 */
  private saveManager = new SaveManager();
  // --- ボス後・救出フロー(stage3 など postBossCutsceneKey を持つステージ) ---
  /** 収容ケージの格子(撃破後に解錠アニメで開く)。 */
  private cageBars?: Phaser.GameObjects.Graphics;
  /** ボス撃破→クリアの間の救出フェーズ中か(handleClear の二重起動防止)。 */
  private inPostBoss = false;
  /** 撃破時刻で確定したクリアタイム(救出演出後のクリア遷移へ持ち越す)。 */
  private pendingClearTimeMs = 0;

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
    this.firstEnemyInnerDone = false;
    this.firstLogDone = false;
    this.inPostBoss = false;
    this.cageBars = undefined;
    // 前ステージ/前プレイの未消化な表示要求が残っていれば破棄する。
    this.registry.set(STORY.pending, []);
    this.stage = getStageData(this.stageId);
    this.story = getStageStory(this.stageId);
    this.physics.world.setBounds(0, 0, this.stage.width, STAGE.height + 200);

    this.buildPlatforms();
    this.buildLadders();
    this.createGroups();
    this.createPlayer();
    this.createSystems();
    this.buildLogTriggers();
    this.buildCage();
    this.setupCamera();

    this.startTime = this.time.now;
    this.scene.launch(SCENE_KEYS.ui);
    this.initHud();
    this.setupOrientationHandling();
    // 探索 BGM。TERRA 同行後(Stage 3 クリア以降)は温もりのある stageWarm へ切り替える。
    getSound().playBgm(selectExplorationBgm(new SaveManager().getData().clearedStages));
    this.startIntro();
  }

  /**
   * ステージ開始の導入。introCutsceneKey を持つステージ(stage1 など)は背景画像つきの専用シーン
   * (CutsceneScene)で開始演出を再生し、送り終えてから開始テキストへ進む。持たないステージ
   * (stage2-3)は従来どおり即座に開始テキストを出す。開始テキスト+開始内心は registry に積み、
   * UIScene が drain する(起動順非依存)。
   */
  private startIntro(): void {
    const key = this.stage.introCutsceneKey;
    if (!key || !getCutscene(key)) {
      // 演出なしステージ(stage2/3/6)の入場。多重遷移ガード(transition.fading)は scene.data に
      // 保持され scene.start をまたいで残るため、ここで fadeIn を呼んで必ずリセットする。
      // これを怠ると、前ステージのクリア遷移で立ったガードが居残り、本ステージのクリア遷移が
      // 早期 return で握り潰されて「クリア後に次へ進めない」状態になる(他シーンは create で
      // fadeIn 済み。GameScene の演出ありステージは finishIntro で fadeIn する)。
      fadeIn(this);
      this.emitStageStart();
      return;
    }
    // 演出が被さる前に本編の最初の 1 フレームがチラ見えしないよう、カメラを透過にして隠す
    // (一時停止中でも確実に効くよう alpha を直接 0 にする)。本編側のフェードインは再開時
    // (finishIntro)に行う。
    this.cameras.main.setAlpha(0);
    // ゲーム/UI を止め、演出完了後に再開して開始テキストへ。
    // (救出演出と同じく、物理ステップ中の scene.pause() を避けるためタイマー経由で状態変更する)
    this.time.delayedCall(300, () => {
      this.scene.pause(SCENE_KEYS.ui);
      this.scene.launch(SCENE_KEYS.cutscene, {
        scriptKey: key,
        onComplete: () => this.finishIntro(),
      });
      this.scene.pause();
    });
  }

  /**
   * 開始演出の完了後: Game/UI を再開し、カメラを戻してフェードインで本編へ滑らかに入る。
   * 演出が開始テキストを兼ねるステージ(introCutsceneCoversStartText)は、同一文の二重表示を
   * 避けるため開始テキストを出さない。別内容の演出(stage4/5)は従来どおり開始テキストへ続ける。
   */
  private finishIntro(): void {
    this.scene.resume();
    this.scene.resume(SCENE_KEYS.ui);
    this.cameras.main.setAlpha(1);
    fadeIn(this);
    if (!this.stage.introCutsceneCoversStartText) {
      this.emitStageStart();
    }
  }

  /** 開始テキスト+開始内心を registry の表示キューへ積む(UIScene が drain)。 */
  private emitStageStart(): void {
    this.emitStory({ type: 'stageStart' });
  }

  /** ストーリーイベントを解決し、registry の表示キューへ積む(UIScene が drain)。 */
  private emitStory(event: StoryEvent): void {
    if (!this.story) return;
    this.pushStory(resolveStoryEvent(this.story, event));
  }

  /** 表示要求を registry の pending 配列へ追加する。 */
  private pushStory(requests: TextRequest[]): void {
    if (requests.length === 0) return;
    const queue = (this.registry.get(STORY.pending) as TextRequest[] | undefined) ?? [];
    this.registry.set(STORY.pending, [...queue, ...requests]);
  }

  private buildLogTriggers(): void {
    this.logTriggers = this.physics.add.group();
    for (const spec of this.stage.logTriggers ?? []) {
      const trigger = new LogTrigger(this, spec.x, spec.y, spec.slot);
      this.logTriggers.add(trigger);
      // Group.add() がボディ設定をグループ既定値(重力ON)で上書きし、玉が床を
      // すり抜けて落下するため、本来の静止設定を再適用する(Enemy と同様)。
      trigger.configureBody();
    }
    this.physics.add.overlap(this.player, this.logTriggers, (_player, obj) => {
      this.onLogOverlap(obj as LogTrigger);
    });
  }

  /**
   * ログトリガー接触: 該当ログ本文をその場で表示する。
   * 最初のログだけは RAY の内心(発見 → 本文 → 読了)を前後に添える。
   * 注記: 最初のログの「読了後」内心(firstLogRead)は story.inner に定義があるステージのみ表示される。
   */
  private onLogOverlap(trigger: LogTrigger): void {
    if (!trigger.tryConsume()) return;
    const requests: TextRequest[] = [];
    if (!this.firstLogDone && this.story) {
      this.firstLogDone = true;
      // 「誰かがいた/これを書いた」(発見) → ログ本文 → 「読んだ後」の内心、の順。
      requests.push(...resolveStoryEvent(this.story, { type: 'inner', sceneKey: 'firstLogFound' }));
      requests.push(...resolveStoryEvent(this.story, { type: 'logFound', slot: trigger.slot }));
      requests.push(...resolveStoryEvent(this.story, { type: 'inner', sceneKey: 'firstLogRead' }));
    } else if (this.story) {
      requests.push(...resolveStoryEvent(this.story, { type: 'logFound', slot: trigger.slot }));
    }
    this.pushStory(requests);
  }

  /** 収容ケージ(stage3 など)の見た目を作る。撃破後に解錠アニメを再生する。 */
  private buildCage(): void {
    const cage = this.stage.cage;
    if (!cage) return;
    // 閉じた状態の縦格子を描く(撃破後 unlockCage で開く)。
    this.cageBars = this.add.graphics().setDepth(6);
    this.drawCageBars(cage.x, cage.y);
  }

  /** ケージの縦格子を描画する(cageBars へ)。 */
  private drawCageBars(cx: number, cy: number): void {
    const g = this.cageBars;
    if (!g) return;
    g.clear();
    const halfW = 48;
    const top = cy - 75;
    const bottom = cy + 75;
    g.lineStyle(5, 0x8a93a3, 0.9);
    g.strokeRect(cx - halfW, top, halfW * 2, bottom - top); // 枠
    for (let x = cx - halfW + 14; x < cx + halfW; x += 14) {
      g.lineBetween(x, top, x, bottom); // 縦格子
    }
  }

  /** ボス撃破でケージを解錠する(格子をフェードアウト)。 */
  private unlockCage(): void {
    getSound().playSe('uiTap');
    if (this.cageBars) {
      this.tweens.add({
        targets: this.cageBars,
        alpha: 0,
        duration: 600,
        onComplete: () => this.cageBars?.destroy(),
      });
    }
  }

  /** ボス撃破後・救出フェーズへ入る。ボスを片付けてケージを解錠し、救出演出を即起動する。 */
  private enterRescuePhase(dyingBoss: Boss): void {
    dyingBoss.destroy();
    this.registry.set(HUD.bossActive, false);
    this.unlockCage();
    this.startRescueCutscene();
  }

  /** 救出演出シーンを 1 度だけ起動する。完了で救出クリアへ。 */
  private startRescueCutscene(): void {
    const scriptKey = this.stage.postBossCutsceneKey;
    if (!scriptKey) {
      this.finalizeRescueClear();
      return;
    }
    this.player.setVelocityX(0);
    // ケージ解錠アニメ(600ms)を見せてから演出へ。タイマー経由で次フレーム以降に
    // シーン状態を変更し、物理ステップ中の scene.pause() によるフリーズを避ける。
    this.time.delayedCall(700, () => {
      this.scene.pause(SCENE_KEYS.ui);
      this.scene.launch(SCENE_KEYS.cutscene, {
        scriptKey,
        onComplete: () => this.finalizeRescueClear(),
      });
      this.scene.pause();
    });
  }

  /** 救出演出後のクリア処理。一時停止を解いてクリアシーンへ遷移する。 */
  private finalizeRescueClear(): void {
    this.scene.resume(); // 演出のため pause していた自身を戻す(直後に遷移する)
    this.ended = true;
    this.inputController.destroy();
    this.scene.stop(SCENE_KEYS.ui);
    transitionTo(this, SCENE_KEYS.clear, {
      clearTimeMs: this.pendingClearTimeMs,
      stageId: this.stageId,
      nextStageId: this.stage.nextStageId,
    });
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

    this.effects = new EffectsManager(this);
    this.combat = new CombatSystem(this, {
      onHit: (x, y, target) => {
        this.spawnHitEffect(x, y);
        getSound().playSe(target === 'boss' ? 'bossHit' : 'enemyHit');
      },
      onEnemyDefeated: (enemy) => {
        this.effects.explodeSmall(enemy.x, enemy.y);
        getSound().playSe('enemyDefeated');
        if (!this.firstEnemyInnerDone) {
          this.firstEnemyInnerDone = true;
          this.emitStory({ type: 'inner', sceneKey: 'firstEnemyDefeated' });
        }
      },
      onPlayerDamaged: () => {
        this.effects.playerDamaged();
        getSound().playSe('playerDamaged');
      },
      onBossDefeated: (boss) => this.handleClear(boss),
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
    this.spawn.onBossTrigger(() => {
      // ボスを出現させ、(stage3 のみ)ケージの人影を見た内心 → ECLIPSE の語りかけ、の順に重ねる。
      // terraFound 内心はその本文を持つステージ(stage3)でのみ表示され、他ステージでは空になる。
      this.spawnBoss();
      this.emitStory({ type: 'inner', sceneKey: 'terraFound' });
      this.emitStory({ type: 'bossIntro' });
      // ECLIPSE の語りかけを聞いた直後の内心(stage4 の「ECLIPSEは……正しいのか」など)。
      // 該当キーを持たないステージでは空になり何も表示されない。
      this.emitStory({ type: 'inner', sceneKey: 'eclipseReaction' });
    });
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.stage.width, STAGE.height);
    cam.startFollow(this.player, true, 0.12, 0.12);
    // 環境ストーリーテリングの簡易表現として、ステージ指定の背景色があればそれを使う(stage4=汚染の淀み)。
    cam.setBackgroundColor(this.stage.backgroundColor ?? '#0a0e14');
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

    // ステージ系統に応じてボスを出し分ける。飛行型・コア型は重力なしで空中に滞空するため
    // 地面コライダーを付けない(接地型・warden は地面に乗りジャンプ着地する)。
    const airborne = this.stage.bossKind === 'flying' || this.stage.bossKind === 'core';
    if (this.stage.bossKind === 'flying') {
      // 飛行型。stage5 の使者(envoy)は高速型 ENVOY、それ以外(stage2)は既定 FLYING_BOSS。
      const flyingConfig = this.stage.bossVariant === 'envoy' ? ENVOY : FLYING_BOSS;
      this.boss = new FlyingBoss(this, this.stage.bossSpawn.x, this.stage.bossSpawn.y, flyingConfig);
    } else if (this.stage.bossKind === 'core') {
      // stage6: ECLIPSE本体(巨大コア・浮遊)。配下召喚のため敵グループ等のコンテキストを注入する。
      const core = new CoreBoss(this, this.stage.bossSpawn.x, this.stage.bossSpawn.y);
      core.setSummonContext({
        enemies: this.enemies,
        enemyShots: this.enemyShots,
        tuning: getStageTuning(this.stageId),
      });
      this.boss = core;
    } else if (this.stage.bossKind === 'warden') {
      // stage3: 収容番人(重装ミサイル型)。接地型なので地面コライダーを付ける。
      this.boss = new WardenBoss(this, this.stage.bossSpawn.x, this.stage.bossSpawn.y);
    } else if (this.stage.bossVariant === 'purifier') {
      // stage4: 環境管理機(浄化型・扇状の範囲攻撃)。接地型なので地面コライダーを付ける。
      this.boss = new PurifierBoss(this, this.stage.bossSpawn.x, this.stage.bossSpawn.y);
    } else {
      this.boss = new Boss(this, this.stage.bossSpawn.x, this.stage.bossSpawn.y, {
        config: this.stage.bossConfig,
        rigFamily: this.stage.bossRig,
      });
    }
    this.boss.setProjectiles(this.enemyShots);
    this.boss.setArenaBounds(arenaLeft, arenaRight);
    if (!airborne) {
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
    // 仮想ボタンの押下フィードバック用に押下状態を HUD へ共有する
    this.registry.set(HUD.shootHeld, inputState.shootHeld);
    this.registry.set(HUD.jumpHeld, inputState.jumpHeld);

    const cam = this.cameras.main;
    // カメラ右端はワールド座標。ズーム適用時 cam.width(ビューポートpx)と実可視幅は
    // 異なるため、displayWidth(=width/zoom)で算出する。これを誤ると画面アスペクト比に
    // よってボストリガー地点に届かず「ボスが出ない」不具合になる。
    const cameraRightX = cam.scrollX + cam.displayWidth;
    // カメラ右端に加えプレイヤー X も渡す。狭い/特定アスペクトの端末でカメラ右端が
    // bossTriggerX に届かずボスが出ない事象を防ぐ(SpawnSystem 側でプレイヤー到達フォールバック)。
    this.spawn.update(cameraRightX, this.player.x);
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

  private handleClear(boss: Boss): void {
    if (this.ended || this.inPostBoss) return;
    // クリアタイムは撃破の瞬間で確定する(撃破演出/救出演出の時間を含めない)。
    const clearTimeMs = this.time.now - this.startTime;
    this.player.setVelocityX(0);
    getSound().stopBgm(); // ボス BGM を止めてから撃破音を鳴らす(GameOver と対称)
    getSound().playSe('bossDefeated');
    this.registry.set(HUD.bossHp, 0);

    // ボス後演出を持つステージ(stage3 など): 即クリアせず、救出フェーズへ。
    // 撃破演出後にケージを解錠し、自由移動でボス後ログを任意接触→ケージ接触で演出→クリア。
    if (this.stage.postBossCutsceneKey && this.stage.cage) {
      this.inPostBoss = true;
      this.pendingClearTimeMs = clearTimeMs;
      // 死亡ボスを update ループから切り離し(参照を断ち)、演出後に破棄する。
      this.boss = undefined;
      this.effects.bossDeathSequence(boss.x, boss.y, () => this.enterRescuePhase(boss));
      return;
    }

    // 従来(stage1-2)/演出キーなし(stage4): 撃破演出後にクリアへ。
    // ended 後は applyInput が呼ばれず最後の速度で滑走し続けるため、撃破の瞬間に静止させる。
    this.ended = true;
    this.effects.bossDeathSequence(boss.x, boss.y, () => this.finishStageClear(clearTimeMs));
  }

  /**
   * ボス撃破後のクリア確定。撃破直後の内心(inner.bossDefeated)を持つステージ(stage4 など)は、
   * それを見せてから遷移する。持たないステージは即座に遷移する。
   */
  private finishStageClear(clearTimeMs: number): void {
    const endingKey = this.stage.endingCutsceneKey;
    const go = (): void => {
      // 最終ステージ(endingCutsceneKey あり): ClearScene を経ずエンディング演出へ。
      if (endingKey) {
        this.startEnding(endingKey, clearTimeMs);
        return;
      }
      this.inputController.destroy();
      this.scene.stop(SCENE_KEYS.ui);
      // 次ステージがあれば中継して継続、なければ最終クリアとしてタイトルへ。
      transitionTo(this, SCENE_KEYS.clear, {
        clearTimeMs,
        stageId: this.stageId,
        nextStageId: this.stage.nextStageId,
      });
    };

    const reflection = this.story
      ? resolveStoryEvent(this.story, { type: 'inner', sceneKey: 'bossDefeated' })
      : [];
    if (reflection.length === 0) {
      go();
      return;
    }
    // 内心を表示してから、読み切れる時間だけ待って遷移する(UIScene は遷移時に停止する)。
    this.pushStory(reflection);
    const holdMs = readingDurationMs(reflection[0].text) + 400;
    this.time.delayedCall(holdMs, go);
  }

  /**
   * 最終ステージ(stage6)のエンディング演出を起動する。CutsceneScene で結末スクリプトを
   * 再生し(エンディング BGM へ切替)、完了後に全クリアを保存してタイトルへ帰還する。
   * 物理ステップ中の scene.pause() を避けるため、タイマー経由で状態を変更する(救出演出と同方式)。
   */
  private startEnding(scriptKey: string, clearTimeMs: number): void {
    this.inputController.destroy();
    this.time.delayedCall(300, () => {
      this.scene.pause(SCENE_KEYS.ui);
      this.scene.launch(SCENE_KEYS.cutscene, {
        scriptKey,
        bgm: 'ending',
        onComplete: () => this.finalizeEnding(clearTimeMs),
      });
      this.scene.pause();
    });
  }

  /** エンディング演出の完了後: 全クリアを保存し、タイトルへ帰還する。 */
  private finalizeEnding(clearTimeMs: number): void {
    this.scene.resume(); // 演出のため pause していた自身を戻す(直後に遷移する)
    this.scene.stop(SCENE_KEYS.ui);
    this.saveManager.markStageCleared(this.stageId, clearTimeMs);
    transitionTo(this, SCENE_KEYS.title);
  }

  private handleGameOver(): void {
    if (this.ended) return;
    this.ended = true;
    this.inputController.destroy();
    this.scene.stop(SCENE_KEYS.ui);
    transitionTo(this, SCENE_KEYS.gameOver);
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
    // シーン再利用(リトライ/周回)でリスナーが蓄積しないよう、終了時に必ず外す。
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, check);
    });
    check();
  }
}
