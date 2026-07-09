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
    bossHit: { durationMs: 70, intensity: 0.0042 },
    landingSoft: { durationMs: 70, intensity: 0.0028 },
    landingHard: { durationMs: 110, intensity: 0.0052 },
    bossDefeat: { durationMs: 700, intensity: 0.012 },
  },

  /** 着弾火花(弾が命中した瞬間の放射状スパーク)。撃破前の通常ヒットでも出して手応えを出す。 */
  impactSpark: {
    count: 8,
    speedMin: 80,
    speedMax: 260,
    lifespanMs: 320,
    scaleStart: 0.9,
    bossCountMul: 1.5,
    bossScaleMul: 1.35,
    bossSpeedMul: 1.18,
  },

  /** チャージ吸収成功時の小スパーク。 */
  absorbSpark: {
    count: 10,
    speedMin: 40,
    speedMax: 180,
    lifespanMs: 280,
    scaleStart: 0.85,
  },

  /** 高所着地のダスト/着地感。 */
  landing: {
    dustCount: 10,
    dustSpeedMin: 40,
    dustSpeedMax: 190,
    lifespanMs: 340,
    scaleStart: 0.95,
    hardScaleMul: 1.35,
  },

  /** プレイヤー被弾時の短い画面フラッシュ。視認性を壊さないよう淡く短く出す。 */
  playerDamageFlash: {
    alpha: 0.22,
    durationMs: 95,
    color: 0xf4f8ff,
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

  /**
   * 強化ビーム(RAY 強化 stage6 のチャージ攻撃=持続レーザー)の発射演出。
   * 最上位アクションとして、通常チャージ弾のマズルフラッシュより強い手応えを出す
   * (収束リングの予兆 → 大きなマズル閃光 → 前方バースト → 軽いシェイク)。
   */
  beamFire: {
    /** ビーム色基調(シアン〜白)。Beam 本体の BEAM_COLOR と揃える。 */
    color: 0x9ffff0,
    /** マズル閃光(TEX.hit)の初期スケールと寿命。charged の実効(1.4*1.8=2.52)より強い。 */
    flashScale: 3.0,
    flashMs: 150,
    /** 収束リング(TEX.hit を内側へ潰す implode)の開始スケールと尺。発射の予兆。 */
    ringScaleStart: 2.6,
    ringMs: 130,
    /** 前方バースト(TEX.spark)。muzzle(5発)より多く・速くして噴出感を出す。 */
    sparkCount: 14,
    sparkSpeedMin: 160,
    sparkSpeedMax: 420,
    sparkLifespanMs: 300,
    /** 前方バーストの広がり(基準角からの ±度)。 */
    sparkSpreadDeg: 30,
    // カメラシェイクは持たない: 持続ビームは押下中ずっと発射状態のため、揺らすと画面が暴れ続ける。
  },

  /**
   * 強化ビーム「帯本体」の多層描画(Beam.ts)。単色矩形1枚の「ただの線」を、
   * 外周グロー + 本体 + 明るいコア + 脈動の発光体にして最上位アクションの迫力を出す。
   * 当たり判定(本体矩形の Arcade body)サイズ・座標は不変で、見た目だけを足す。
   */
  beam: {
    /** 本体・グローの色(Beam 本体 BEAM_COLOR と揃える)。 */
    color: 0x9ffff0,
    /** 内側コアの色(白熱した中心)。 */
    coreColor: 0xffffff,
    /** 外周グローの太さ倍率(本体太さ basis)。本体より太く、淡く滲ませる。 */
    glowThicknessMul: 2.4,
    /** 内側コアの太さ倍率。本体より細く、強い中心線にする。 */
    coreThicknessMul: 0.4,
    /**
     * 各レイヤーのピークアルファ(フェードの to 値)。ADD 合成で重なると明るくなるため、
     * 眩しすぎないよう抑えめにする(coreAlpha >= bodyAlpha > glowAlpha の序列は維持)。
     */
    bodyAlpha: 0.5,
    glowAlpha: 0.2,
    coreAlpha: 0.7,
    /** フェードイン/アウトの片道尺(ms)。本体の発光立ち上がり/収束と揃える。 */
    fadeMs: 90,
    /** コアの太さ脈動(scaleY を min↔max で yoyo ループ)。素早い明滅でエネルギー感を出す。 */
    corePulseMs: 130,
    corePulseMin: 0.7,
    corePulseMax: 1.35,
    /** グローのゆっくりした呼吸(scaleY を min↔max で yoyo)。淡い外周がうねる。 */
    glowPulseMs: 420,
    glowPulseScaleMin: 1.0,
    glowPulseScaleMax: 1.18,
    /**
     * 光の粉(TEX.spark): ビーム軸に沿って継続発生し、ふわっと舞って消える粒子。
     * 「ただの直線」感を払拭する。当たり判定とは無関係の見た目専用。
     */
    dustFrequencyMs: 26, // 発生間隔(小さいほど密)。継続ストリーム。
    dustQuantity: 1, // 1 発生あたりの粒子数
    dustLifespanMs: 540, // 1 粒の寿命
    dustSpeedMin: 8, // ふわっと漂う最小速度
    dustSpeedMax: 40, // 同 最大速度
    dustScaleStart: 0.5, // 開始スケール(end は 0 へ縮小)
    dustAlphaStart: 0.5, // 開始アルファ(end は 0 へフェード)
    dustSpreadYMul: 1.7, // emitZone の縦幅 = beamThickness × これ(帯の少し外まで湧かせる)
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

  /** ボス登場/フェーズ移行の画面演出。 */
  bossPresentation: {
    introMs: 850,
    introBandHeight: 52,
    introBandAlpha: 0.24,
    introFlashAlpha: 0.58,
    introOverlayAlpha: 0.12,
    phaseShiftDurationMs: 320,
    phaseShiftFlashAlpha: 0.2,
    phaseShiftRingRadiusStart: 24,
    phaseShiftRingRadiusEnd: 120,
    phaseShiftRingStroke: 5,
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
    /** ボス HP バー残像(琥珀)の1フレームあたり減衰量(比率) */
    bossBarLagDrainPerFrame: 0.012,
    /** ライフバー残像(琥珀ゴースト)の1フレームあたり減衰量(比率)。ボスよりやや遅く読ませる */
    lifeBarLagDrainPerFrame: 0.01,
    /** 危機(HP25%以下)時のパネル枠警告パルス周期と最小/最大アルファ */
    criticalPulseMs: 900,
    criticalPulseAlphaMin: 0.25,
    criticalPulseAlphaMax: 0.85,
  },

  /** タイトル画面の演出。 */
  title: {
    /** 漂う光の粒(残り火)の数 */
    moteCount: 14,
    /** ロゴのスパーク明滅の下限アルファ(可読性を保つため完全には消えない) */
    flickerMinAlpha: 0.55,
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
