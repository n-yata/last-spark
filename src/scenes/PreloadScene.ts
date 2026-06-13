import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { TEX, CUTSCENE_TEX } from '../config/assetKeys';
import { PLAYER, ENEMY, BOSS, SHOT } from '../config/balance';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/dimensions';
import { allRigParts, type RigPartSpec } from '../config/characterRig';
import { cappedDpr, scaledFontPx } from '../config/uiScale';

// アセットのロード。本 MVP は本番スプライト未用意のため、Graphics で
// プレースホルダのテクスチャを生成する(世界観=暗め基調+発光アクセントを配色で表現)。
// 将来テクスチャアトラスへ差し替え可能なよう、キーは assetKeys に集約している。

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.preload);
  }

  preload(): void {
    // 演出シーンの背景静止画(実ファイルアセット)。SVG はベクターなので高DPI(Retina)で
    // 滲まないよう論理解像度の cappedDpr 倍でラスタライズする。CutsceneScene は cover 配置で
    // 全画面に敷く(テクスチャ実寸基準なので表示倍率は自動で一致する)。scriptKey ごとに 1 枚。
    // base:'./' のため index.html 相対の 'assets/...' で参照する。
    const dpr = cappedDpr();
    const svgW = GAME_WIDTH * dpr;
    const svgH = GAME_HEIGHT * dpr;
    this.load.svg(CUTSCENE_TEX.stage1Intro, 'assets/cutscenes/stage1-intro.svg', {
      width: svgW,
      height: svgH,
    });
    this.load.svg(CUTSCENE_TEX.stage3Rescue, 'assets/cutscenes/stage3-rescue.svg', {
      width: svgW,
      height: svgH,
    });
    this.load.svg(CUTSCENE_TEX.stage4Intro, 'assets/cutscenes/stage4-intro.svg', {
      width: svgW,
      height: svgH,
    });
    this.load.svg(CUTSCENE_TEX.stage5Intro, 'assets/cutscenes/stage5-intro.svg', {
      width: svgW,
      height: svgH,
    });
    this.load.svg(CUTSCENE_TEX.stage6Ending, 'assets/cutscenes/stage6-ending.svg', {
      width: svgW,
      height: svgH,
    });
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
        fontSize: scaledFontPx(18),
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

    // キャラの関節パーツ(リグ用)。characterRig 定義を単一の真実として全件生成する。
    for (const spec of allRigParts()) {
      this.makePart(spec);
    }

    // 弾
    this.makeOrb(TEX.projectileNormal, SHOT.normalSize, 0x9fffe8);
    this.makeOrb(TEX.projectileCharged, SHOT.chargedSize, 0xfff27a);
    this.makeOrb(TEX.projectileEnemy, SHOT.normalSize + 2, 0xff7a90);
    // ミサイル(stage3 収容番人): 弾頭 + 噴射炎の縦長シルエットで通常弾と区別する。
    this.makeMissile(TEX.projectileMissile, SHOT.missileSize, 0xffb347, 0xff5a3c);

    // 地形
    this.makeGround(TEX.ground, 64, 60, 0x10171d, 0x37f7d8);
    this.makeGround(TEX.platform, 64, 24, 0x16202a, 0x6cf0ff);

    // 梯子(縦に桟が並ぶ発光ハシゴ)。タイル状に縦へ繰り返して敷く前提。
    this.makeLadder(TEX.ladder, 32, 32, 0x142028, 0x6cf0ff);

    // ヒットエフェクト
    this.makeOrb(TEX.hit, 24, 0xffffff);

    // 撃破爆発のパーティクル粒(小さな発光オーブ)
    this.makeOrb(TEX.spark, 8, 0xfff27a);
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

  /** 色を明/暗方向へ寄せる。f>0 で白へ、f<0 で黒へ(範囲 -1..1)。陰影生成に使う。 */
  private shade(color: number, f: number): number {
    const r = (color >> 16) & 0xff;
    const gc = (color >> 8) & 0xff;
    const b = color & 0xff;
    const mix = (c: number) =>
      f >= 0
        ? Math.round(c + (255 - c) * f)
        : Math.round(c * (1 + f));
    return (mix(r) << 16) | (mix(gc) << 8) | mix(b);
  }

  /** リグの 1 パーツを形状別に手続き生成する。役割別カラー + 陰影 + 主/副ネオン。 */
  private makePart(spec: RigPartSpec): void {
    const { w, h, fill, accent } = spec;
    const accent2 = spec.accent2 ?? accent;
    const hi = this.shade(fill, 0.28); // 上面ハイライト
    const lo = this.shade(fill, -0.4); // 下面シャドウ
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    switch (spec.shape) {
      case 'helmet': {
        // 上側を強く丸めたヘルメット + 横長の発光バイザー。天面ハイライト/顎シャドウ。
        const r = Math.min(h * 0.6, w / 2);
        const radii = { tl: r, tr: r, bl: 3, br: 3 };
        g.fillStyle(fill, 1);
        g.fillRoundedRect(0, 0, w, h, radii);
        g.fillStyle(hi, 0.55);
        g.fillRoundedRect(w * 0.12, h * 0.06, w * 0.76, h * 0.22, { tl: r * 0.6, tr: r * 0.6, bl: 2, br: 2 });
        g.fillStyle(lo, 0.5);
        g.fillRect(0, h * 0.78, w, h * 0.22);
        // バイザー(主発光) + ハロ
        g.fillStyle(accent, 0.3);
        g.fillRoundedRect(w * 0.12, h * 0.36, w * 0.76, h * 0.36, 4);
        g.fillStyle(accent, 1);
        g.fillRoundedRect(w * 0.18, h * 0.42, w * 0.64, h * 0.24, 3);
        // 副発光のサイドランプ
        g.fillStyle(accent2, 1);
        g.fillCircle(w * 0.85, h * 0.28, Math.max(1, w * 0.06));
        g.lineStyle(1.5, accent, 0.7);
        g.strokeRoundedRect(0.75, 0.75, w - 1.5, h - 1.5, radii);
        break;
      }
      case 'cannon': {
        // 砲身本体 + 先端(facing 前方 = 右)の発光マズルリング。上ハイライト/下シャドウ。
        g.fillStyle(fill, 1);
        g.fillRoundedRect(0, 0, w, h, 3);
        g.fillStyle(hi, 0.5);
        g.fillRect(w * 0.05, h * 0.1, w * 0.9, h * 0.22);
        g.fillStyle(lo, 0.5);
        g.fillRect(w * 0.05, h * 0.72, w * 0.9, h * 0.2);
        // 副発光のパネルライン(根本側)
        g.fillStyle(accent2, 0.9);
        g.fillRect(w * 0.12, h * 0.4, Math.max(1.5, w * 0.06), h * 0.2);
        const muzzleR = h * 0.42;
        g.fillStyle(accent, 0.3);
        g.fillCircle(w - muzzleR, h / 2, muzzleR + 2);
        g.fillStyle(accent, 1);
        g.fillCircle(w - muzzleR, h / 2, muzzleR);
        g.fillStyle(this.shade(fill, -0.2), 1);
        g.fillCircle(w - muzzleR, h / 2, Math.max(1, muzzleR - 2.5));
        g.lineStyle(1.5, accent, 0.6);
        g.strokeRoundedRect(0.75, 0.75, w - 1.5, h - 1.5, 3);
        break;
      }
      case 'leg': {
        // 先細りの脚(上=股関節幅広, 下=細い)。内側ハイライト + 足先の発光。
        const topInset = w * 0.05;
        const botInset = w * 0.28;
        g.fillStyle(fill, 1);
        g.fillPoints(
          [
            new Phaser.Geom.Point(topInset, 0),
            new Phaser.Geom.Point(w - topInset, 0),
            new Phaser.Geom.Point(w - botInset, h),
            new Phaser.Geom.Point(botInset, h),
          ],
          true,
        );
        // 左側に縦ハイライト、右側に縦シャドウ(円筒感)
        g.fillStyle(hi, 0.45);
        g.fillRect(topInset, 0, w * 0.22, h);
        g.fillStyle(lo, 0.45);
        g.fillRect(w - botInset - w * 0.18, 0, w * 0.18, h);
        g.fillStyle(accent, 0.85);
        g.fillRect(botInset, h - 3, w - botInset * 2, 3); // 足先の発光
        break;
      }
      case 'sensor': {
        // 小箱 + 一文字の発光アイ + 天面ハイライト。
        g.fillStyle(fill, 1);
        g.fillRoundedRect(0, 0, w, h, 3);
        g.fillStyle(hi, 0.5);
        g.fillRect(w * 0.08, h * 0.1, w * 0.84, h * 0.2);
        g.fillStyle(lo, 0.45);
        g.fillRect(0, h * 0.74, w, h * 0.26);
        g.fillStyle(accent, 0.3);
        g.fillRoundedRect(w * 0.14, h * 0.32, w * 0.72, h * 0.36, 3);
        g.fillStyle(accent, 1);
        g.fillRoundedRect(w * 0.2, h * 0.38, w * 0.6, h * 0.24, 2);
        break;
      }
      case 'barrel': {
        // 横長の砲身(円筒シェーディング) + 先端マズル。
        g.fillStyle(fill, 1);
        g.fillRoundedRect(0, h * 0.12, w, h * 0.76, 3);
        g.fillStyle(hi, 0.5);
        g.fillRect(0, h * 0.18, w, h * 0.18);
        g.fillStyle(lo, 0.5);
        g.fillRect(0, h * 0.64, w, h * 0.22);
        g.fillStyle(accent2, 1);
        g.fillCircle(w - h * 0.4, h / 2, h * 0.28);
        g.fillStyle(accent, 0.9);
        g.fillCircle(w - h * 0.4, h / 2, h * 0.14);
        g.lineStyle(1.5, accent, 0.6);
        g.strokeRoundedRect(0.75, h * 0.12, w - 1.5, h * 0.76, 3);
        break;
      }
      case 'base': {
        // 据置台座(台形)+ 天面ハイライト + 上端発光ライン。
        const inset = w * 0.12;
        g.fillStyle(fill, 1);
        g.fillPoints(
          [
            new Phaser.Geom.Point(inset, 0),
            new Phaser.Geom.Point(w - inset, 0),
            new Phaser.Geom.Point(w, h),
            new Phaser.Geom.Point(0, h),
          ],
          true,
        );
        g.fillStyle(lo, 0.5);
        g.fillRect(0, h * 0.6, w, h * 0.4);
        g.fillStyle(accent, 0.8);
        g.fillRect(inset, 0, w - inset * 2, 2);
        g.fillStyle(accent2, 0.9);
        g.fillCircle(w * 0.5, h * 0.55, Math.max(1.5, h * 0.16));
        break;
      }
      case 'dome': {
        // 半ドーム(旋回部)+ 天面ハイライト + 中央コア。
        const r = Math.min(w / 2, h);
        const radii = { tl: r, tr: r, bl: 4, br: 4 };
        g.fillStyle(fill, 1);
        g.fillRoundedRect(0, h - r, w, r, radii);
        g.fillStyle(hi, 0.5);
        g.fillRoundedRect(w * 0.18, h - r + 2, w * 0.5, r * 0.4, { tl: r * 0.5, tr: r * 0.5, bl: 2, br: 2 });
        g.fillStyle(accent, 0.3);
        g.fillCircle(w / 2, h - r * 0.5, r * 0.5);
        g.fillStyle(accent, 1);
        g.fillCircle(w / 2, h - r * 0.5, r * 0.35);
        g.fillStyle(accent2, 1);
        g.fillCircle(w / 2, h - r * 0.5, r * 0.14);
        break;
      }
      case 'roundedBox':
      default: {
        // 角丸ボディ + 上ハイライト/下シャドウ + 主/副発光のコア。
        const r = Math.min(6, Math.min(w, h) / 3);
        g.fillStyle(fill, 1);
        g.fillRoundedRect(0, 0, w, h, r);
        g.fillStyle(hi, 0.5);
        g.fillRoundedRect(w * 0.1, h * 0.08, w * 0.8, h * 0.24, { tl: r * 0.6, tr: r * 0.6, bl: 2, br: 2 });
        g.fillStyle(lo, 0.45);
        g.fillRoundedRect(w * 0.1, h * 0.72, w * 0.8, h * 0.2, { tl: 2, tr: 2, bl: r * 0.6, br: r * 0.6 });
        // 胴中央の発光コア(主) + 副リング。w がある程度大きい時のみ。
        if (w >= 14 && h >= 12) {
          const cr = Math.max(2, Math.min(w, h) * 0.16);
          g.fillStyle(accent2, 0.35);
          g.fillCircle(w / 2, h * 0.52, cr + 2);
          g.fillStyle(accent, 1);
          g.fillCircle(w / 2, h * 0.52, cr);
        }
        g.lineStyle(1.5, accent, 0.55);
        g.strokeRoundedRect(0.75, 0.75, w - 1.5, h - 1.5, r);
        break;
      }
    }

    g.generateTexture(spec.key, w, h);
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

  /**
   * ミサイル弾: 正方テクスチャ内に弾頭(上)+ 機体 + 噴射炎(下)の縦長シルエットを描く。
   * 放物線で降り注ぐ見た目を、丸い通常弾と一目で区別させる。body/flame は機体色/炎色。
   */
  private makeMissile(key: string, size: number, body: number, flame: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const w = size * 0.5; // 機体幅(縦長にするため横は細い)
    const cx = size / 2;
    const left = cx - w / 2;
    // 噴射炎のハロ(下半分)
    g.fillStyle(flame, 0.3);
    g.fillCircle(cx, size * 0.82, w * 0.9);
    // 機体(角丸の縦長ボディ)
    g.fillStyle(body, 1);
    g.fillRoundedRect(left, size * 0.18, w, size * 0.62, w * 0.4);
    // 弾頭(上端の三角)
    g.fillStyle(this.shade(body, 0.3), 1);
    g.fillTriangle(left, size * 0.3, left + w, size * 0.3, cx, size * 0.02);
    // 噴射炎(下端のコア)
    g.fillStyle(flame, 1);
    g.fillTriangle(left + w * 0.15, size * 0.74, left + w * 0.85, size * 0.74, cx, size * 0.98);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  /**
   * 梯子の 1 タイル: 左右の支柱 + 中央の桟(横棒)。縦へタイル繰り返しで連続して見えるよう、
   * 支柱は上下端まで描き、桟はタイル中央に 1 本置く。
   */
  private makeLadder(key: string, w: number, h: number, body: number, edge: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const railW = Math.max(3, w * 0.16);
    // 左右の支柱(縦)
    g.fillStyle(body, 1);
    g.fillRect(w * 0.14, 0, railW, h);
    g.fillRect(w - w * 0.14 - railW, 0, railW, h);
    // 支柱の発光エッジ
    g.fillStyle(edge, 0.7);
    g.fillRect(w * 0.14, 0, railW, h);
    g.fillStyle(body, 1);
    g.fillRect(w * 0.14 + 1, 0, Math.max(1, railW - 2), h);
    g.fillRect(w - w * 0.14 - railW + 1, 0, Math.max(1, railW - 2), h);
    // 中央の桟(横棒・発光)
    const rungH = Math.max(3, h * 0.18);
    g.fillStyle(edge, 0.9);
    g.fillRect(w * 0.14, h / 2 - rungH / 2, w - w * 0.28, rungH);
    g.generateTexture(key, w, h);
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
