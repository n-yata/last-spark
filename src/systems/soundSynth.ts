import type { GameSettings } from '../types/save';
import type { BgmTrack, BgmDrone } from '../config/audio';

// サウンド合成の純粋ロジック(Phaser / Web Audio 非依存)。
// 音量計算・音名→周波数・BGM ノートのスケジューリングを担う。SoundManager から利用する。

/** 0–1 にクランプする。NaN/Infinity 等の非有限値は安全側(無音)として 0 を返す。 */
export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * A4(440Hz)を基準(semitone=0)とした半音オフセットから周波数(Hz)を返す。
 * 例: 0→440, +12→880, -12→220。
 */
export function noteToFrequency(semitoneFromA4: number): number {
  return 440 * Math.pow(2, semitoneFromA4 / 12);
}

/**
 * セント(1半音=100セント)を周波数の倍率に変換する。デチューン 2 声の各声に掛ける。
 * 例: 0→1, +1200→2(1オクターブ上), -1200→0.5。非有限値は安全側で 1(無変化)。
 */
export function centsToRatio(cents: number): number {
  if (!Number.isFinite(cents)) return 1;
  return Math.pow(2, cents / 1200);
}

/**
 * 探索 BGM のトラックキーを進行状況から選ぶ。TERRA 同行後(Stage 3 クリア以降)は
 * 温もりのある `stageWarm`、それ以前は通常の探索 `stage` を返す純粋関数。
 * docs/story.md「Stage 3〜以降(TERRA登場後)は探索にわずかに温もりが混じる」に対応。
 *
 * @param clearedStages - クリア済みステージ ID の配列(SaveData.clearedStages)
 */
export function selectExplorationBgm(clearedStages: readonly string[]): 'stage' | 'stageWarm' {
  return clearedStages.includes('stage3') ? 'stageWarm' : 'stage';
}

/** SE/BGM の役割。音量計算で参照する設定値が変わる。 */
export type VolumeRole = 'bgm' | 'se';

/**
 * 基準音量に設定(muted/各音量)を反映した実効音量(0–1)を返す。
 * muted の場合は 0。role に応じて bgmVolume / seVolume を乗算する。
 */
export function effectiveVolume(
  base: number,
  settings: GameSettings,
  role: VolumeRole,
): number {
  if (settings.muted) return 0;
  const channel = role === 'bgm' ? settings.bgmVolume : settings.seVolume;
  return clamp01(clamp01(base) * clamp01(channel));
}

/**
 * 同時に鳴らす声の数から、クリップを避けるピーク音量(0–1)を返す。声が増えるほど合算音圧が
 * 上がるため、エネルギー基準の平方根則で 1 声=basePeak から単調に下げる。0–1 にクランプする。
 * 例(basePeak=0.8): 1声→0.8, 2声→約0.566, 3声→約0.462, 4声→0.4。
 * 声数 1 のとき従来の単声ピーク(0.8)と一致し、後方互換を保つ。
 *
 * @param voiceCount 同時発音数(1 以上を想定。0 以下・非有限は 1 声扱い)
 * @param basePeak   1 声時のピーク(既定 0.8)
 */
export function voicePeak(voiceCount: number, basePeak = 0.8): number {
  const n = Number.isFinite(voiceCount) && voiceCount > 1 ? voiceCount : 1;
  return clamp01(basePeak / Math.sqrt(n));
}

/**
 * ドローンが実際に鳴らす声(半音オフセット)の配列を返す。semitones が指定され非空ならその配列
 * (ルートを含む全声)、未指定/空なら単声 [semitone] へフォールバックする。
 * SoundManager.startDrone が各声を sine で重ねて低音パッドを和音化するために使う。
 */
export function droneVoices(drone: BgmDrone): number[] {
  return drone.semitones && drone.semitones.length > 0 ? drone.semitones : [drone.semitone];
}

/** スケジュール済みの 1 ノート。freq が null の区間は休符(無音)。 */
export interface ScheduledNote {
  /** ループ先頭からの開始秒。 */
  startSec: number;
  /** 長さ(秒)。 */
  durSec: number;
  /** 周波数(Hz)。休符は null。 */
  freq: number | null;
}

/** 1 拍(4分音符)の秒数。 */
function secondsPerBeat(bpm: number): number {
  return 60 / bpm;
}

/**
 * BGM トラックのループを、開始秒・長さ・周波数を持つノート列に展開する。
 * 休符(semitone=null)は freq=null として保持する。
 */
export function scheduleNotes(track: BgmTrack): ScheduledNote[] {
  const beatSec = secondsPerBeat(track.bpm);
  const notes: ScheduledNote[] = [];
  let cursor = 0;
  for (const token of track.loop) {
    const durSec = token.beats * beatSec;
    notes.push({
      startSec: cursor,
      durSec,
      freq: token.semitone === null ? null : noteToFrequency(token.semitone),
    });
    cursor += durSec;
  }
  return notes;
}

/** BGM ループ全体の長さ(秒)。 */
export function trackDurationSec(track: BgmTrack): number {
  const beatSec = secondsPerBeat(track.bpm);
  return track.loop.reduce((sum, token) => sum + token.beats * beatSec, 0);
}
