import Phaser from 'phaser';
import { SHADOW_RAY } from '../config/balance';
import { Boss } from './Boss';

// hard mode 専用・ECLIPSE 撃破後の裏ボス。RAY と同寸法の影型ボス。
export class ShadowRayBoss extends Boss {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      config: SHADOW_RAY,
      rigFamily: 'bossShadowRay',
      gravity: true,
    });
  }
}
