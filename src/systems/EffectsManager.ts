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
  /** 環境パーティクル(空気感)の emitter と、カメラ可視域に追従させる発生ゾーン。 */
  private ambientEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private ambientZone?: Phaser.Geom.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // シーン終了時にタイマーを破棄し、物理が止まったまま遷移するのを防ぐ。
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bossDeathTimer?.remove();
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.followAmbientToCamera, this);
      this.ambientEmitter?.destroy();
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

  /** プレイヤー被弾の手応え。短いフラッシュとシェイクで痛みを即座に返す。 */
  playerDamaged(): void {
    const { durationMs, intensity } = EFFECTS.shake.playerDamage;
    this.scene.cameras.main.shake(durationMs, intensity);
    const flash = EFFECTS.playerDamageFlash;
    this.screenFlash(flash.color, flash.alpha, flash.durationMs, 24);
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
   * ボス登場時の短いシネマ演出。画面上に色帯とボス名を出し、戦闘の節目を明確にする。
   * HUD/本文とは別系統の演出なので、既存のストーリーテキストは変更しない。
   */
  bossIntro(name: string, color: number): number {
    const p = EFFECTS.bossPresentation;
    const introMs = p.introMs;
    const cam = this.scene.cameras.main;
    const width = cam.width;
    this.screenFlash(color, p.introOverlayAlpha, introMs, 27);
    const topBand = this.scene.add
      .rectangle(width / 2, 56, width, p.introBandHeight, color, p.introBandAlpha)
      .setScrollFactor(0)
      .setDepth(30);
    const flash = this.scene.add
      .rectangle(width / 2, 56, width, p.introBandHeight, color, p.introFlashAlpha)
      .setScrollFactor(0)
      .setDepth(29);
    const sweep = this.scene.add
      .image(-width * 0.1, 56, TEX.hit)
      .setScrollFactor(0)
      .setDepth(31)
      .setScale(5.6, 0.42)
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.9);
    const label = this.scene.add
      .text(width / 2, 56, name, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(31);
    this.scene.cameras.main.shake(220, 0.0032);
    this.scene.tweens.add({
      targets: sweep,
      x: width * 1.1,
      alpha: 0,
      duration: introMs,
      ease: 'Cubic.Out',
      onComplete: () => sweep.destroy(),
    });
    this.scene.tweens.add({
      targets: [topBand, flash, label],
      alpha: 0,
      duration: introMs,
      ease: 'Quad.Out',
      onComplete: () => {
        topBand.destroy();
        flash.destroy();
        label.destroy();
      },
    });
    return introMs;
  }

  /** フェーズ移行の瞬間を強調するリング発光。 */
  bossPhaseShift(x: number, y: number, color: number): void {
    const p = EFFECTS.bossPresentation;
    const ring = this.scene.add
      .circle(x, y, p.phaseShiftRingRadiusStart, 0x000000, 0)
      .setStrokeStyle(p.phaseShiftRingStroke, color, 0.9);
    const secondRing = this.scene.add
      .circle(x, y, p.phaseShiftRingRadiusStart * 0.75, 0x000000, 0)
      .setStrokeStyle(p.phaseShiftRingStroke - 1, 0xffffff, 0.85);
    ring.setDepth(20);
    secondRing.setDepth(20);
    this.scene.cameras.main.shake(220, 0.0038);
    this.screenFlash(color, p.phaseShiftFlashAlpha, p.phaseShiftDurationMs, 23);
    this.scene.tweens.add({
      targets: ring,
      radius: p.phaseShiftRingRadiusEnd,
      alpha: 0,
      duration: p.phaseShiftDurationMs,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    });
    this.scene.tweens.add({
      targets: secondRing,
      radius: p.phaseShiftRingRadiusEnd * 0.72,
      alpha: 0,
      duration: p.phaseShiftDurationMs,
      ease: 'Quad.Out',
      onComplete: () => secondRing.destroy(),
    });
  }

  /** 撃破直後の余韻発光。ボス爆散の前に一拍置いて決着感を作る。 */
  bossAfterglow(x: number, y: number, color: number, onComplete: () => void): void {
    const glow = this.scene.add.circle(x, y, 42, color, 0.38).setDepth(19);
    this.scene.tweens.add({
      targets: glow,
      radius: 160,
      alpha: 0,
      duration: 280,
      ease: 'Quad.Out',
      onComplete: () => {
        glow.destroy();
        onComplete();
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

  /** 弾命中の放射状スパーク(撃破前の通常ヒットの手応え)。 */
  impactSpark(x: number, y: number, target: 'enemy' | 'boss' = 'enemy'): void {
    if (target === 'boss') {
      const c = EFFECTS.impactSpark;
      this.explode(x, y, {
        count: Math.round(c.count * c.bossCountMul),
        speedMin: Math.round(c.speedMin * c.bossSpeedMul),
        speedMax: Math.round(c.speedMax * c.bossSpeedMul),
        lifespanMs: c.lifespanMs,
        scaleStart: c.scaleStart * c.bossScaleMul,
      });
      const shake = EFFECTS.shake.bossHit;
      this.scene.cameras.main.shake(shake.durationMs, shake.intensity);
      return;
    }
    this.explode(x, y, EFFECTS.impactSpark);
  }

  /** チャージ吸収成功時の小演出。 */
  absorbSpark(x: number, y: number): void {
    this.explode(x, y, EFFECTS.absorbSpark);
    const shake = EFFECTS.shake.absorb;
    this.scene.cameras.main.shake(shake.durationMs, shake.intensity);
  }

  /** 雑魚撃破: 小爆発 + 小さなカメラシェイクで手応えを足す。 */
  enemyKilled(x: number, y: number): void {
    this.explodeSmall(x, y);
    const k = EFFECTS.shake.enemyKill;
    this.scene.cameras.main.shake(k.durationMs, k.intensity);
  }

  /** 高所着地のダスト。hard=true はより重い着地として扱う。 */
  landingDust(x: number, y: number, hard: boolean): void {
    const l = EFFECTS.landing;
    const scaleMul = hard ? l.hardScaleMul : 1;
    const emitter = this.scene.add.particles(x, y, TEX.spark, {
      speedX: { min: -l.dustSpeedMax, max: l.dustSpeedMax },
      speedY: { min: -l.dustSpeedMin * 0.45, max: -l.dustSpeedMax * 0.2 },
      lifespan: l.lifespanMs,
      scale: { start: l.scaleStart * scaleMul, end: 0 },
      alpha: { start: 0.8, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    emitter.setDepth(9);
    emitter.explode(Math.round(l.dustCount * scaleMul));
    const shake = hard ? EFFECTS.shake.landingHard : EFFECTS.shake.landingSoft;
    this.scene.cameras.main.shake(shake.durationMs, shake.intensity);
    this.scene.time.delayedCall(l.lifespanMs + EFFECTS.explosion.cleanupMarginMs, () =>
      emitter.destroy(),
    );
  }

  /** 発射のマズルフラッシュ: 銃口の閃光 + 前方へ飛ぶ火花。dir は向き(+1右/-1左)。 */
  muzzleFlash(x: number, y: number, dir: 1 | -1, charged = false): void {
    const m = EFFECTS.muzzle;
    const scale = m.flashScale * (charged ? m.chargedScaleMul : 1);
    const flash = this.scene.add
      .image(x, y, TEX.hit)
      .setDepth(21)
      .setScale(scale)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(charged ? 0xfff27a : 0x9ffff0);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: scale * 1.6,
      duration: m.flashMs,
      onComplete: () => flash.destroy(),
    });
    const baseAngle = dir > 0 ? 0 : 180;
    const emitter = this.scene.add.particles(x, y, TEX.spark, {
      speed: { min: m.sparkSpeedMin, max: m.sparkSpeedMax },
      angle: { min: baseAngle - 22, max: baseAngle + 22 },
      lifespan: m.sparkLifespanMs,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    emitter.setDepth(21);
    emitter.explode(m.sparkCount);
    this.scene.time.delayedCall(m.sparkLifespanMs + EFFECTS.explosion.cleanupMarginMs, () =>
      emitter.destroy(),
    );
  }

  /**
   * 強化ビーム(RAY 強化 stage6 のチャージ攻撃)発射の手応え。dir は向き(+1右/-1左)。
   * 収束リングの予兆 → 大きなマズル閃光 → 前方バースト → 軽いシェイクで、最上位アクションの
   * 「チャージを解き放った」迫力を出す。ビーム本体(帯)の生成・当たり判定とは独立した演出のみ。
   */
  beamFire(x: number, y: number, dir: 1 | -1): void {
    const b = EFFECTS.beamFire;
    // 1) 収束リング: 大きく置いて内側へ潰す(発射の予兆=エネルギーがマズルへ集まる)。
    const ring = this.scene.add
      .image(x, y, TEX.hit)
      .setDepth(21)
      .setScale(b.ringScaleStart)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(b.color);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 0.1,
      duration: b.ringMs,
      ease: 'Quad.In',
      onComplete: () => ring.destroy(),
    });
    // 2) マズル閃光: 通常チャージ弾より強い閃光を拡大しながら抜く。
    const flash = this.scene.add
      .image(x, y, TEX.hit)
      .setDepth(21)
      .setScale(b.flashScale)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(b.color);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: b.flashScale * 1.6,
      duration: b.flashMs,
      onComplete: () => flash.destroy(),
    });
    // 3) 前方バースト: ビーム方向へスパークを噴出する。
    const baseAngle = dir > 0 ? 0 : 180;
    const emitter = this.scene.add.particles(x, y, TEX.spark, {
      speed: { min: b.sparkSpeedMin, max: b.sparkSpeedMax },
      angle: { min: baseAngle - b.sparkSpreadDeg, max: baseAngle + b.sparkSpreadDeg },
      lifespan: b.sparkLifespanMs,
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    emitter.setDepth(21);
    emitter.explode(b.sparkCount);
    this.scene.time.delayedCall(b.sparkLifespanMs + EFFECTS.explosion.cleanupMarginMs, () =>
      emitter.destroy(),
    );
    // カメラシェイクは出さない: 持続ビームは押している間ずっと発射状態のため、揺らすと画面が
    // 暴れ続けて見づらい。手応えは閃光・収束リング・前方バーストの光演出で表現する。
  }

  /** 環境パーティクル(空気感)を開始する。color はステージのアクセント色(発光)。 */
  startAmbient(color: number): void {
    const a = EFFECTS.ambient;
    const v = this.scene.cameras.main.worldView;
    this.ambientZone = new Phaser.Geom.Rectangle(v.x, v.y, v.width || 960, v.height || 540);
    this.ambientEmitter = this.scene.add.particles(0, 0, TEX.spark, {
      frequency: a.frequencyMs,
      lifespan: a.lifespanMs,
      speed: { min: a.speedMin, max: a.speedMax },
      gravityY: a.gravityY,
      scale: { min: a.scaleMin, max: a.scaleMax },
      alpha: { start: a.alphaPeak, end: 0 },
      tint: color,
      blendMode: Phaser.BlendModes.ADD,
      emitZone: { type: 'random', source: this.ambientZone, quantity: 1 },
    });
    this.ambientEmitter.setDepth(-2); // 背景の前・キャラの後ろ(漂う空気感)
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.followAmbientToCamera, this);
  }

  /** 環境パーティクルの発生域をカメラ可視域へ追従させる(横スクロールで常に画面内に漂わせる)。 */
  private followAmbientToCamera = (): void => {
    if (!this.ambientZone) return;
    const v = this.scene.cameras.main.worldView;
    this.ambientZone.setTo(v.x, v.y, v.width, v.height);
  };

  /** 画面全体の短いフラッシュ。視認性を壊さないよう淡く出してすぐ抜く。 */
  private screenFlash(color: number, alpha: number, durationMs: number, depth: number): Phaser.GameObjects.Rectangle {
    const cam = this.scene.cameras.main;
    const flash = this.scene.add
      .rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, color, alpha)
      .setScrollFactor(0)
      .setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.Out',
      onComplete: () => flash.destroy(),
    });
    return flash;
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
