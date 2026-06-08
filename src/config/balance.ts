// ゲームのチューニング値(難易度・手触り)の集中管理。
// マジックナンバーをコードに散らさず、ここに集約する。

export const PLAYER = {
  maxHp: 16,
  moveSpeed: 160, // px/s
  // 上向き負。押し続けた場合の最高到達点 ≈ jumpVelocity^2 / (2 * gravityY)。
  // -620 / 重力1200 で約160px 上昇し、ステージの段差(最大140px)・奈落の中継足場(120px)に届く。
  jumpVelocity: -620, // px/s(最大ジャンプ初速)
  // 可変ジャンプ: ボタンを離した瞬間に上昇中なら上向き速度をこの倍率にカットする。
  // 短押し=低いジャンプ(約40px)、押し続け=最大(約160px)。押している長さで高さが変わる。
  jumpCutMultiplier: 0.5,
  invincibleMs: 800, // 被弾後の無敵時間
  blinkIntervalMs: 80, // 無敵中の点滅間隔
  width: 28,
  height: 40,
} as const;

export const SHOT = {
  normalDamage: 1,
  chargedDamage: 3,
  chargeThresholdMs: 600, // この長さ以上の長押しでチャージ成立
  normalSpeed: 420,
  chargedSpeed: 480,
  cooldownMs: 180, // 連射間隔
  normalSize: 8,
  chargedSize: 18,
  // 弾の寿命。射程 = speed × lifespan。ボス戦の間合い(アリーナ幅)で弾が届くよう確保する。
  lifespanMs: 2400,
} as const;

export const ENEMY = {
  walker: {
    hp: 2,
    contactDamage: 1,
    moveSpeed: 60,
    width: 30,
    height: 30,
  },
  turret: {
    hp: 3,
    contactDamage: 1,
    shootIntervalMs: 1600,
    bulletSpeed: 220,
    bulletDamage: 1,
    width: 32,
    height: 32,
  },
} as const;

export const BOSS = {
  maxHp: 24,
  phase2HpRatio: 0.5, // この比率以下で phase2 へ移行
  contactDamage: 2,
  bulletDamage: 1,
  bulletSpeed: 260,
  moveSpeed: 90,
  chargeSpeed: 340, // phase2 の突進速度
  staggerDamageThreshold: 8, // 連続被ダメ蓄積でのけぞる量
  width: 80,
  height: 88,
  // アクション継続時間(ms)
  actionDurationMs: {
    idle: 700,
    move: 900,
    shoot: 600,
    charge: 800,
    stagger: 700,
  },
  // phase2 ではアクション間隔を短縮する係数
  phase2SpeedFactor: 0.7,
} as const;

export const STAGE = {
  width: 5200, // ステージ全長(px)
  height: 540,
  groundY: 480, // 地面の上端 Y
  deathY: 600, // この Y を超えたら落下死
  gravityY: 1200,
} as const;
