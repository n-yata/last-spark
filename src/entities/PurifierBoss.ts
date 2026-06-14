import Phaser from 'phaser';
import { PURIFIER, SHOT, STAGE, type PurifierBossConfig } from '../config/balance';
import { TEX } from '../config/assetKeys';
import { pickNextPurifierBossAction, bossActionDuration } from '../systems/bossAi';
import { Boss, DEFAULT_ACTION_DURATION_MS } from './Boss';
import type { Projectile } from './Projectile';

// stage4 専用・環境管理機(浄化型)ボス。Boss を継承し、被ダメ/けぞり/フェーズ/撃破/アリーナ拘束・
// 接地移動はそのまま再利用しつつ、jump の代わりに spray(扇状の範囲攻撃=汚染霧スプレー)と
// bloom(プレイヤー足元へ時限式の汚染床を能動的に設置する地形干渉)を持つ。「浄化」という名の
// 汚染で安全地帯をじわじわ奪う皮肉を、扇状の毒霧と足元の汚染床で表現する。

/** bloom(動的汚染床)の 1 枚分の矩形(左上基準)。 */
export interface BloomPatchRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * bloom(動的汚染床)の生成に必要な外部参照。GameScene が spawnBoss 時に注入する。
 * 動的 Hazard の生成・当たり判定登録・時限破棄の責務は GameScene 側に置き、ボスは「どこに・いつまで
 * 床を出すか」だけを伝える(CoreBoss.setSummonContext と同型の疎結合)。
 */
export interface BloomContext {
  /** プレイヤー足元へ時限式の汚染床を 1 枚生成する(lifespanMs 経過で破棄)。 */
  spawnPatch(rect: BloomPatchRect, lifespanMs: number): void;
}

/** bloom 床の薄さ(静的汚染床と同じ。地面の上に薄く敷く)。 */
const BLOOM_PATCH_HEIGHT = 16;
/** bloom 床の上端を地面上端から何 px 上に置くか(静的 hazard と同じ接地)。 */
const BLOOM_PATCH_GROUND_INSET = 14;
/** phase2 の spray 2 連射の間隔(ms)。 */
const SPRAY_SECOND_BURST_MS = 220;

export class PurifierBoss extends Boss {
  /** bloom の外部参照(未注入なら bloom は no-op=安全側)。 */
  private bloomCtx?: BloomContext;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // 接地型(重力あり)。専用リグ bossPurifier(汚染タンクを背負った接地機)を使う('boss' 流用を解消)。
    super(scene, x, y, { config: PURIFIER, rigFamily: 'bossPurifier', gravity: true });
  }

  /** bloom の外部参照を注入する。未注入なら bloom は no-op(安全側)。 */
  setBloomContext(ctx: BloomContext): void {
    this.bloomCtx = ctx;
  }

  protected override beginNextAction(now: number, playerX: number): void {
    const next = pickNextPurifierBossAction(this.phase, this.lastAction);
    this.lastAction = next;
    this.currentAction = next;

    const baseDuration = bossActionDuration(
      this.cfg.actionDurationMs,
      next,
      DEFAULT_ACTION_DURATION_MS,
    );
    const factor = this.phase === 'phase2' ? this.cfg.phase2SpeedFactor : 1;
    this.actionEndsAt = now + baseDuration * factor;

    if (next === 'shoot') {
      this.fireVolley(playerX);
    } else if (next === 'spray') {
      this.fireSpray(playerX);
    } else if (next === 'bloom') {
      this.fireBloom(playerX);
    } else if (next === 'move') {
      this.paceDir = this.chooseMoveDir();
    }
    // spray/bloom/shoot/idle は executeAction の default 分岐でその場停止する(jump は持たない)。
  }

  /**
   * 扇状の範囲攻撃(汚染霧スプレー)。phase2 では 2 連射化して毒霧の圧を強める。
   * 2 発目は発射までにボスが撃破/無効化されていたら撃たない(安全側)。
   */
  protected fireSpray(playerX: number): void {
    this.fireSprayOnce(playerX);
    if (this.phase === 'phase2') {
      this.scene.time.delayedCall(SPRAY_SECOND_BURST_MS, () => {
        if (!this.isAlive || !this.active) return;
        this.fireSprayOnce(playerX);
      });
    }
  }

  /**
   * 扇状スプレーの 1 連射。プレイヤー方向の水平を中心に、spray.spreadRad の開き角へ spray.count 発を
   * 均等散布する。単発弾より遅く広く展開し、回避を「位置取り」で迫る。既存の弾プール/Projectile を
   * 流用し、発射後に鉛直速度を与えて扇形にする。
   */
  protected fireSprayOnce(playerX: number): void {
    if (!this.projectiles) return;
    const cfg = this.cfg as PurifierBossConfig;
    const { count, spreadRad, speed } = cfg.spray;
    const dir: 1 | -1 = playerX < this.x ? -1 : 1;
    const muzzleX = this.x + dir * (this.cfg.width / 2 + 4);
    const muzzleY = this.y;
    // 最下弾が地面下へ潜って見えないよう、発射 Y は地面上端より上に収める。
    const clampedMuzzleY = Math.min(muzzleY, STAGE.groundY - SHOT.normalSize / 2);

    for (let i = 0; i < count; i += 1) {
      // 0..1 を -spreadRad/2 .. +spreadRad/2 へ写像する(下向きを正とする扇)。
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = (t - 0.5) * spreadRad;
      const vx = dir * Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const projectile = this.projectiles.get(muzzleX, clampedMuzzleY) as Projectile | null;
      if (!projectile) continue;
      projectile.fire(muzzleX, clampedMuzzleY, vx, 'normal', 'enemy');
      // 見た目だけ汚染霧色へ差し替える(弾種=normal・ダメージ・挙動は通常の敵弾と同じ)。
      // 汚染トーンと地続きの色で「この機械の汚染がこの世界を枯らした」を視覚で繋ぐ(安い手当て)。
      projectile.setTexture(TEX.projectilePollution);
      // Projectile.fire は鉛直速度を 0 にするため、発射後に扇の鉛直成分を与える。
      projectile.setVelocityY(vy);
    }
    this.rig.triggerAttack(this.scene.time.now);
  }

  /**
   * bloom(汚染床設置): プレイヤー足元〜周辺の地面に時限式の汚染床を能動的に増殖させる。
   * phase2 で枚数増・存続時間延長し、床がほぼ常設化して位置取りとジャンプを強制する(安全地帯の侵食)。
   * 動的 Hazard の生成・登録・破棄は GameScene(bloomCtx)が担い、ボスは設置位置と存続時間だけ伝える。
   */
  private fireBloom(playerX: number): void {
    const ctx = this.bloomCtx;
    if (!ctx) return;
    const cfg = this.cfg as PurifierBossConfig;
    const isPhase2 = this.phase === 'phase2';
    const count = isPhase2 ? cfg.bloom.countP2 : cfg.bloom.countP1;
    const patchWidth = isPhase2 ? cfg.bloom.patchWidthP2 : cfg.bloom.patchWidthP1;
    const lifespanMs = isPhase2 ? cfg.bloom.lifespanMsP2 : cfg.bloom.lifespanMsP1;
    // 静的汚染床と同じく地面の上へ薄く敷く(上に乗れる/越えられるスリップダメージ床)。
    const top = STAGE.groundY - BLOOM_PATCH_GROUND_INSET;

    for (let i = 0; i < count; i += 1) {
      // プレイヤー足元を中心に、隣接して並べて「安全地帯」を面で奪う。アリーナ内に収める。
      const offset = (i - (count - 1) / 2) * patchWidth;
      const centerX = Phaser.Math.Clamp(playerX + offset, this.arenaMinX, this.arenaMaxX);
      ctx.spawnPatch(
        { x: centerX - patchWidth / 2, y: top, width: patchWidth, height: BLOOM_PATCH_HEIGHT },
        lifespanMs,
      );
    }
    this.rig.triggerAttack(this.scene.time.now);
  }
}
