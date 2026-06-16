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
  // stage4 環境管理機(浄化型)が「浄化」の名目で撒く汚染霧スプレー専用。汚染トーン(背景 #151a0c)と地続き。
  projectilePollution: 'tex-projectile-pollution',
  projectileMissile: 'tex-projectile-missile',
  // stage5 使者(ENVOY)が放つ高速槍弾。冷たい白青の鋭い槍シルエットで通常弾と差別化する。
  projectileLance: 'tex-projectile-lance',
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
// これらは public/assets/cutscenes/ の外部生成キービジュアル(WebP)を PreloadScene が
// load.image で読み込む(全6カットシーンをWebPに統一)。scriptKey ごとに 1 枚。
// Stage 追加時はここへキーを追加する。
export const CUTSCENE_TEX = {
  stage1Intro: 'tex-cutscene-stage1-intro',
  stage3Rescue: 'tex-cutscene-stage3-rescue',
  stage4Intro: 'tex-cutscene-stage4-intro',
  stage5Intro: 'tex-cutscene-stage5-intro',
  stage6Awakening: 'tex-cutscene-stage6-awakening',
  stage6Ending: 'tex-cutscene-stage6-ending',
} as const;

// scriptKey(cutscenes.ts の key) と背景テクスチャの対応。CutsceneScene が参照する。
export const CUTSCENE_BACKGROUND: Record<string, string> = {
  'stage1-intro': CUTSCENE_TEX.stage1Intro,
  'stage3-rescue': CUTSCENE_TEX.stage3Rescue,
  'stage4-intro': CUTSCENE_TEX.stage4Intro,
  'stage5-intro': CUTSCENE_TEX.stage5Intro,
  'stage6-awakening': CUTSCENE_TEX.stage6Awakening,
  'stage6-ending': CUTSCENE_TEX.stage6Ending,
};

// タイトル画面の背景静止画キー。CUTSCENE_TEX(SVGベクター)と違い、これは
// public/assets/title/ のラスター画像(WebP)を PreloadScene が load.image で読み込む。
// 未ロード時は TitleScene が従来の簡易シルエット背景へフォールバックする。
export const TITLE_TEX = {
  background: 'tex-title-background',
} as const;

// プレイヤー RAY の外部生成キービジュアル(横向き)を切り分けたカットアウト・リグ用パーツ。
// public/assets/characters/parts/ の WebP を load.image で読み、SpriteRig が組み立てて
// 関節歩行させる(手続き PART.player に替わるプレイヤー専用の見た目)。geometry は config/raySprite。
export const RAY_SPRITE = {
  body: 'tex-ray-body',
  armFront: 'tex-ray-arm-front',
  legFront: 'tex-ray-leg-front',
  legBack: 'tex-ray-leg-back',
} as const;

// ステージ背景の多層パララックス画像キー。far=遠景(横タイル)、mid=中景(全幅)。
// public/assets/stages/ の WebP を PreloadScene が load.image で読み、backgroundPainter が敷く。
// 未生成/未ロードのステージは従来の手続きシルエット背景へフォールバックする(段階導入)。
export const STAGE_BG_TEX: Record<string, { far: string; mid: string }> = {
  stage1: { far: 'tex-bg-stage1-far', mid: 'tex-bg-stage1-mid' },
  stage2: { far: 'tex-bg-stage2-far', mid: 'tex-bg-stage2-mid' },
  stage3: { far: 'tex-bg-stage3-far', mid: 'tex-bg-stage3-mid' },
  stage4: { far: 'tex-bg-stage4-far', mid: 'tex-bg-stage4-mid' },
  stage5: { far: 'tex-bg-stage5-far', mid: 'tex-bg-stage5-mid' },
  stage6: { far: 'tex-bg-stage6-far', mid: 'tex-bg-stage6-mid' },
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
  // stage5 使者(ENVOY): スリムな槍/矢じり型の流線機体。後退翼 + 紡錘形コア +
  // 前方へ突き出た槍(barrel) + 鋭い単眼(cyclops)。飛行ボス(単眼+ウィング)と別シルエット。
  bossEnvoy: {
    wingBack: 'part-bossenvoy-wingback',
    wingFront: 'part-bossenvoy-wingfront',
    core: 'part-bossenvoy-core',
    spear: 'part-bossenvoy-spear',
    head: 'part-bossenvoy-head',
  },
  // stage4 環境管理機(PURIFIER): 背中に巨大な汚染タンクを背負った接地機。幅広胴 + 太短脚 +
  // 低い作業頭(sensor) + 散布ノズル(cannon)。戦闘用ヘルメット+キャノンの 'boss' とは別人格。
  bossPurifier: {
    tank: 'part-bosspurifier-tank',
    torso: 'part-bosspurifier-torso',
    head: 'part-bosspurifier-head',
    nozzle: 'part-bosspurifier-nozzle',
    legBack: 'part-bosspurifier-legback',
    legFront: 'part-bosspurifier-legfront',
  },
} as const;
