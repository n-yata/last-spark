import Phaser from 'phaser';
import { PURIFIER, SHOT, STAGE, type PurifierBossConfig } from '../config/balance';
import { pickNextPurifierBossAction, bossActionDuration } from '../systems/bossAi';
import { Boss, DEFAULT_ACTION_DURATION_MS } from './Boss';
import type { Projectile } from './Projectile';

// stage4 専用・環境管理機(浄化型)ボス。Boss を継承し、被ダメ/けぞり/フェーズ/撃破/アリーナ拘束・
// 接地移動はそのまま再利用しつつ、jump の代わりに spray(扇状の範囲攻撃=毒霧スプレー)を持つ。
// 「浄化」という名の汚染を扇状にまき散らす皮肉な攻撃を、遅い弾束で表現する。

export class PurifierBoss extends Boss {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    // 接地型(重力あり)。専用リグは未調達のため接地ボスリグ('boss')を流用する(プレースホルダ)。
    super(scene, x, y, { config: PURIFIER, rigFamily: 'boss', gravity: true });
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
    } else if (next === 'move') {
      this.paceDir = this.chooseMoveDir();
    }
    // spray/shoot/idle は executeAction の default 分岐でその場停止する(jump は持たない)。
  }

  /**
   * 扇状の範囲攻撃(毒霧スプレー)。プレイヤー方向の水平を中心に、spray.spreadRad の開き角へ
   * spray.count 発を均等散布する。単発弾より遅く広く展開し、回避を「位置取り」で迫る。
   * 既存の弾プール/Projectile を流用し、発射後に鉛直速度を与えて扇形にする。
   */
  protected fireSpray(playerX: number): void {
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
      // Projectile.fire は鉛直速度を 0 にするため、発射後に扇の鉛直成分を与える。
      projectile.setVelocityY(vy);
    }
    this.rig.triggerAttack(this.scene.time.now);
  }
}
