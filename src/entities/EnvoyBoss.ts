import Phaser from 'phaser';
import { ENVOY, type EnvoyBossConfig } from '../config/balance';
import { pickNextEnvoyBossAction, bossActionDuration } from '../systems/bossAi';
import { FlyingBoss } from './FlyingBoss';
import { DEFAULT_ACTION_DURATION_MS } from './Boss';
import type { Projectile } from './Projectile';

// stage5 専用・ECLIPSE の使者(高速型)。FlyingBoss を継承し、飛行の滞空・急降下を再利用しつつ、
// 固有アクション lance(任意角度の高速槍弾・時間差発射・非貫通)/blink(逆サイドへの瞬間移動ダッシュ+
// 残像)を足す。「論理を突きつける高速の刺客」として、プレイヤーに位置取りの"読み(選択)"を強いる。
// 行動抽選は ENVOY 専用テーブル(pickNextEnvoyBossAction)を使い、stage2 飛行ボスとは共有しない。

/** 残像ゴーストの色(冷たい白青)。Phase C で bossEnvoy リグ追加後も blink の軌跡として使う。 */
const AFTERIMAGE_COLOR = 0x8ad8ff;
/** 残像の生成間引き間隔(ms)。毎フレーム生成を避けて負荷とノイズを抑える。 */
const AFTERIMAGE_SPAWN_INTERVAL_MS = 45;

export class EnvoyBoss extends FlyingBoss {
  /** EnvoyBossConfig として参照するための型付きエイリアス。 */
  private readonly envoy: EnvoyBossConfig;
  /** blink ダッシュの水平向き(beginNextAction で決め直す)。 */
  private blinkDir: -1 | 1 = 1;
  /** 直近に残像を生成した時刻(ms)。間引きに使う。 */
  private lastAfterimageAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // 専用リグ bossEnvoy(槍/矢じり型の流線機体)を使う。飛行ボス(bossFlying)流用を解消。
    super(scene, x, y, ENVOY, 'bossEnvoy');
    this.envoy = ENVOY;
  }

  protected override beginNextAction(now: number, playerX: number): void {
    const next = pickNextEnvoyBossAction(this.phase, this.lastAction);
    this.lastAction = next;
    this.currentAction = next;

    const baseDuration = bossActionDuration(
      this.cfg.actionDurationMs,
      next,
      DEFAULT_ACTION_DURATION_MS,
    );
    const factor = this.phase === 'phase2' ? this.cfg.phase2SpeedFactor : 1;
    this.actionEndsAt = now + baseDuration * factor;

    // アクション開始時の単発処理(飛行の shoot に加え、固有の lance/blink を扱う)。
    if (next === 'shoot') {
      this.fireVolley(playerX);
    } else if (next === 'lance') {
      this.fireLance(playerX);
    } else if (next === 'blink') {
      this.startBlink(playerX);
    }
    // hover/dive は executeAction 側(FlyingBoss)で毎フレーム処理する。
  }

  protected override executeAction(playerX: number): void {
    if (this.currentAction === 'blink') {
      // 逆サイドへ高速ダッシュしつつ滞空高度を維持し、軌跡に残像を落とす。
      const now = this.scene.time.now;
      this.setVelocityX(this.blinkDir * this.envoy.blink.dashSpeed);
      this.followAltitude(now);
      this.spawnAfterimage(now);
      return;
    }
    // lance はその場で滞空して撃つ(FlyingBoss の default 分岐=hover 保持に委譲)。
    // hover/dive/shoot/idle/stagger も FlyingBoss の処理をそのまま使う。
    super.executeAction(playerX);
  }

  /**
   * 高速槍弾(lance)を時間差で複数発射する。発射時点のプレイヤー位置を狙い、ENVOY.lance.speed で
   * 任意角度へ撃つ。phase2 で本数が増える。各弾は非貫通(命中で回収)で、進行方向へ回転させる。
   * 後続弾は同一の狙点へ intervalMs 間隔で撃つため、移動しないと連続被弾する=位置取りを強制する。
   */
  private fireLance(playerX: number): void {
    if (!this.projectiles) return;
    const { countP1, countP2, speed, intervalMs } = this.envoy.lance;
    const count = this.phase === 'phase2' ? countP2 : countP1;
    // 発射時点のプレイヤー位置を狙点として固定する(後続弾はそこへ撃ち、移動で回避させる)。
    const targetX = playerX;
    const targetY = this.targetY;
    this.rig.triggerAttack(this.scene.time.now);

    for (let i = 0; i < count; i += 1) {
      if (i === 0) {
        this.fireOneLance(targetX, targetY, speed);
      } else {
        // 後続弾は時間差で発射する。発射までにボスが撃破/無効化されていたら撃たない。
        this.scene.time.delayedCall(i * intervalMs, () => {
          if (!this.isAlive || !this.active) return;
          this.fireOneLance(targetX, targetY, speed);
        });
      }
    }
  }

  /** 狙点 (targetX, targetY) へ向けて槍弾 1 本を発射する。 */
  private fireOneLance(targetX: number, targetY: number, speed: number): void {
    if (!this.projectiles) return;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    // 発射点は本体中心から狙点方向へ少しオフセット(機体の前方から放つ)。
    const muzzleX = this.x + nx * (this.cfg.width / 2);
    const muzzleY = this.y + ny * (this.cfg.height / 2);
    const lance = this.projectiles.get(muzzleX, muzzleY) as Projectile | null;
    if (!lance) return;
    lance.fire(muzzleX, muzzleY, nx * speed, 'lance', 'enemy', { velocityY: ny * speed });
    // 槍の見た目を進行方向へ向ける(テクスチャは +X 基準)。
    lance.setRotation(Math.atan2(ny * speed, nx * speed));
  }

  /**
   * blink(瞬間移動ダッシュ)の向きを決める。プレイヤーの逆サイドへ抜けて挟む位置取りにするため、
   * ボスがプレイヤーより左にいれば右へ、右にいれば左へダッシュする。実際の移動・残像は
   * executeAction が blink 継続中に毎フレーム処理する。
   */
  private startBlink(playerX: number): void {
    this.blinkDir = this.x < playerX ? 1 : -1;
    this.lastAfterimageAt = 0;
    this.rig.triggerAttack(this.scene.time.now); // 瞬発の予備動作
  }

  /**
   * blink ダッシュ中の残像を生成する(間引き付き)。本体より背面の半透明矩形を置き、afterimageMs で
   * フェードして自己破棄する。tween 完了で destroy するためリークしない。
   */
  private spawnAfterimage(now: number): void {
    if (now - this.lastAfterimageAt < AFTERIMAGE_SPAWN_INTERVAL_MS) return;
    this.lastAfterimageAt = now;
    const ghost = this.scene.add.rectangle(
      this.x,
      this.y,
      this.cfg.width,
      this.cfg.height,
      AFTERIMAGE_COLOR,
      0.35,
    );
    ghost.setDepth(8); // 本体(depth 9)より背面に置く
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: this.envoy.blink.afterimageMs,
      onComplete: () => ghost.destroy(),
    });
  }
}
