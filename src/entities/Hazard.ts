import Phaser from 'phaser';
import { HAZARD } from '../config/balance';
import { shouldHazardTick } from '../systems/hazardRules';

// ダメージ床(stage4 汚染地帯の汚染溜まり)。人間の環境破壊が残した荒廃=死んだ世界そのもので、
// 誰かの殺意の罠ではない。腐食性の汚染が機械の RAY も蝕む。プレイヤーが触れている間、一定間隔
// (pollutionTickMs)でダメージを与える静的なハザード。物理はオーバーラップ判定のみ(衝突なし・
// 重力なし)で、落下死の奈落と違い「上に乗れる/歩いて渡れる/ジャンプで越えられる」スリップ
// ダメージの床として振る舞う。見た目は汚染トーンと地続きの半透明の矩形(ゆっくり脈打つ)。
//
// 実装メモ(重要): 見た目を Phaser.GameObjects.Rectangle で持つ(scale=1)。1x1 テクスチャの Sprite を
// setDisplaySize で引き伸ばすと、Arcade Body が body.width = sourceWidth × scaleX に膨張し
// (例: 幅 68px 表示で body 幅 68×68=4624px)、当たり判定がステージ全域を覆って「どこにいても
// 継続ダメージ=クリア不能」になる。Rectangle は width/height をネイティブに持ち、body がそのサイズに
// 一致するためこの落とし穴を避けられる(GameScene.addArenaWall と同じ実績パターン)。

const POLLUTION_TINT = 0xaef03a; // 汚染霧弾(projectilePollution)と同系。汚染トーン(背景 #151a0c)と地続き。

export class Hazard extends Phaser.GameObjects.Rectangle {
  /** 直近にダメージを発火した時刻(ms)。pollutionTickMs 経過まで再発火しない。 */
  private lastHitAt = -Infinity;

  constructor(scene: Phaser.Scene, rect: { x: number; y: number; width: number; height: number }) {
    // rect は左上基準。Rectangle の中心へ変換して配置する(width/height はネイティブ・scale=1)。
    super(scene, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, POLLUTION_TINT, 1);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.configureBody();

    // 汚染色の半透明で「汚染溜まり」にする。危険を明示するため、ゆっくり脈打たせる(汚染が滲む表現)。
    this.setAlpha(0.5).setDepth(4);
    scene.tweens.add({
      targets: this,
      alpha: { from: 0.35, to: 0.6 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /**
   * 物理ボディを「重力を受けない静止オブジェクト」に設定する。
   * 注意: Arcade の `Group.add()` はグループ既定値(重力ON/可動)でボディ設定を上書きするため、
   * GameScene はグループ追加後に本メソッドを再適用する(Enemy と同様)。
   * Rectangle は scale=1 なので body サイズは width/height に一致する(明示の setSize は不要)。
   */
  configureBody(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
  }

  /**
   * クールダウン(pollutionTickMs)が経過していればダメージ発火を許可し、true を返して発火時刻を
   * 更新する。経過前は false(多重ヒット防止)。overlap が毎フレーム呼ぶ前提。
   */
  tryHit(now: number): boolean {
    if (!shouldHazardTick(this.lastHitAt, now, HAZARD.pollutionTickMs)) return false;
    this.lastHitAt = now;
    return true;
  }
}
