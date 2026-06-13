import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys';
import { HUD } from '../config/registryKeys';
import { LifeBar } from '../ui/LifeBar';
import { BossHpBar } from '../ui/BossHpBar';
import { ChargeGauge } from '../ui/ChargeGauge';
import { TouchControls } from '../ui/TouchControls';
import { MovePad } from '../ui/MovePad';
import { StoryOverlay } from '../ui/StoryOverlay';
import { createTouchLayout } from '../config/touchLayout';
import { resolveControlBand } from '../config/controlBand';
import { STORY_EVENT } from '../config/storyEvents';
import type { TextRequest } from '../types/story';

// HUD(ライフ/ボスHP/チャージゲージ)+ タッチ操作ガイド。GameScene と並行起動。
// 状態は registry 経由で受け取り、GameScene を直接参照しない。

export class UIScene extends Phaser.Scene {
  private lifeBar!: LifeBar;
  private bossHpBar!: BossHpBar;
  private chargeGauge!: ChargeGauge;
  private movePad!: MovePad;
  private touchControls!: TouchControls;
  private storyOverlay!: StoryOverlay;
  private bossShown = false;

  constructor() {
    super({ key: SCENE_KEYS.ui, active: false });
  }

  create(): void {
    this.lifeBar = new LifeBar(this);
    this.bossHpBar = new BossHpBar(this);
    this.chargeGauge = new ChargeGauge(this);
    this.movePad = new MovePad(this);
    this.touchControls = new TouchControls(this);
    this.storyOverlay = new StoryOverlay(this);
    this.bossShown = false;

    // GameScene からの表示要求を受けてオーバーレイへ積む(game レベルのイベント)。
    const onStory = (requests: TextRequest[]): void => this.storyOverlay.enqueue(requests);
    this.game.events.on(STORY_EVENT.show, onStory);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(STORY_EVENT.show, onStory);
      this.lifeBar.destroy();
      this.bossHpBar.destroy();
      this.chargeGauge.destroy();
      this.movePad.destroy();
      this.touchControls.destroy();
      this.storyOverlay.destroy();
    });
  }

  override update(): void {
    const reg = this.registry;
    const band = resolveControlBand(this);
    const layout = createTouchLayout(this.scale.width, this.scale.height, band);
    const shootHeld = (reg.get(HUD.shootHeld) as boolean) ?? false;
    const jumpHeld = (reg.get(HUD.jumpHeld) as boolean) ?? false;
    this.touchControls.render(layout, this.scale.width, this.scale.height, band, shootHeld, jumpHeld);

    const hp = (reg.get(HUD.playerHp) as number) ?? 0;
    const maxHp = (reg.get(HUD.playerMaxHp) as number) ?? 0;
    this.lifeBar.render(hp, maxHp, this.time.now);

    const ratio = (reg.get(HUD.chargeRatio) as number) ?? 0;
    this.chargeGauge.render(ratio, layout.shootButton);

    const padActive = (reg.get(HUD.movePadActive) as boolean) ?? false;
    this.movePad.render(
      padActive,
      (reg.get(HUD.movePadBaseX) as number) ?? 0,
      (reg.get(HUD.movePadBaseY) as number) ?? 0,
      (reg.get(HUD.movePadCurX) as number) ?? 0,
      (reg.get(HUD.movePadCurY) as number) ?? 0,
    );

    const bossActive = (reg.get(HUD.bossActive) as boolean) ?? false;
    if (bossActive && !this.bossShown) {
      this.bossShown = true;
      this.bossHpBar.show();
    }
    if (bossActive) {
      const bossHp = (reg.get(HUD.bossHp) as number) ?? 0;
      const bossMaxHp = (reg.get(HUD.bossMaxHp) as number) ?? 1;
      this.bossHpBar.render(bossHp, bossMaxHp, this.time.now);
    }
  }
}
