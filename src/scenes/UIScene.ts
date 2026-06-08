import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { HUD } from '../config/registryKeys';
import { LifeBar } from '../ui/LifeBar';
import { BossHpBar } from '../ui/BossHpBar';
import { ChargeGauge } from '../ui/ChargeGauge';
import { TouchControls } from '../ui/TouchControls';

// HUD(ライフ/ボスHP/チャージゲージ)+ タッチ操作ガイド。GameScene と並行起動。
// 状態は registry 経由で受け取り、GameScene を直接参照しない。

export class UIScene extends Phaser.Scene {
  private lifeBar!: LifeBar;
  private bossHpBar!: BossHpBar;
  private chargeGauge!: ChargeGauge;
  private bossShown = false;

  constructor() {
    super({ key: SCENE_KEYS.ui, active: false });
  }

  create(): void {
    this.lifeBar = new LifeBar(this);
    this.bossHpBar = new BossHpBar(this);
    this.chargeGauge = new ChargeGauge(this);
    new TouchControls(this);
    this.bossShown = false;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.lifeBar.destroy();
      this.bossHpBar.destroy();
      this.chargeGauge.destroy();
    });
  }

  override update(): void {
    const reg = this.registry;
    const hp = (reg.get(HUD.playerHp) as number) ?? 0;
    const maxHp = (reg.get(HUD.playerMaxHp) as number) ?? 0;
    this.lifeBar.render(hp, maxHp);

    const ratio = (reg.get(HUD.chargeRatio) as number) ?? 0;
    this.chargeGauge.render(ratio);

    const bossActive = (reg.get(HUD.bossActive) as boolean) ?? false;
    if (bossActive && !this.bossShown) {
      this.bossShown = true;
      this.bossHpBar.show();
    }
    if (bossActive) {
      const bossHp = (reg.get(HUD.bossHp) as number) ?? 0;
      const bossMaxHp = (reg.get(HUD.bossMaxHp) as number) ?? 1;
      this.bossHpBar.render(bossHp, bossMaxHp);
    }
  }
}
