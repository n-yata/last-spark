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
    absorb: { durationMs: 70, intensity: 0.004 },
    enemyKill: { durationMs: 90, intensity: 0.006 }, // 雑魚撃破の小さな手応え
    bossDefeat: { durationMs: 700, intensity: 0.012 },
  },

  /** 着弾火花(弾が命中した瞬間の放射状スパーク)。撃破前の通常ヒットでも出して手応えを出す。 */
  impactSpark: {
    count: 8,
    speedMin: 80,
    speedMax: 260,
    lifespanMs: 320,
    scaleStart: 0.9,
  },

  /** チャージ吸収成功時の小スパーク。 */
  absorbSpark: {
    count: 10,
    speedMin: 40,
    speedMax: 180,
    lifespanMs: 280,
    scaleStart: 0.85,
  },

  /** 発射時のマズルフラッシュ(銃口の閃光+前方スパーク)。 */
  muzzle: {
    /** 閃光スプライト(TEX.hit)の初期スケールと寿命。 */
    flashScale: 1.4,
    flashMs: 110,
    /** 前方へ飛ぶ火花の数と速度。 */
    sparkCount: 5,
    sparkSpeedMin: 120,
    sparkSpeedMax: 300,
    sparkLifespanMs: 260,
    /** チャージ弾はフラッシュを大きく。 */
    chargedScaleMul: 1.8,
  },

  /** 環境パーティクル(空気感): カメラ可視域に漂う塵/火の粉。ステージのアクセント色で発光。 */
  ambient: {
    /** 発生間隔(ms)。小さいほど密。可視域に常時十数〜数十個漂う密度。 */
    frequencyMs: 45,
    lifespanMs: 4200,
    /** ゆっくり漂う速度。 */
    speedMin: 5,
    speedMax: 26,
    /** 上方向へのドリフト(火の粉が立ち上る)。 */
    gravityY: -12,
    scaleMin: 0.3,
    scaleMax: 0.8,
    alphaPeak: 0.7,
  },

  /**
   * ヒットストップ(物理一時停止)。ワールド全体が止まりプレイヤーの操作感にも
   * 影響するため、戦闘が終わるボス撃破の瞬間のみに限定する。
   */
  hitStop: {
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
    /** チャージ完了リングの発光パルス周期 */
    chargeFullPulseMs: 720,
    /** チャージ完了リングの最小/最大アルファ */
    chargeFullPulseAlphaMin: 0.35,
    chargeFullPulseAlphaMax: 0.85,
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
