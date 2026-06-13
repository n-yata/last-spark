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
  projectileMissile: 'tex-projectile-missile',
  ground: 'tex-ground',
  platform: 'tex-platform',
  ladder: 'tex-ladder',
  hit: 'tex-hit',
  spark: 'tex-spark',
  logo: 'tex-logo-spark',
  pixel: 'tex-pixel',
} as const;

export type TextureKey = (typeof TEX)[keyof typeof TEX];

// 演出シーン(CutsceneScene)の背景静止画キー。プレースホルダのシルエットと違い、
// これらは public/assets/cutscenes/ の SVG を PreloadScene が load.svg で読み込む。
// scriptKey ごとに 1 枚。Stage 4-6 の演出を足す際はここへキーを追加する。
export const CUTSCENE_TEX = {
  stage1Intro: 'tex-cutscene-stage1-intro',
  stage3Rescue: 'tex-cutscene-stage3-rescue',
  stage4Intro: 'tex-cutscene-stage4-intro',
  stage5Intro: 'tex-cutscene-stage5-intro',
  stage6Ending: 'tex-cutscene-stage6-ending',
} as const;

// scriptKey(cutscenes.ts の key) と背景テクスチャの対応。CutsceneScene が参照する。
export const CUTSCENE_BACKGROUND: Record<string, string> = {
  'stage1-intro': CUTSCENE_TEX.stage1Intro,
  'stage3-rescue': CUTSCENE_TEX.stage3Rescue,
  'stage4-intro': CUTSCENE_TEX.stage4Intro,
  'stage5-intro': CUTSCENE_TEX.stage5Intro,
  'stage6-ending': CUTSCENE_TEX.stage6Ending,
};

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
  bossFlying: {
    head: 'part-bossflying-head',
    core: 'part-bossflying-core',
    wingBack: 'part-bossflying-wingback',
    wingFront: 'part-bossflying-wingfront',
    cannon: 'part-bossflying-cannon',
  },
  bossWarden: {
    head: 'part-bosswarden-head',
    torso: 'part-bosswarden-torso',
    pauldron: 'part-bosswarden-pauldron',
    armBack: 'part-bosswarden-armback',
    armFront: 'part-bosswarden-clamp',
    legBack: 'part-bosswarden-legback',
    legFront: 'part-bosswarden-legfront',
  },
} as const;
