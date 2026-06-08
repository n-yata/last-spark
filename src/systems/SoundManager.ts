import { SE, BGM, type SeKey, type BgmKey, type BgmTrack } from '../config/audio';
import { SaveManager } from '../persistence/SaveManager';
import type { GameSettings } from '../types/save';
import {
  clamp01,
  effectiveVolume,
  scheduleNotes,
  trackDurationSec,
  type ScheduledNote,
} from './soundSynth';

// Web Audio による合成音の再生ラッパ(シングルトン)。
// 外部音源ファイルを使わず、config/audio.ts の仕様を Oscillator / ノイズで合成する。
//
// 設計方針:
// - import 時は副作用を持たない(AudioContext 生成は init() 内のみ)。
// - AudioContext 非対応/生成失敗時は disabled となり全メソッドが no-op(jsdom 等で安全)。
// - SaveManager の GameSettings(muted/bgmVolume/seVolume)を尊重して音量へ反映する。

type AudioContextCtor = typeof AudioContext;

function resolveAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

const LOOKAHEAD_SEC = 0.1; // 先読みして予約する時間窓
const SCHEDULER_INTERVAL_MS = 25; // スケジューラの起動間隔

export class SoundManager {
  private ctx?: AudioContext;
  private disabled = true;
  private masterGain?: GainNode;
  private bgmGain?: GainNode;
  private seGain?: GainNode;
  private noiseBuffer?: AudioBuffer;
  private settings: GameSettings = { muted: false, bgmVolume: 0.6, seVolume: 0.8 };

  private currentBgmKey?: BgmKey;
  private currentBgmBase = 0;
  private bgmNotes: ScheduledNote[] = [];
  private bgmLoopDur = 0;
  private bgmLoopBaseTime = 0;
  private bgmNoteIndex = 0;
  private bgmScheduler?: ReturnType<typeof setInterval>;
  private bgmNodes = new Set<OscillatorNode>();
  private unlockBound = false;

  /**
   * AudioContext を生成し再生基盤を初期化する。
   * 未対応/失敗時は disabled のままにして throw しない。
   */
  init(settings?: GameSettings): void {
    if (this.ctx) return; // 二重初期化を防ぐ
    this.settings = settings ?? this.loadSettings();

    const Ctor = resolveAudioContextCtor();
    if (!Ctor) {
      this.disabled = true;
      return;
    }
    try {
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.9; // クリップ回避のヘッドルーム
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.connect(this.masterGain);
      this.seGain = this.ctx.createGain();
      this.seGain.connect(this.masterGain);

      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
      this.disabled = false;
      this.applyChannelGains();
      this.bindUnlock();
    } catch {
      // 生成失敗時は無音で継続(ゲーム進行を止めない)
      this.disabled = true;
    }
  }

  private loadSettings(): GameSettings {
    try {
      return new SaveManager().getData().settings;
    } catch {
      return this.settings;
    }
  }

  /** モバイル autoplay 制約対策: 初回ユーザー操作で AudioContext を resume する。 */
  private bindUnlock(): void {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const unlock = (): void => {
      this.resume();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  /** suspended な AudioContext を再開する(失敗は握りつぶす)。 */
  resume(): void {
    if (this.disabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {
        /* 再開失敗は無視(進行を止めない) */
      });
    }
  }

  /** 設定を更新し、各チャンネルの音量へ反映する。 */
  applySettings(settings: GameSettings): void {
    this.settings = settings;
    this.applyChannelGains();
  }

  private applyChannelGains(): void {
    if (this.disabled || !this.ctx || !this.bgmGain || !this.seGain) return;
    const now = this.ctx.currentTime;
    this.bgmGain.gain.setValueAtTime(
      effectiveVolume(this.currentBgmBase, this.settings, 'bgm'),
      now,
    );
    this.seGain.gain.setValueAtTime(effectiveVolume(1, this.settings, 'se'), now);
  }

  /** 単発の効果音を再生する。 */
  playSe(key: SeKey): void {
    if (this.disabled || !this.ctx || !this.seGain) return;
    this.resume();
    const spec = SE[key];
    const t0 = this.ctx.currentTime;
    const durSec = spec.durationMs / 1000;
    const peak = clamp01(spec.volume);

    const envelope = this.ctx.createGain();
    envelope.connect(this.seGain);
    this.applyEnvelope(envelope.gain, t0, durSec, spec.attackMs / 1000, spec.releaseMs / 1000, peak);

    if (spec.wave === 'noise') {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer ?? null;
      src.connect(envelope);
      src.start(t0);
      src.stop(t0 + durSec);
      src.onended = () => {
        src.disconnect();
        envelope.disconnect();
      };
    } else {
      const osc = this.ctx.createOscillator();
      osc.type = spec.wave;
      osc.frequency.setValueAtTime(Math.max(1, spec.freqStart), t0);
      if (spec.freqEnd !== spec.freqStart) {
        osc.frequency.linearRampToValueAtTime(Math.max(1, spec.freqEnd), t0 + durSec);
      }
      osc.connect(envelope);
      osc.start(t0);
      osc.stop(t0 + durSec);
      osc.onended = () => {
        osc.disconnect();
        envelope.disconnect();
      };
    }
  }

  /** 指定トラックの BGM をループ再生する(現在の BGM は停止)。同一キーなら何もしない。 */
  playBgm(key: BgmKey): void {
    if (this.disabled || !this.ctx) return;
    if (this.currentBgmKey === key && this.bgmScheduler) return;
    this.stopBgm();

    const track = BGM[key];
    this.currentBgmKey = key;
    this.currentBgmBase = track.baseVolume;
    this.bgmNotes = scheduleNotes(track);
    this.bgmLoopDur = trackDurationSec(track);
    this.bgmNoteIndex = 0;
    this.bgmLoopBaseTime = this.ctx.currentTime + 0.05;
    this.applyChannelGains();
    this.resume();

    this.bgmScheduler = setInterval(() => {
      try {
        this.scheduleAhead(track);
      } catch {
        /* スケジューリング例外で進行を止めない */
      }
    }, SCHEDULER_INTERVAL_MS);
  }

  /** BGM を停止し、予約済みノードを片付ける。 */
  stopBgm(): void {
    if (this.bgmScheduler) {
      clearInterval(this.bgmScheduler);
      this.bgmScheduler = undefined;
    }
    for (const node of this.bgmNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        /* 既に停止済みなら無視 */
      }
    }
    this.bgmNodes.clear();
    this.currentBgmKey = undefined;
    this.currentBgmBase = 0;
  }

  /** 先読み窓に入ったノートを順次予約する(ルックアヘッド・スケジューラ)。 */
  private scheduleAhead(track: BgmTrack): void {
    // bgmLoopDur<=0 だとループ基準時刻が進まず無限ループになるため防御する
    if (!this.ctx || this.bgmNotes.length === 0 || this.bgmLoopDur <= 0) return;
    const horizon = this.ctx.currentTime + LOOKAHEAD_SEC;
    while (this.bgmLoopBaseTime + this.bgmNotes[this.bgmNoteIndex].startSec < horizon) {
      const note = this.bgmNotes[this.bgmNoteIndex];
      const when = this.bgmLoopBaseTime + note.startSec;
      if (note.freq !== null) {
        this.scheduleBgmNote(track, note.freq, when, note.durSec);
      }
      this.bgmNoteIndex++;
      if (this.bgmNoteIndex >= this.bgmNotes.length) {
        this.bgmNoteIndex = 0;
        this.bgmLoopBaseTime += this.bgmLoopDur;
      }
    }
  }

  private scheduleBgmNote(track: BgmTrack, freq: number, when: number, durSec: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = track.wave;
    osc.frequency.setValueAtTime(Math.max(1, freq), when);

    const envelope = this.ctx.createGain();
    envelope.connect(this.bgmGain);
    // 軽いアタック/リリースで音の繋ぎを滑らかにする(ノート長の範囲内)
    const attack = Math.min(0.01, durSec * 0.2);
    const release = Math.min(0.06, durSec * 0.4);
    this.applyEnvelope(envelope.gain, when, durSec, attack, release, 0.8);

    osc.connect(envelope);
    osc.start(when);
    osc.stop(when + durSec);
    this.bgmNodes.add(osc);
    osc.onended = () => {
      this.bgmNodes.delete(osc);
      osc.disconnect();
      envelope.disconnect();
    };
  }

  /** 線形 ADSR(簡易): 0→peak(attack)→…→0(release で着地)。 */
  private applyEnvelope(
    gain: AudioParam,
    t0: number,
    durSec: number,
    attackSec: number,
    releaseSec: number,
    peak: number,
  ): void {
    const a = Math.min(attackSec, durSec);
    const releaseStart = Math.max(a, durSec - releaseSec);
    gain.setValueAtTime(0, t0);
    gain.linearRampToValueAtTime(peak, t0 + a);
    gain.setValueAtTime(peak, t0 + releaseStart);
    gain.linearRampToValueAtTime(0, t0 + durSec);
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 1); // 1 秒のホワイトノイズ
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

// 全シーン横断で共有するシングルトン。
let instance: SoundManager | undefined;

/** 共有 SoundManager を返す(遅延生成)。init() 前/disabled では各メソッドが no-op。 */
export function getSound(): SoundManager {
  if (!instance) instance = new SoundManager();
  return instance;
}
