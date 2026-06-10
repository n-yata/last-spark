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

// キャラのパーツ(関節)テクスチャキー。CharacterRig が組み立て、PreloadScene が
// characterRig 定義に基づいて手続き生成する。系統(player/walker/turret/boss)ごとに
// 必要なパーツのみを持つ。将来のアトラス差し替え時もここを単一変更点とする。
export const PART = {
  player: {
    head: 'part-player-head',
    torso: 'part-player-torso',
    armBack: 'part-player-armback',
    armFront: 'part-player-cannon',
    legBack: 'part-player-legback',
    legFront: 'part-player-legfront',
  },
  walker: {
    head: 'part-walker-head',
    torso: 'part-walker-torso',
    legBack: 'part-walker-legback',
    legFront: 'part-walker-legfront',
  },
  turret: {
    base: 'part-turret-base',
    dome: 'part-turret-dome',
    barrel: 'part-turret-barrel',
  },
  boss: {
    head: 'part-boss-head',
    torso: 'part-boss-torso',
    armBack: 'part-boss-armback',
    armFront: 'part-boss-cannon',
    legBack: 'part-boss-legback',
    legFront: 'part-boss-legfront',
  },
} as const;
