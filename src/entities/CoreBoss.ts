import Phaser from 'phaser';
import {
  ECLIPSE_CORE,
  ECLIPSE_SUMMON_MINION_PLAYER_DAMAGE_MULTIPLIER,
  ECLIPSE_SUMMON_MINION_TUNING,
  STAGE,
  ENEMY,
  type CoreBossConfig,
} from '../config/balance';
import { pickNextCoreBossAction, bossActionDuration } from '../systems/bossAi';
import { computeSummonXs } from '../systems/coreSummon';
import type { EnemyPattern } from '../types/enemy';
import type { ShieldHitKind } from '../systems/combatRules';
import { Boss, DEFAULT_ACTION_DURATION_MS } from './Boss';
import { Enemy } from './Enemy';

// stage6 専用・ECLIPSE本体(ラスボス)。Boss を継承し、被ダメ/けぞり/フェーズ/撃破を再利用しつつ、
// (1)人型でない巨大コアの専用ビジュアル、(2)固有アクション summon(配下 Enemy の動的召喚)を足す。
// 浮遊して静止し(重力なし・移動なし)、phase1 は配下召喚で支援型、phase2 は shoot 主軸の直接攻撃型
// に切り替わる(2フェーズ)。ただし phase2 でも summon を継続し、HP が減っても雑魚召喚は止まらない
// (重み付けは CORE_WEIGHTS が担う)。配下は既存 Enemy/敵グループを流用する。

/** 配下召喚に必要な外部参照。GameScene が spawnBoss 時に注入する。 */
export interface SummonContext {
  enemies: Phaser.Physics.Arcade.Group;
  enemyShots: Phaser.Physics.Arcade.Group;
}

export class CoreBoss extends Boss {
  /** CoreBossConfig として参照するための型付きエイリアス。 */
  private readonly core: CoreBossConfig;
  /** 配下召喚の外部参照(未注入なら召喚しない=安全側)。 */
  private summonCtx?: SummonContext;
  /** 非人型コアの専用ビジュアル(本体ポリゴン + 発光する眼)。基底の人型リグは隠す。 */
  private readonly coreVisual: Phaser.GameObjects.Container;
  private readonly coreEye: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, { config: ECLIPSE_CORE, rigFamily: 'boss', gravity: false });
    this.core = ECLIPSE_CORE;
    // 基底が生成する人型リグは使わない(コアは非人型)。専用ビジュアルへ差し替える。
    this.rig.setVisible(false);
    this.coreEye = this.buildEye();
    this.coreVisual = this.buildCoreVisual(this.coreEye);
    this.coreVisual.setPosition(x, y);
  }

  /** 中央の発光する眼。phase1=シアン、phase2=赤に切り替えて攻撃様式の変化を示す。 */
  private buildEye(): Phaser.GameObjects.Arc {
    return this.scene.add.circle(0, 0, this.core.width * 0.16, 0x37f7d8).setDepth(10);
  }

  /** 巨大コアの本体(八角形の暗い装甲 + 発光リング)を組み立て、眼を中央に重ねる。 */
  private buildCoreVisual(eye: Phaser.GameObjects.Arc): Phaser.GameObjects.Container {
    const w = this.core.width;
    const h = this.core.height;
    const body = this.scene.add.graphics();
    // 八角形の装甲(暗い金属)。
    const rx = w / 2;
    const ry = h / 2;
    const k = 0.42; // 角の面取り比率
    const pts: Array<[number, number]> = [
      [-rx * k, -ry],
      [rx * k, -ry],
      [rx, -ry * k],
      [rx, ry * k],
      [rx * k, ry],
      [-rx * k, ry],
      [-rx, ry * k],
      [-rx, -ry * k],
    ];
    body.fillStyle(0x10151d, 1);
    body.lineStyle(3, 0x2b3b4a, 1);
    body.beginPath();
    body.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i += 1) body.lineTo(pts[i][0], pts[i][1]);
    body.closePath();
    body.fillPath();
    body.strokePath();
    // 眼を囲む発光リング(塗りなし=ストロークのみ)。
    const ring = this.scene.add.circle(0, 0, w * 0.24, 0x000000, 0).setStrokeStyle(3, 0x37f7d8, 0.7);
    const container = this.scene.add.container(0, 0, [body, ring, eye]).setDepth(9);
    // 眼の脈動(常時)。太陽を遮る「闇の核」の不穏さを出す。
    this.scene.tweens.add({
      targets: eye,
      scale: 0.7,
      alpha: 0.6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    return container;
  }

  /** 配下召喚の外部参照を注入する。未注入なら summon は no-op(安全側)。 */
  setSummonContext(ctx: SummonContext): void {
    this.summonCtx = ctx;
  }

  protected override beginNextAction(now: number, playerX: number): void {
    const next = pickNextCoreBossAction(this.phase, this.lastAction);
    this.lastAction = next;
    this.currentAction = next;

    const baseDuration = bossActionDuration(
      this.cfg.actionDurationMs,
      next,
      DEFAULT_ACTION_DURATION_MS,
    );
    const factor = this.phase === 'phase2' ? this.cfg.phase2SpeedFactor : 1;
    this.actionEndsAt = now + baseDuration * factor;

    // コアは shoot(基底のボレー)と固有の summon を使う。idle/stagger は停止(基底 executeAction)。
    if (next === 'shoot') {
      this.fireVolley(playerX);
    } else if (next === 'summon') {
      this.summonMinions(playerX);
    }
  }

  /**
   * 配下 Enemy を動的に召喚する。場の配下が上限(summonMaxActive)未満のときだけ生成し、
   * 画面が配下で溢れるのを防ぐ。生成位置は computeSummonXs が決め、プレイヤー(RAY)中心から
   * summonSafeRadius 以内には湧かせない(召喚と同時に重なって発生する避けられない接触ダメージを防ぐ)。
   * 既存の Enemy 生成手順(setProjectiles → group.add → configureBody)を踏襲する。
   */
  private summonMinions(playerX: number): void {
    const ctx = this.summonCtx;
    if (!ctx) return;
    const activeMinions = ctx.enemies.countActive(true);
    if (activeMinions >= this.core.summonMaxActive) return;

    const spawnable = this.core.summonMaxActive - activeMinions;
    const count = Math.min(this.core.summonCount, spawnable);
    // プレイヤーへ重ならない配置 X を先にまとめて計算する(安全距離の担保は純粋関数側で行う)。
    const xs = computeSummonXs(
      playerX,
      count,
      this.arenaMinX,
      this.arenaMaxX,
      this.core.summonSafeRadius,
      this.core.summonSpacing,
    );
    for (let i = 0; i < count; i += 1) {
      // walker と turret を交互に。walker は接近、turret は射撃で挟む。
      const pattern: EnemyPattern = i % 2 === 0 ? 'walker' : 'turret';
      const conf = pattern === 'turret' ? ENEMY.turret : ENEMY.walker;
      const x = xs[i];
      const y = STAGE.groundY - conf.height / 2;
      const minion = new Enemy(this.scene, x, y, pattern, ECLIPSE_SUMMON_MINION_TUNING, {
        playerDamageMultiplierOverride: ECLIPSE_SUMMON_MINION_PLAYER_DAMAGE_MULTIPLIER,
      });
      minion.setProjectiles(ctx.enemyShots);
      ctx.enemies.add(minion);
      // Group.add() がグループ既定値でボディを上書きするため、追加後に再適用して接地を保証する。
      minion.configureBody();
    }
    // 召喚の溜め演出として眼を一瞬強発光させる。
    this.scene.tweens.add({ targets: this.coreEye, alpha: 1, duration: 120, yoyo: true });
  }

  /**
   * コアは静止・浮遊するため、基底の人型リグ同期は使わず専用ビジュアルだけ更新する。
   * フェーズで眼の色を変え(phase1=シアン/phase2=赤)、stagger 中は本体を被弾色に振る。
   */
  protected override updateRig(_time: number, _playerX: number): void {
    this.coreVisual.setPosition(this.x, this.y);
    const staggering = this.currentAction === 'stagger';
    const eyeColor = staggering ? 0xff6b6b : this.phase === 'phase2' ? 0xff5a5a : 0x37f7d8;
    this.coreEye.setFillStyle(eyeColor);
  }

  override takeDamage(amount: number, hitKind?: ShieldHitKind): void {
    super.takeDamage(amount, hitKind);
    // 撃破で専用ビジュアルも消す(基底はリグを隠すが、コアは独自ビジュアルのため別途消す)。
    if (this.isDead()) {
      this.coreVisual.setVisible(false);
    }
  }

  override destroy(fromScene?: boolean): void {
    this.coreVisual.destroy();
    super.destroy(fromScene);
  }
}
