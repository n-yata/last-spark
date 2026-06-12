import Phaser from 'phaser';
import { TEX } from '../config/assetKeys';
import { EFFECTS } from '../config/effects';

// 戦闘演出(パーティクル爆発・カメラシェイク・ヒットストップ・被ダメ赤フラッシュ・
// ボス撃破シーケンス)を統括する System。GameScene が所有し、CombatSystem の
// コールバックから呼ばれる。チューニング値は config/effects.ts に集約する。

/** explosion 設定 1 件分(small/boss)の型。 */
interface ExplosionConfig {
  count: number;
  speedMin: number;
  speedMax: number;
  lifespanMs: number;
  scaleStart: number;
}

export class EffectsManager {
  private readonly scene: Phaser.Scene;
  /** ヒットストップの復帰予定時刻。多重発火時は後ろへ伸ばす。 */
  private resumeAt = 0;
  private bossDeathTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // シーン終了時にタイマーを破棄し、物理が止まったまま遷移するのを防ぐ。
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bossDeathTimer?.remove();
      // SHUTDOWN 時点では物理プラグインが先に破棄され world が null の場合がある。
      // ガードなしで触れると throw し、scene.start の遷移処理ごと壊れる。
      const world = scene.physics.world as Phaser.Physics.Arcade.World | undefined;
      if (world && world.isPaused) world.resume();
    });
  }

  /** 雑魚撃破の小爆発。 */
  explodeSmall(x: number, y: number): void {
    this.explode(x, y, EFFECTS.explosion.small);
  }

  /** ボス撃破シーケンス中の 1 バースト分の大爆発。 */
  explodeBoss(x: number, y: number): void {
    this.explode(x, y, EFFECTS.explosion.boss);
  }

  /**
   * プレイヤー被弾の手応え(カメラシェイク)。
   * 画面全体の赤フラッシュは酔いを誘発するため使わない(被弾の視覚情報は
   * リグの白フラッシュ+LifeBar の点滅で伝える)。
   */
  playerDamaged(): void {
    const { durationMs, intensity } = EFFECTS.shake.playerDamage;
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  /**
   * ボス撃破シーケンス: ヒットストップ → 多段爆発+大シェイク → 余韻 → onComplete。
   * onComplete でシーン遷移(クリア)へ進む想定。
   */
  bossDeathSequence(x: number, y: number, onComplete: () => void): void {
    this.hitStop(EFFECTS.hitStop.bossDefeatMs);
    const shake = EFFECTS.shake.bossDefeat;
    this.scene.cameras.main.shake(shake.durationMs, shake.intensity);

    const { burstCount, burstIntervalMs, spreadPx, endDelayMs } = EFFECTS.bossDeath;
    let fired = 0;
    this.bossDeathTimer = this.scene.time.addEvent({
      delay: burstIntervalMs,
      repeat: burstCount - 1,
      startAt: burstIntervalMs, // 1 発目を即時に出す(撃破の瞬間と爆発を一致させる)
      callback: () => {
        const ox = Phaser.Math.Between(-spreadPx, spreadPx);
        const oy = Phaser.Math.Between(-spreadPx, spreadPx);
        this.explodeBoss(x + ox, y + oy);
        fired += 1;
        if (fired >= burstCount) {
          this.scene.time.delayedCall(endDelayMs, onComplete);
        }
      },
    });
  }

  /**
   * 物理を一時停止して手応えを作る。復帰は delayedCall 一本化し、
   * 多重発火時は復帰予定を後ろへ伸ばすだけにして二重 resume を防ぐ。
   */
  private hitStop(durationMs: number): void {
    const now = this.scene.time.now;
    const until = now + durationMs;
    if (until <= this.resumeAt) return; // 既により長い停止が予約済み
    this.resumeAt = until;
    this.scene.physics.world.pause();
    this.scene.time.delayedCall(durationMs, () => {
      // 自分より後に予約された停止があるなら、そちらの復帰に任せる。
      if (this.scene.time.now >= this.resumeAt) {
        this.scene.physics.world.resume();
      }
    });
  }

  /** 使い捨て emitter で単発爆発を出し、寿命後に必ず破棄する(リーク防止)。 */
  private explode(x: number, y: number, conf: ExplosionConfig): void {
    const emitter = this.scene.add.particles(x, y, TEX.spark, {
      speed: { min: conf.speedMin, max: conf.speedMax },
      lifespan: conf.lifespanMs,
      scale: { start: conf.scaleStart, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    emitter.setDepth(20);
    emitter.explode(conf.count);
    this.scene.time.delayedCall(conf.lifespanMs + EFFECTS.explosion.cleanupMarginMs, () => {
      emitter.destroy();
    });
  }
}
