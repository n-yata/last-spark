// サウンド演出のデータ定義(Phaser / Web Audio 非依存)。
// 外部音源ファイルは使わず、ここで定義した仕様を SoundManager が Web Audio で合成する。
// チューニング値(音色・音量・テンポ)を balance.ts と同様にここへ集約する。

/** 効果音(SE)の発火イベント種別。 */
export const SE_KEYS = [
  'jump',
  'chargeStart',
  'chargeReady',
  'shootNormal',
  'shootCharged',
  'enemyHit',
  'bossHit',
  'playerDamaged',
  'enemyDefeated',
  'bossDefeated',
  'stageClear',
  'gameOver',
  'uiTap',
] as const;

export type SeKey = (typeof SE_KEYS)[number];

/** 音色。'noise' はホワイトノイズ(破壊・爆発系)、それ以外は OscillatorType。 */
export type Wave = OscillatorType | 'noise';

/** 単発効果音の合成仕様。周波数 start→end のスイープ + 線形エンベロープ。 */
export interface SeSpec {
  wave: Wave;
  /** 開始周波数(Hz)。noise では中心周波数の目安(未使用でも保持)。 */
  freqStart: number;
  /** 終了周波数(Hz)。start と同値ならスイープ無し。 */
  freqEnd: number;
  /** 全体の長さ(ms)。 */
  durationMs: number;
  /** アタック(立ち上がり)時間(ms)。 */
  attackMs: number;
  /** リリース(減衰)時間(ms)。 */
  releaseMs: number;
  /** 基準音量 0–1(seVolume と乗算される)。 */
  volume: number;
}

/** BGM トラックキー(シーン連動)。 */
export type BgmKey = 'title' | 'stage' | 'stageWarm' | 'boss' | 'ending';

/**
 * 持続する低音パッド(ドローン)。ループ全体の下に鳴り続け、アンビエントな「音の風景」の
 * 土台を作る。semitone は A4=0 基準の半音オフセット(低音=負)、volume は bgm チャンネル内の
 * 相対音量(0–1)。未指定のトラックはドローンなし。
 */
export interface BgmDrone {
  semitone: number;
  volume: number;
  /**
   * ドローンを和音化する声(半音オフセット)の配列。ルートを含む全声を列挙する
   * (例: ルート＋完全5度なら [-24, -17])。土台を分厚くする「低音パッドの和音化」に使う。
   * 後方互換: 未指定/空なら従来どおり semitone の単声で鳴る。
   * 合算音圧は声数に応じて voicePeak で正規化し、クリップを防ぐ。
   */
  semitones?: number[];
}

/** ノート 1 つ。semitone は A4=0 を基準とした半音オフセット。null は休符。 */
export interface NoteToken {
  semitone: number | null;
  /** 拍数(4分音符=1)。 */
  beats: number;
}

/** ループ再生する BGM トラックの合成仕様。 */
export interface BgmTrack {
  wave: OscillatorType;
  /** テンポ(BPM、4分音符基準)。 */
  bpm: number;
  /** 基準音量 0–1(bgmVolume と乗算される)。 */
  baseVolume: number;
  /** ループするノート列。 */
  loop: NoteToken[];
  /**
   * 各ノートを「わずかにデチューンした 2 声」で鳴らすときのデチューン量(セント)。
   * 0/未指定なら単声。10 前後で弦の合奏やパッドのような温かい揺らぎ(コーラス感)が出る。
   * 「温もり(stageWarm)」「弦・ピアノ系(ending)」の質感づくりに使う。
   */
  detuneCents?: number;
  /**
   * 各メロディノートへ重ねる半音オフセットの配列(本体=0 は含めず、追加で重ねる声のみ)。
   * 例: [7]=完全5度上(パワー)、[-12]=オクターブ下(重み)、[-12, 7]=両方(パワーコード感)。
   * detuneCents(2声の揺らぎ)と独立・併用可能。未指定なら本体のみで従来どおり鳴る。
   * 合算音圧は総声数(harmonies × detune 声)に応じて voicePeak で正規化し、クリップを防ぐ。
   */
  harmonies?: number[];
  /** 持続する低音パッド(ドローン)。未指定ならドローンなし。 */
  drone?: BgmDrone;
}

// --- SE カタログ(13種) ---
// レトロ電子音の世界観に合わせ、短い矩形波/ノコギリ波/ノイズで構成する。
export const SE: Record<SeKey, SeSpec> = {
  // 操作系: 軽快な上昇/短音
  jump: { wave: 'square', freqStart: 320, freqEnd: 560, durationMs: 120, attackMs: 4, releaseMs: 60, volume: 0.5 },
  chargeStart: { wave: 'sine', freqStart: 220, freqEnd: 260, durationMs: 90, attackMs: 8, releaseMs: 50, volume: 0.35 },
  chargeReady: { wave: 'square', freqStart: 660, freqEnd: 990, durationMs: 140, attackMs: 4, releaseMs: 70, volume: 0.45 },
  shootNormal: { wave: 'square', freqStart: 720, freqEnd: 420, durationMs: 100, attackMs: 2, releaseMs: 60, volume: 0.4 },
  shootCharged: { wave: 'sawtooth', freqStart: 520, freqEnd: 180, durationMs: 220, attackMs: 4, releaseMs: 140, volume: 0.55 },
  // 命中系: 短い打撃
  enemyHit: { wave: 'square', freqStart: 440, freqEnd: 200, durationMs: 80, attackMs: 1, releaseMs: 50, volume: 0.4 },
  bossHit: { wave: 'sawtooth', freqStart: 300, freqEnd: 140, durationMs: 110, attackMs: 1, releaseMs: 70, volume: 0.45 },
  playerDamaged: { wave: 'sawtooth', freqStart: 260, freqEnd: 90, durationMs: 200, attackMs: 2, releaseMs: 120, volume: 0.5 },
  // 撃破系: ノイズ爆発
  enemyDefeated: { wave: 'noise', freqStart: 0, freqEnd: 0, durationMs: 220, attackMs: 2, releaseMs: 180, volume: 0.45 },
  bossDefeated: { wave: 'noise', freqStart: 0, freqEnd: 0, durationMs: 600, attackMs: 4, releaseMs: 520, volume: 0.6 },
  // 結果系: 上昇ジングル/下降
  stageClear: { wave: 'square', freqStart: 523, freqEnd: 1046, durationMs: 420, attackMs: 6, releaseMs: 220, volume: 0.55 },
  gameOver: { wave: 'sawtooth', freqStart: 330, freqEnd: 70, durationMs: 520, attackMs: 6, releaseMs: 380, volume: 0.5 },
  // UI
  uiTap: { wave: 'square', freqStart: 600, freqEnd: 600, durationMs: 60, attackMs: 1, releaseMs: 40, volume: 0.35 },
} as const;

// --- 持続ビーム音(RAY強化のチャージ攻撃) ---
// 単発SE(playSe)とは別系統。ビーム射出中ずっと鳴らす重厚な持続音で「強さ」を表す。
// 低層(重み)+ 完全5度上(パワーコード感)+ ノイズ(ジリつき)を SoundManager.startBeam が合成する。

/** 持続ビーム音の合成仕様。SoundManager.startBeam()/stopBeam() が解釈する。 */
export interface BeamSoundSpec {
  /** 低層(重み・パワー)の波形と周波数。 */
  lowWave: OscillatorType;
  lowFreq: number;
  /** 高層(厚み・エネルギー)。低層の完全5度上などにして「強さ」を補強する。 */
  highWave: OscillatorType;
  highFreq: number;
  /** ノイズ層(ビームのジリつき)の音量比 0–1。0 でノイズ無し。 */
  noiseVolume: number;
  /** 立ち上がり(ms)。短いほど鋭く発動する。 */
  attackMs: number;
  /** 停止時の減衰(ms)。 */
  releaseMs: number;
  /** 全体音量 0–1(seVolume と乗算)。 */
  volume: number;
}

export const BEAM_SOUND: BeamSoundSpec = {
  lowWave: 'sine', // 鋸波のジリつきをやめ、丸いサインで土台を作る(耳障りさを排する)
  lowFreq: 130, // C3 付近: 低く滑らかなハム
  highWave: 'triangle', // 三角波で角の取れた倍音(鋸波より柔らかい)
  highFreq: 195, // G3(完全5度上): パワー感は残しつつ刺さらない厚み
  noiseVolume: 0.05, // ジリつきは最小限(クリーンな「エネルギー音」寄りに)
  attackMs: 40, // ふわっと立ち上げる(クリックは避ける程度)
  releaseMs: 140, // 停止時に滑らかに切る
  volume: 0.35, // 滑らかな分耳に残りやすいので気持ち抑えめ
} as const;

// --- BGM トラック(5種) ---
// 半音オフセット(A4=0)で記述。ビジュアルトーン(暗い廃墟＋発光アクセント)と一貫した方向性。
// docs/story.md「BGM方針」の4シーンに対応:
//   title       : 静かな浮遊感(導入)
//   stage       : 探索=アンビエント・ドローン系。廃墟の静寂と不安感(「音の風景」)
//   stageWarm   : TERRA同行後(Stage 3クリア以降)。探索にわずかな温もり(長3度＋デチューンの揺らぎ)
//   boss        : 無機質な電子音楽。ECLIPSEの機械的な冷たさ(低音ドローン＋鋸波ビート)
//   ending      : 静かで余韻を残す、人間的な弦・パッド系(遅い解決進行＋デチューン＋ドローン)
export const BGM: Record<BgmKey, BgmTrack> = {
  title: {
    wave: 'triangle',
    bpm: 84,
    baseVolume: 0.32,
    // 導入の浮遊感を保ちつつ、薄く開いた低音パッド(ルート＋完全5度)を敷いて土台に厚みを足す。
    // 過剰化を避けるため音量は控えめ。
    drone: { semitone: -24, volume: 0.22, semitones: [-24, -17] }, // 薄い A2＋E3 のパッド
    loop: [
      { semitone: 0, beats: 1 }, // A4
      { semitone: 7, beats: 1 }, // E5
      { semitone: 3, beats: 1 }, // C5
      { semitone: 10, beats: 1 }, // G5
      { semitone: 5, beats: 1 }, // D5
      { semitone: 3, beats: 1 }, // C5
      { semitone: 0, beats: 1 }, // A4
      { semitone: null, beats: 1 }, // 休符
    ],
  },
  // 探索: アンビエント・ドローン系。低音パッドの上に、間(休符)を取った疎なメロディを
  // ゆっくり置く。短3度(C5)主体で廃墟の静寂と不安感を表す。三角波で角を丸める。
  stage: {
    wave: 'triangle',
    bpm: 96,
    // 三角波は矩形波より体感が小さく、疎なメロディ+休符で鳴る時間も短いため、
    // 「探索中ほぼ聞こえない」を避けるべく基準音量を底上げする(クリップ余裕あり)。
    baseVolume: 0.4,
    // 探索の静寂・不安は死守。メロディにハーモニーは重ねず、ドローンのみ和音化(ルート＋完全5度)で
    // 土台に厚みだけを足す。開いた5度が不安感を補強する。
    drone: { semitone: -24, volume: 0.5, semitones: [-24, -17] }, // A2＋E3 の開いた持続パッド(和音化)
    loop: [
      { semitone: 0, beats: 2 }, // A4
      { semitone: 7, beats: 2 }, // E5(開いた5度)
      { semitone: 3, beats: 2 }, // C5(短3度=陰り)
      { semitone: -2, beats: 2 }, // G4
      { semitone: 0, beats: 1 }, // A4
      { semitone: -5, beats: 3 }, // E4(沈み込む)
      { semitone: null, beats: 2 }, // 静寂(音の風景の「間」)
    ],
  },
  // 温もり: 探索と同じ土台に、長3度(C#5)とデチューンの揺らぎを足して温度を上げる。
  // TERRA同行後に切り替わり、探索の不安感に人肌の温もりが混じる。短3度→長3度の差が要。
  stageWarm: {
    wave: 'triangle',
    bpm: 96,
    baseVolume: 0.4, // 探索(stage)と同じ音圧で揃える(底上げ理由は stage 参照)
    detuneCents: 8, // わずかなコーラス感(温もり)
    harmonies: [-12], // オクターブ下を控えめに重ね、温もりに包容感のある厚みを足す
    drone: { semitone: -24, volume: 0.45, semitones: [-24, -17] }, // ルート＋完全5度の和音パッド
    loop: [
      { semitone: 0, beats: 2 }, // A4
      { semitone: 7, beats: 2 }, // E5
      { semitone: 4, beats: 2 }, // C#5(長3度=温もり。stage の C5 との対比が肝)
      { semitone: -2, beats: 2 }, // G4
      { semitone: 2, beats: 1 }, // B4
      { semitone: -5, beats: 3 }, // E4
      { semitone: null, beats: 2 }, // 静寂
    ],
  },
  // ボス: 無機質な機械の冷たさ。低音ドローンの上に鋸波の反復ビート。方針は現行を維持しつつ、
  // ドローンを敷いて圧と冷たさを増す。
  boss: {
    wave: 'sawtooth',
    bpm: 150,
    baseVolume: 0.3,
    // 重厚化: メロディにオクターブ下(重み)＋完全5度上(パワーコード)を重ね、機械の圧を最大化する。
    // 無機質さは鋸波(wave)で維持する。
    harmonies: [-12, 7],
    drone: { semitone: -24, volume: 0.4, semitones: [-24, -17] }, // A2＋E3 の機械的な低音パッド(和音化)
    loop: [
      { semitone: -12, beats: 0.5 }, // A3
      { semitone: -12, beats: 0.5 }, // A3
      { semitone: -11, beats: 0.5 }, // A#3
      { semitone: -12, beats: 0.5 }, // A3
      { semitone: -9, beats: 0.5 }, // C4
      { semitone: -12, beats: 0.5 }, // A3
      { semitone: -10, beats: 0.5 }, // B3
      { semitone: -13, beats: 0.5 }, // G#3
      { semitone: -12, beats: 1 }, // A3
      { semitone: -5, beats: 0.5 }, // E4
      { semitone: -6, beats: 0.5 }, // D#4
      { semitone: -12, beats: 1 }, // A3
    ],
  },
  // エンディング: 静かで余韻を残す弦・パッド系。遅い解決進行に、デチューン(弦の合奏感)と
  // 低音ドローン(余韻)を重ねる。短調から長3度を含む解決へ向かい「終わりではなく始まり」を表す。
  ending: {
    wave: 'triangle',
    bpm: 72,
    baseVolume: 0.3,
    detuneCents: 10, // 弦セクションのような厚みと揺らぎ
    harmonies: [-12], // オクターブ下を重ね、弦の重み・厚みを加える
    drone: { semitone: -24, volume: 0.4, semitones: [-24, -17, -12] }, // ルート＋5度＋オクターブの厚い余韻パッド
    loop: [
      { semitone: -12, beats: 2 }, // A3(沈んだ始まり)
      { semitone: -5, beats: 1 }, // E4
      { semitone: 0, beats: 1 }, // A4
      { semitone: 4, beats: 2 }, // C#5(長3度=希望の兆し)
      { semitone: 2, beats: 1 }, // B4
      { semitone: 0, beats: 1 }, // A4
      { semitone: 7, beats: 2 }, // E5(開けた解決)
      { semitone: null, beats: 2 }, // 余韻の休符
    ],
  },
} as const;
