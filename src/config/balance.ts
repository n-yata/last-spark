// ゲームのチューニング値(難易度・手触り)の集中管理。
// マジックナンバーをコードに散らさず、ここに集約する。

import type { BossAction } from '../types/boss';

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
  chargeThresholdMs: 600, // チャージ開始からこの長さでチャージ弾が成立
  // ショットボタンをこの時間以上押し続けたら「長押し=通常弾の連射」とみなす。
  // チャージ成立しきい値より十分短くし、タップ(チャージ)と長押し(連射)を判別する。
  holdToAutoFireMs: 200,
  // 長押し連射のバースト制御: burstSize 発撃つごとに burstPauseMs の小休止を挟む
  // (撃ち放題にせず、連射にリズムを与える)。
  burstSize: 5,
  burstPauseMs: 450,
  normalSpeed: 420,
  chargedSpeed: 480,
  cooldownMs: 180, // 連射間隔(バースト内の発射間隔)
  normalSize: 8,
  chargedSize: 18,
  // 弾の寿命。射程 = speed × lifespan。ボス戦の間合い(アリーナ幅)で弾が届くよう確保する。
  lifespanMs: 2400,
  // --- ミサイル(stage3 収容番人の放物線弾) ---
  // 通常弾より重いダメージ・大きい見た目。launchSpeed は発射時の上向き初速(px/s)で、
  // 重力(STAGE.gravityY)を受けて弧を描き、着弾点(水平速度)は WardenBoss が逆算する。
  missileDamage: 2,
  missileSize: 14,
  missileLaunchSpeed: 520,
  // --- 槍弾(stage5 使者の高速槍弾) ---
  // 任意角度へ高速で飛ぶ非貫通の槍。lance は ENVOY 専用アクションのため、この値の変更は stage5 のみに影響する。
  // 速度は ENVOY.lance.speed を正本とし発射側(EnvoyBoss)が制御するため、spec の speed は使わない。
  // 難易度調整: 被ダメが高すぎたため通常弾と同じ 1 に下げる(脅威は速度・本数・任意角度で維持)。
  lanceDamage: 1,
  lanceSize: 16,
  // --- RAY 強化(stage6・休眠コア共鳴後)の通常弾2発化 ---
  // 強化時の通常弾を「正面へ平行に進む 2 発」にするための、マズルからの上下オフセット(px)。
  // 負=上、正=下にずらした 2 点から、どちらも velocityY=0 で真っ直ぐ前方へ撃つ(斜めにしない)。
  // プレイヤー(height=40)内に収まる控えめな間隔にして、縦の当たり面を広げつつ前方カバーを保つ。
  // 1 発あたりの威力は据え置き、2 発化(手数)で強化を体感させる。
  splitOffsetPx: 10,
  // --- RAY 強化(stage6)の持続レーザービーム(チャージ攻撃の強化版) ---
  // 値はワールド座標の生px・画面端非依存(scaled() は通さない。詳細は Beam.ts)。
  // 設計: 終盤の決戦兵器として明確に強くする。1 tick で雑魚(walker hp2 / turret hp3)を
  // 触れただけで撃破できる威力(beamDamage=3)。ボスへは最大 3 ヒット(t=0/300/600ms)で
  // 計 9 ダメージとなり、チャージ弾(3)より大きい「強化レーザー」として機能する。
  beamDamage: 3, // 1 tick(per-target)あたりのダメージ。雑魚の最大HP(turret=3)を1撃で削る
  beamTickMs: 300, // 同一対象への多重ヒットを間引く間隔(overlap は毎フレーム発火するため)
  beamLifespanMs: 800, // ビームの持続時間
  beamThickness: 22, // 帯の太さ(ワールドpx)
  beamLength: 900, // 射程(ワールドpx・画面端非依存でアスペクト比に左右されない)
  // --- チャージ中の敵通常弾吸収 ---
  // チャージ中に吸収できる敵通常弾 1 発あたり、チャージ時間をこの量だけ前倒しする。
  absorbChargeMs: 220,
} as const;

export const BOSS_SHIELD = {
  maxHp: 8,
  normalDamage: 1,
  beamDamage: 1,
  chargedDamage: 5,
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

/**
 * ダメージ床(stage4 汚染地帯の汚染溜まり)のチューニング。これは「人間の環境破壊が残した荒廃=
 * 死んだ世界」そのものであって、誰かが人間を殺すために仕掛けた罠ではない(人類はほぼ絶滅して
 * いる)。腐食性の汚染が、機械である RAY も蝕む。落下死の奈落と異なり、触れていても即死しない
 * スリップダメージで「人間が星をこうした」を足元で体感させる(揺らぎ)。歩いて渡れば痛い・
 * ジャンプで越えれば無傷、という選択を足元に作る。
 * 浄化型ボス(stage4)の bloom(動的汚染床)もこの値を正本として共有する。
 */
export const HAZARD = {
  /** 汚染床 1 ヒットの腐食ダメージ。即死させない小さめの値(maxHp=16 に対し控えめ)。 */
  pollutionDamage: 2,
  /**
   * 多重ヒット防止のクールダウン(ms)。overlap は毎フレーム発火するため、この間隔で間引く。
   * 実際の被弾は Player の無敵時間(invincibleMs)にも従う(環境ダメージも被弾扱い)。
   */
  pollutionTickMs: 600,
} as const;

/**
 * ボス共通のチューニング設定。接地(BOSS)・飛行(FLYING_BOSS)が共有する型。
 * Boss エンティティはこの型を介して設定値を参照し、系統ごとに差し替え可能にする。
 * actionDurationMs は系統で使うアクションのみ持つため Partial とする。
 */
export interface BossConfig {
  maxHp: number;
  /** この HP 比率以下で phase2 へ移行 */
  phase2HpRatio: number;
  contactDamage: number;
  bulletDamage: number;
  bulletSpeed: number;
  /** 移動速度(接地=前後ペース / 飛行=高度を保った左右移動) */
  moveSpeed: number;
  /** 連続被ダメ蓄積でのけぞる量 */
  staggerDamageThreshold: number;
  width: number;
  height: number;
  /** アクション継続時間(ms)。系統で使うアクションのみ定義する。 */
  actionDurationMs: Partial<Record<BossAction, number>>;
  /** phase2 でアクション間隔を短縮する係数 */
  phase2SpeedFactor: number;
  /** ジャンプ初速(接地ボスのみ。上向き負)。飛行ボスは持たない。 */
  jumpVelocity?: number;
}

/**
 * 飛行/浮遊型ボス固有の設定。BossConfig を継承し、滞空高度・上下バブ・急降下の
 * パラメータを追加する。FlyingBoss はこの型を介して飛行固有値を参照する。
 */
export interface FlyingBossConfig extends BossConfig {
  /** 基準滞空高度(地面上端から本体中心までの px)。center_y = STAGE.groundY - hoverAltitude。 */
  hoverAltitude: number;
  /** 上下バブの振幅(px、+下方向)。 */
  hoverAmplitude: number;
  /** 上下バブの周期(ms)。 */
  hoverPeriodMs: number;
  /** 急降下の鉛直速度(px/s、下向き)。 */
  diveSpeed: number;
  /** 高度復帰・追従の最大鉛直速度(px/s)。 */
  climbSpeed: number;
  /** 急降下の最下点(地面上端から本体下端までの余白 px)。小さいほど地面近くまで降りる。 */
  diveBottomMargin: number;
}

export const BOSS = {
  maxHp: 24,
  phase2HpRatio: 0.5, // この比率以下で phase2 へ移行
  contactDamage: 2,
  bulletDamage: 1,
  bulletSpeed: 260,
  moveSpeed: 55, // 前後にペースする速度(速すぎないよう抑える)
  jumpVelocity: -520, // ジャンプ初速(上向き負)。重力1200 で約112px 上昇
  staggerDamageThreshold: 8, // 連続被ダメ蓄積でのけぞる量
  width: 80,
  height: 88,
  // アクション継続時間(ms)
  actionDurationMs: {
    idle: 700,
    move: 900,
    shoot: 600,
    jump: 900,
    stagger: 700,
  },
  // phase2 ではアクション間隔を短縮する係数
  phase2SpeedFactor: 0.7,
} as const satisfies BossConfig;

/**
 * stage3 専用・収容番人(重装ミサイル型)の固有設定。BossConfig を継承し、固有アクション
 * 「missile」の本数(フェーズ別)・散布間隔を追加する。WardenBoss がこの型を介して参照する。
 */
export interface WardenBossConfig extends BossConfig {
  /** phase1 で 1 回に発射するミサイル本数。 */
  missileCountP1: number;
  /** phase2 で 1 回に発射するミサイル本数(増量して攻勢を強める)。 */
  missileCountP2: number;
  /** ミサイル着弾点を散らす左右間隔(px)。プレイヤー X を中心に配る。 */
  missileSpread: number;
}

/**
 * stage3 専用・収容番人(重装ミサイル型)の設定。「遅いが重い」接地ボスをベースに、固有の
 * ミサイル(放物線で降り注ぐアーティラリー)で stage1/2 と明確に差別化する。bossAi の
 * WARDEN_WEIGHTS を使い、行動間隔を長く・威力を高く・移動を遅くしつつミサイルで圧をかける。
 */
export const CONTAINMENT_WARDEN = {
  maxHp: 30, // 重装甲。stage1/2 ボス(24)より硬い
  phase2HpRatio: 0.5,
  contactDamage: 3, // 重い接触ダメージ
  bulletDamage: 2, // 重い単発弾
  bulletSpeed: 220, // 遅く重い弾(BOSS=260 より遅い)
  moveSpeed: 38, // 遅い前後ペース(威圧感のある重い動き)
  jumpVelocity: -460, // 重く低いジャンプ
  staggerDamageThreshold: 10, // 重装でのけぞりにくい
  width: 92,
  height: 96, // 大柄
  // アクション継続時間を全体に長くして「遅い・溜めてから撃つ」リズムにする。
  // missile は発射の溜めを感じさせるため長めに取る。
  actionDurationMs: {
    idle: 1000,
    move: 1200,
    shoot: 900,
    jump: 1000,
    missile: 1100,
    stagger: 800,
  },
  phase2SpeedFactor: 0.75,
  // --- ミサイル固有 ---
  missileCountP1: 2,
  missileCountP2: 3,
  missileSpread: 120,
} as const satisfies WardenBossConfig;

/**
 * 浄化型ボス(環境管理機)固有の設定。BossConfig を継承し、扇状の範囲攻撃(spray)の
 * パラメータを追加する。PurifierBoss はこの型を介して spray の弾数・開き角・速度を参照する。
 */
export interface PurifierBossConfig extends BossConfig {
  spray: {
    /** スプレー 1 回あたりの弾数(扇状に散布)。 */
    count: number;
    /** 扇の総開き角(ラジアン)。中心はプレイヤー方向の水平。 */
    spreadRad: number;
    /** スプレー弾の速度(px/s)。単発弾より遅く、毒霧らしくまとわせる。 */
    speed: number;
  };
  /**
   * bloom(汚染床設置): プレイヤー足元〜周辺の地面に時限式の汚染パッチ(動的 HAZARD)を生成する。
   * phase2 で設置枚数・存続時間が増え、安全地帯がじわじわ縮小する(揺らぎ・疑いのテーマ)。
   */
  bloom: {
    /** phase1 で 1 回に設置する汚染床の枚数。 */
    countP1: number;
    /** phase2 で 1 回に設置する汚染床の枚数(増量して安全地帯を奪う)。 */
    countP2: number;
    /** phase1 の 1 枚あたりの横幅(px)。 */
    patchWidthP1: number;
    /** phase2 の 1 枚あたりの横幅(px、拡大して回避を難しくする)。 */
    patchWidthP2: number;
    /** phase1 の存続時間(ms)。経過後に汚染床を破棄する。 */
    lifespanMsP1: number;
    /** phase2 の存続時間(ms、延長して床をほぼ常設化する)。 */
    lifespanMsP2: number;
    /** 汚染床 1 ヒットの腐食ダメージ。スリップダメージ床(HAZARD)と地続きにする。 */
    damage: number;
  };
}

/**
 * stage4 専用・環境管理機(浄化型)の設定。接地型のまま、毒・スプレー系の範囲攻撃(spray)で
 * 差別化する。「浄化」という名の汚染をまき散らす皮肉な攻撃を、扇状に広がる遅い弾束で表現する。
 * jump は持たず(重い浄化タンク搭載機)、spray を主軸に move/shoot を織り交ぜる。
 */
export const PURIFIER = {
  maxHp: 28, // stage1/2 ボス(24)より硬く、収容番人(30)より柔らかい中間(使者26<浄化28<番人30<コア40)
  phase2HpRatio: 0.5,
  contactDamage: 2,
  bulletDamage: 1,
  bulletSpeed: 240,
  moveSpeed: 48, // やや遅い前後ペース(タンクを背負った機械の重さ)
  staggerDamageThreshold: 9,
  width: 96, // 背面に巨大な汚染タンクを背負う大型機(従来 88 から拡大)
  height: 92, // タンク搭載で背が高い(従来 84 から拡大)
  // アクション継続時間(ms)。浄化型は idle/move/shoot/spray/bloom/stagger を使う(jump なし)。
  // bloom は床設置の溜めを感じさせるため長めに取る。
  actionDurationMs: {
    idle: 800,
    move: 1000,
    shoot: 700,
    spray: 900,
    bloom: 1100,
    stagger: 750,
  },
  phase2SpeedFactor: 0.8, // phase2 の行動間隔短縮を緩める(難易度調整: 攻撃頻度が高すぎたため 0.72→0.8)
  // 扇状スプレー: 4 発を約90度に散布。遅い毒霧で広範囲に圧をかける。
  // 総開き角は維持しつつ本数を 5→4 に減らし、弾の隙間を広げて回避可能にする(難易度調整: 避けにくさの緩和)。
  spray: {
    count: 4,
    spreadRad: Math.PI * 0.5,
    speed: 200,
  },
  // 汚染床設置(bloom): phase2 で枚数増・存続延長し、足元の安全地帯をじわじわ奪う。
  // ただし phase2 の床は広く長すぎて回避困難だったため、横幅と存続を抑える(難易度調整)。
  bloom: {
    countP1: 1,
    countP2: 2,
    patchWidthP1: 90,
    patchWidthP2: 110, // 130→110: phase2 の床1枚を縮小し回避余地を残す
    lifespanMsP1: 3500,
    lifespanMsP2: 4200, // 5000→4200: 床の常設感を緩め安全地帯の回復を早める
    damage: HAZARD.pollutionDamage, // 既存スリップダメージ床と地続きの腐食ダメージ
  },
} as const satisfies PurifierBossConfig;

/**
 * stage2 専用・飛行/浮遊型ボスの設定。難易度は接地ボスと「同等〜やや強い」に収める
 * (maxHp は同じ、弾速・移動をやや強化)。飛行固有の高度・急降下パラメータを持つ。
 */
export const FLYING_BOSS = {
  maxHp: 24, // 接地ボスと同等の硬さ
  phase2HpRatio: 0.5,
  contactDamage: 2,
  bulletDamage: 1,
  bulletSpeed: 280, // やや速い弾
  moveSpeed: 90, // 空中で高度を保ったまま左右へ展開する速度
  staggerDamageThreshold: 8,
  width: 76,
  height: 64, // 接地ボスより平たい空中機体
  // アクション継続時間(ms)。飛行は hover/move/shoot/dive/stagger を使う。
  actionDurationMs: {
    hover: 900,
    move: 800,
    shoot: 600,
    dive: 700,
    stagger: 700,
  },
  phase2SpeedFactor: 0.7,
  // --- 飛行固有 ---
  hoverAltitude: 150,
  hoverAmplitude: 24,
  hoverPeriodMs: 1800,
  diveSpeed: 360,
  climbSpeed: 240,
  diveBottomMargin: 16,
} as const satisfies FlyingBossConfig;

/**
 * 使者(stage5・ENVOY)固有の設定。FlyingBossConfig を継承し、固有アクション lance(高速槍弾)と
 * blink(瞬間移動)のパラメータを追加する。EnvoyBoss がこの型を介して参照する。
 * 飛行の滞空・急降下は再利用しつつ、lance/blink で「読み(選択)を強いる刺客」を固有化する。
 */
export interface EnvoyBossConfig extends FlyingBossConfig {
  /**
   * lance(高速槍弾): 滞空位置からプレイヤー狙いの高速槍弾を時間差で複数発射する。初版は非貫通。
   * phase2 で本数が増え、弾幕の密度が上がる。
   */
  lance: {
    /** phase1 で 1 回に発射する槍弾の本数。 */
    countP1: number;
    /** phase2 で 1 回に発射する槍弾の本数(増量して圧を強める)。 */
    countP2: number;
    /** 槍弾の速度(px/s)。通常弾より速く、回避に「読み」を要求する。 */
    speed: number;
    /** 連射の発射間隔(ms)。時間差で撃ち、軌道を読ませる。 */
    intervalMs: number;
  };
  /**
   * blink(瞬間移動): プレイヤーの逆サイドへ短距離ダッシュして挟む。移動中は残像を出す。
   * phase2 では blink から即 lance へ繋ぐ連携が増える(重みテーブル側で表現)。
   */
  blink: {
    /** ダッシュ速度(px/s)。瞬間移動らしい鋭い水平移動。 */
    dashSpeed: number;
    /** 残像の存続時間(ms)。短命の表現に留めて生成過多を避ける。 */
    afterimageMs: number;
  };
}

/**
 * stage5 専用・ECLIPSEの使者(高速型)の設定。飛行型(FlyingBoss)を継承しつつ、固有アクション
 * lance(任意角度の高速槍弾)/blink(逆サイドへの瞬間移動)で「論理を突きつける高速の刺客」を
 * 固有化する。スリムで流線型・高速移動・短い行動間隔で「予測しにくい速さ」を出す。
 * アクション集合と重みは ENVOY_WEIGHTS(bossAi)に独立させ、stage2 飛行ボスとは共有しない。
 */
export const ENVOY = {
  maxHp: 26, // 飛行ボス(24)よりやや硬く、浄化型(28)より柔らかい終盤手前の硬さ
  phase2HpRatio: 0.5,
  contactDamage: 1, // 難易度調整: 高速接近で接触が頻繁=被ダメが高すぎたため 2→1(無敵時間下で実質の被ダメ速度が半減)
  bulletDamage: 1,
  bulletSpeed: 290, // 速い弾(飛行ボス280より速い)。難易度調整: 見てから避けやすく 320→290
  moveSpeed: 80, // dive 中の水平追尾速度(ENVOY は move を持たず dive のみで使用)。難易度調整: 張り付き緩和 130→110→80(プレイヤー真上への寄り・居座りを緩和)
  staggerDamageThreshold: 7, // 軽量機体ゆえのけぞりやすい(高速な分、反撃の隙を作る)
  width: 60, // スリムな流線型(飛行ボス76より細い)
  height: 52, // 平たく小さい空中機体
  // アクション継続時間(ms)。全体に短くして手数の多いヒット&アウェイのリズムにする。
  // lance/blink は固有アクションで、blink は瞬間移動の鋭さを出すため最も短い。
  // 難易度調整: 手数が多すぎたため hover(休み)と lance 後の隙を延ばす。
  actionDurationMs: {
    hover: 800, // 700→800: 滞空(休み)を延ばし手数を減らす
    shoot: 500,
    dive: 600,
    lance: 650, // 550→650: 槍弾後の隙を延ばす
    blink: 450,
    stagger: 650,
  },
  phase2SpeedFactor: 0.68, // phase2 で行動間隔を詰める(飛行ボス0.7より強く詰める個性は維持)。難易度調整: 詰めすぎを緩和 0.65→0.68
  // --- 飛行固有 ---
  hoverAltitude: 160, // 外縁部の高い位置を舞う(飛行ボス150よりやや高い)
  hoverAmplitude: 28, // 大きめの上下バブで居場所を読みにくくする
  hoverPeriodMs: 1400, // 速いバブ周期(飛行ボス1800より速い)
  diveSpeed: 400, // 鋭い急降下(飛行ボス360より速い)。難易度調整: 急降下の鋭さ緩和 460→400
  climbSpeed: 320, // 急降下後すぐ高度復帰する(ヒット&アウェイの「アウェイ」)
  diveBottomMargin: 12, // より地面近くまで降りて圧をかける
  // --- 使者固有 ---
  lance: {
    countP1: 1, // 難易度調整: phase1 の手数を下げる 2→1(phase2 で増える設計は維持)
    countP2: 2, // 難易度調整: phase2 の弾幕密度を下げる 3→2(phase1 より多い設計は維持)
    speed: 380, // 難易度調整: 槍弾を読みやすく 420→380
    intervalMs: 110,
  },
  blink: {
    dashSpeed: 480, // 難易度調整: 瞬間移動の鋭さを僅かに緩和 520→480
    afterimageMs: 200,
  },
} as const satisfies EnvoyBossConfig;

/**
 * stage6 専用・ECLIPSE本体(ラスボス)固有の設定。BossConfig を継承し、固有アクション
 * 「summon」(配下 Enemy の動的召喚)のパラメータを追加する。CoreBoss がこの型を介して参照する。
 */
export interface CoreBossConfig extends BossConfig {
  /** phase1 で 1 回の summon につき生成する配下の本数。 */
  summonCount: number;
  /** 場に同時存在できる配下の上限(これを超えると summon しても生成しない=画面が溢れない)。 */
  summonMaxActive: number;
  /**
   * 召喚時にプレイヤー(RAY)中心から確保する最小距離(px)。この半径内には配下を湧かせない。
   * 召喚と同時に配下がプレイヤーへ重なって発生する「避けられない接触ダメージ」を防ぐ。
   */
  summonSafeRadius: number;
  /** 同じ側に複数体を並べて召喚するときの体間隔(px)。外側へこの距離ずつ離す。 */
  summonSpacing: number;
}

/**
 * stage6 専用・ECLIPSE本体(ラスボス)の設定。人型でない巨大コア。浮遊して静止し(moveSpeed=0)、
 * phase1 は配下召喚(summon)で支援型に、phase2 は shoot 主軸の直接攻撃型に切り替わる2フェーズ構成。
 * ただし phase2 でも summon を継続し、HP が減っても雑魚召喚が止まらない(盤面圧で実質的に硬くする)。
 * 全6ステージ中で最も硬く・最も重い攻撃を持つ最終戦として、既存ボスより上の値に設定する。
 * jump は持たない(浮遊体)。重み付けは bossAi の CORE_WEIGHTS が担う。
 */
export const ECLIPSE_CORE = {
  maxHp: 58, // ラスボス。全ボス中最も硬い(使者26 < 浄化28 < 番人30 < コア58)。難易度調整: ハードでの長期戦化を緩和しつつ、RAY 覚醒後の火力でも最終戦の耐久は維持する
  phase2HpRatio: 0.5,
  contactDamage: 3, // コア本体への接触は重い
  bulletDamage: 2, // 難易度調整: ハードの被ダメ倍率込みで重すぎたため 3→2
  bulletSpeed: 310, // 難易度調整: 見てから避ける余地を戻す 340→310
  moveSpeed: 0, // コアは浮遊して静止する(移動しない)
  staggerDamageThreshold: 18, // 巨大コアはのけぞりにくいが、反撃機会を少し増やす 20→18
  width: 124, // 巨大
  height: 148,
  // アクション継続時間(ms)。summon は溜めを感じさせ長め、shoot はテンポよく。
  actionDurationMs: {
    idle: 650,
    shoot: 700,
    summon: 1100,
    stagger: 800,
  },
  phase2SpeedFactor: 0.62, // phase2 の攻勢は維持しつつ、ハードで詰まりすぎないよう緩和 0.52→0.62
  // --- 召喚固有 ---
  summonCount: 2, // 1 回の召喚で配下 2 体。ハードでは雑魚自体が強いため、同時処理量を下げる 3→2
  summonMaxActive: 6, // 場の配下上限。phase2 でも召喚は継続するが、画面制圧が過剰にならないよう 8→6
  // プレイヤー中心から 140px 以内には湧かせない。プレイヤー(幅28)・配下(幅30〜32)が重ならず、
  // かつ無敵時間(800ms)・移動速度(160px/s)で離脱できる距離を確保し、召喚即接触の理不尽を防ぐ。
  summonSafeRadius: 140,
  summonSpacing: 120, // 同じ側に2体目以降を並べるときの体間隔(外側へずらす)
} as const satisfies CoreBossConfig;

/**
 * ステージ別の雑魚敵難易度係数。後半ステージほど敵を強め、難易度カーブを作る。
 * 値は ENEMY の基準値に乗算され、ロジック側へのマジックナンバー埋め込みを避ける。
 */
export interface StageTuning {
  /** 雑魚敵 HP 係数(>1 で硬い) */
  enemyHpFactor: number;
  /** walker の移動速度係数(>1 で速い) */
  walkerSpeedFactor: number;
  /** turret の発射間隔係数(<1 で発射が頻繁) */
  turretIntervalFactor: number;
}

/** 中立(stage1 基準)の難易度係数。未知ステージのフォールバックにも使う。 */
export const NEUTRAL_STAGE_TUNING: StageTuning = {
  enemyHpFactor: 1,
  walkerSpeedFactor: 1,
  turretIntervalFactor: 1,
} as const;

export const STAGE_TUNING: Record<string, StageTuning> = {
  stage1: NEUTRAL_STAGE_TUNING,
  // stage2 は walker をやや速く、turret の発射を頻繁にして stage1 からの上昇を体感させる。
  stage2: {
    enemyHpFactor: 1,
    walkerSpeedFactor: 1.3,
    turretIntervalFactor: 0.75,
  },
  // stage3 はさらに敵を強め、難易度カーブを継続させる。
  stage3: {
    enemyHpFactor: 1,
    walkerSpeedFactor: 1.45,
    turretIntervalFactor: 0.65,
  },
  // stage4 は汚染地帯。難易度カーブを継続し、終盤に向けてさらに敵を強める。
  stage4: {
    enemyHpFactor: 1,
    walkerSpeedFactor: 1.5,
    turretIntervalFactor: 0.6,
  },
  // stage5 は ECLIPSE 外縁部。終盤の決意ステージとして難易度カーブをさらに引き上げる。
  stage5: {
    enemyHpFactor: 1,
    walkerSpeedFactor: 1.55,
    turretIntervalFactor: 0.55,
  },
  // stage6 は ECLIPSE 支配中枢。最終決戦として難易度カーブを最大にする。
  stage6: {
    enemyHpFactor: 1,
    walkerSpeedFactor: 1.6,
    turretIntervalFactor: 0.5,
  },
} as const;

/** stageId に対応する難易度係数を返す。未知 ID は中立値にフォールバック。 */
export function getStageTuning(stageId: string): StageTuning {
  return STAGE_TUNING[stageId] ?? NEUTRAL_STAGE_TUNING;
}

export const STAGE = {
  width: 5200, // ステージ全長(px)
  height: 540,
  groundY: 480, // 地面の上端 Y
  deathY: 600, // この Y を超えたら落下死
  gravityY: 1200,
} as const;

export const LADDER = {
  // 梯子の昇降速度(px/s)。横移動より遅めにして「登る手応え」を出す。
  climbSpeed: 130,
  // 足場の上から真下の梯子へ「降り乗り込み」する際の、足元下方向の検知距離 兼 進入量(px)。
  // 足場上端と梯子上端が一致していても、これで真下の梯子をつかんで降り始められる。
  boardDownReach: 10,
} as const;
