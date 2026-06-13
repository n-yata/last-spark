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
export type BgmKey = 'title' | 'stage' | 'boss' | 'ending';

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

// --- BGM トラック(4種) ---
// 半音オフセット(A4=0)で記述。暗め基調のミニマルなループ。
// title: 静かな浮遊感 / stage: 推進力のあるアルペジオ / boss: 緊張感のある低音主体 /
// ending: 苦い勝利と再生の希望(遅く荘重な、解決感のある長音主体)。
export const BGM: Record<BgmKey, BgmTrack> = {
  title: {
    wave: 'triangle',
    bpm: 84,
    baseVolume: 0.32,
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
  stage: {
    wave: 'square',
    bpm: 132,
    baseVolume: 0.28,
    loop: [
      { semitone: -12, beats: 0.5 }, // A3
      { semitone: 0, beats: 0.5 }, // A4
      { semitone: 3, beats: 0.5 }, // C5
      { semitone: 7, beats: 0.5 }, // E5
      { semitone: 3, beats: 0.5 }, // C5
      { semitone: 0, beats: 0.5 }, // A4
      { semitone: -5, beats: 0.5 }, // E4
      { semitone: -2, beats: 0.5 }, // G4
      { semitone: -4, beats: 0.5 }, // F4
      { semitone: 3, beats: 0.5 }, // C5
      { semitone: 5, beats: 0.5 }, // D5
      { semitone: 8, beats: 0.5 }, // F5
      { semitone: 5, beats: 0.5 }, // D5
      { semitone: 3, beats: 0.5 }, // C5
      { semitone: 0, beats: 0.5 }, // A4
      { semitone: -5, beats: 0.5 }, // E4
    ],
  },
  boss: {
    wave: 'sawtooth',
    bpm: 150,
    baseVolume: 0.3,
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
  // エンディング: 遅く荘重に。短調から長3度を含む解決へ向かい、「終わりではなく始まり」を音で表す。
  ending: {
    wave: 'triangle',
    bpm: 72,
    baseVolume: 0.3,
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
