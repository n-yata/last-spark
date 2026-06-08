// ゲームのチューニング値(難易度・手触り)の集中管理。
// マジックナンバーをコードに散らさず、ここに集約する。

export const PLAYER = {
  maxHp: 16,
  moveSpeed: 160, // px/s
  jumpVelocity: -420, // px/s(上向き負)
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
  lifespanMs: 1400, // 画面外まで届く前に自動回収する寿命
} as const;

export const ENEMY = {
  walker: {
    hp: 2,
    contactDamage: 2,
    moveSpeed: 60,
    width: 30,
    height: 30,
  },
  turret: {
    hp: 3,
    contactDamage: 2,
    shootIntervalMs: 1600,
    bulletSpeed: 220,
    bulletDamage: 2,
    width: 32,
    height: 32,
  },
} as const;

export const BOSS = {
  maxHp: 40,
  phase2HpRatio: 0.5, // この比率以下で phase2 へ移行
  contactDamage: 3,
  bulletDamage: 2,
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
