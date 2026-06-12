// 演出(ジュース)のチューニング値の集中管理。
// balance.ts と同じ方針で、シェイク強度・ヒットストップ時間・フェード時間などの
// マジックナンバーをロジックに散らさず、ここに集約する。

export const EFFECTS = {
  /** 撃破パーティクル爆発。small=雑魚、boss=ボス撃破シーケンスの1バースト分。 */
  explosion: {
    small: {
      count: 14,
      speedMin: 60,
      speedMax: 220,
      lifespanMs: 450,
      scaleStart: 1.2,
    },
    boss: {
      count: 22,
      speedMin: 90,
      speedMax: 320,
      lifespanMs: 650,
      scaleStart: 1.8,
    },
    /** emitter の後始末待ち余白。寿命満了後に destroy する遅延(ms)。 */
    cleanupMarginMs: 100,
  },

  /** カメラシェイク。intensity は Phaser の shake 強度(画面比)。 */
  shake: {
    playerDamage: { durationMs: 120, intensity: 0.008 },
    bossDefeat: { durationMs: 700, intensity: 0.012 },
  },

  /** ヒットストップ(物理一時停止)。短く留めて爽快感のみ残す。 */
  hitStop: {
    /** チャージ弾が命中した時 */
    chargedHitMs: 70,
    /** ボス撃破の瞬間 */
    bossDefeatMs: 140,
  },

  /** 被弾時のリグ白フラッシュ(setTintFill)。 */
  hitFlash: {
    color: 0xffffff,
    durationMs: 90,
  },

  /** リグの一過性モーション(CharacterRig)。 */
  rig: {
    /** 発射リコイルの継続時間 */
    attackRecoilMs: 220,
    /** 被弾のけぞりの継続時間 */
    hitLeanMs: 200,
  },

  /** プレイヤー被弾時の画面赤フラッシュ(camera.flash)。 */
  damageFlash: {
    durationMs: 180,
    red: 255,
    green: 45,
    blue: 85,
  },

  /** シーン遷移フェード。 */
  fade: {
    inMs: 280,
    outMs: 260,
  },

  /** HUD 演出。 */
  hud: {
    /** 被ダメ時に失ったライフセグメントを点滅させる時間 */
    lifeBarFlashMs: 450,
    /** 点滅の明滅間隔 */
    lifeBarBlinkIntervalMs: 90,
    /** ボス HP バー出現時の 0→満タンフィル時間 */
    bossBarFillMs: 900,
  },

  /** タッチ仮想ボタンの押下フィードバック。 */
  touch: {
    /** 押下中の塗りアルファ(通常 0.12) */
    pressedFillAlpha: 0.4,
    /** 押下中の半径倍率(指の外周からも視認できるよう広げる) */
    pressedRadiusScale: 1.15,
  },

  /** ボス撃破シーケンス(多段爆発)。 */
  bossDeath: {
    /** 爆発バースト回数 */
    burstCount: 6,
    /** バースト間隔 */
    burstIntervalMs: 180,
    /** ボス中心からの爆発位置の散らばり(±px) */
    spreadPx: 56,
    /** 最終バースト後、クリア遷移までの余韻 */
    endDelayMs: 350,
  },
} as const;
