// 生成テクスチャ/アニメーションのキー定数。
// MVP では PreloadScene が Graphics で生成するプレースホルダのキー。
// 将来テクスチャアトラスへ差し替える際もキー名を維持できるよう一元管理する。

export const TEX = {
  player: 'tex-player',
  enemyWalker: 'tex-enemy-walker',
  enemyTurret: 'tex-enemy-turret',
  boss: 'tex-boss',
  projectileNormal: 'tex-projectile-normal',
  projectileCharged: 'tex-projectile-charged',
  projectileEnemy: 'tex-projectile-enemy',
  ground: 'tex-ground',
  platform: 'tex-platform',
  hit: 'tex-hit',
  logo: 'tex-logo-spark',
  pixel: 'tex-pixel',
} as const;

export type TextureKey = (typeof TEX)[keyof typeof TEX];
