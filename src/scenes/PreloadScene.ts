import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { TEX } from '../config/assetKeys';
import { PLAYER, ENEMY, BOSS, SHOT } from '../config/balance';

// アセットのロード。本 MVP は本番スプライト未用意のため、Graphics で
// プレースホルダのテクスチャを生成する(世界観=暗め基調+発光アクセントを配色で表現)。
// 将来テクスチャアトラスへ差し替え可能なよう、キーは assetKeys に集約している。

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.preload);
  }

  create(): void {
    this.showLoading();
    this.generateTextures();
    this.scene.start(SCENE_KEYS.title);
  }

  private showLoading(): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'NOW LOADING...', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#37f7d8',
      })
      .setOrigin(0.5);
  }

  private generateTextures(): void {
    // 1x1 ピクセル(汎用塗り)
    this.makeRect(TEX.pixel, 1, 1, 0xffffff);

    // プレイヤー: 暗いボディ + ネオンコア
    this.makeCharacter(TEX.player, PLAYER.width, PLAYER.height, 0x1d2a33, 0x37f7d8);

    // 雑魚敵
    this.makeCharacter(
      TEX.enemyWalker,
      ENEMY.walker.width,
      ENEMY.walker.height,
      0x33202a,
      0xff5d7a,
    );
    this.makeCharacter(
      TEX.enemyTurret,
      ENEMY.turret.width,
      ENEMY.turret.height,
      0x2a2433,
      0xc77dff,
    );

    // ボス: 大型 + 強い発光
    this.makeCharacter(TEX.boss, BOSS.width, BOSS.height, 0x241016, 0xff2d55);

    // 弾
    this.makeOrb(TEX.projectileNormal, SHOT.normalSize, 0x9fffe8);
    this.makeOrb(TEX.projectileCharged, SHOT.chargedSize, 0xfff27a);
    this.makeOrb(TEX.projectileEnemy, SHOT.normalSize + 2, 0xff7a90);

    // 地形
    this.makeGround(TEX.ground, 64, 60, 0x10171d, 0x37f7d8);
    this.makeGround(TEX.platform, 64, 24, 0x16202a, 0x6cf0ff);

    // ヒットエフェクト
    this.makeOrb(TEX.hit, 24, 0xffffff);
  }

  private makeRect(key: string, w: number, h: number, color: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /** キャラ風: 角丸ボディ + 中央の発光コア。 */
  private makeCharacter(
    key: string,
    w: number,
    h: number,
    body: number,
    core: number,
  ): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(body, 1);
    g.fillRoundedRect(0, 0, w, h, Math.min(8, w / 4));
    // 発光コア
    const coreR = Math.max(3, Math.min(w, h) / 5);
    g.fillStyle(core, 1);
    g.fillCircle(w / 2, h / 2, coreR);
    g.fillStyle(core, 0.3);
    g.fillCircle(w / 2, h / 2, coreR + 3);
    // 縁の発光ライン
    g.lineStyle(2, core, 0.6);
    g.strokeRoundedRect(1, 1, w - 2, h - 2, Math.min(8, w / 4));
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /** 発光する弾(円)。 */
  private makeOrb(key: string, size: number, color: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const r = size / 2;
    g.fillStyle(color, 0.3);
    g.fillCircle(r, r, r);
    g.fillStyle(color, 1);
    g.fillCircle(r, r, Math.max(1, r - 2));
    g.generateTexture(key, size, size);
    g.destroy();
  }

  /** 地面/足場: 暗い本体 + 上端の発光ライン。 */
  private makeGround(key: string, w: number, h: number, body: number, edge: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(body, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(edge, 0.8);
    g.fillRect(0, 0, w, 3);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
