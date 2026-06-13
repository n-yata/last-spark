import type { StageStory, StoryEvent, StoryTextKind, StoryTextStyle, TextRequest } from '../types/story';

// ストーリーイベント → 表示要求(TextRequest[])への変換。Phaser 非依存の純粋ロジック。
// bossAi.ts / shotControl.ts / playerMovement.ts と同じく、副作用を持たずテスト可能にする。

/** kind ごとの既定スタイル(表示位置・一時停止要否)。StoryOverlay も同じ値を参照する。 */
export const TEXT_STYLES: Record<StoryTextKind, StoryTextStyle> = {
  scientistLog: { position: 'top', pauseGame: true },
  eclipseVoice: { position: 'top', pauseGame: true },
  rayInner: { position: 'top', pauseGame: false },
  stageIntro: { position: 'center', pauseGame: true },
  terraLine: { position: 'top', pauseGame: false },
};

function request(kind: StoryTextKind, text: string): TextRequest {
  return { kind, text, pauseGame: TEXT_STYLES[kind].pauseGame };
}

/**
 * テキストの表示時間(ms)を本文の長さから算出する。読み終える前に消えないようにするため、
 * すべてのテキストはタップではなくこの時間で自動的に次へ進む(プレイ中のタップ＝移動/
 * ジャンプ/ショットで誤って閉じてしまうのを防ぐ)。空白・改行は読字数に数えない。
 */
export function readingDurationMs(text: string): number {
  const base = 1500;
  const perChar = 120;
  const chars = text.replace(/\s/g, '').length;
  return Math.min(7000, Math.max(2400, base + chars * perChar));
}

/**
 * ストーリーイベントを、表示すべきテキスト要求の並びに変換する。
 * 同一イベントで複数テキストが発生する場合は表示順に並べて返す。
 * 該当テキストが無いイベントは空配列を返す(GameScene 側は何も表示しない)。
 */
export function resolveStoryEvent(story: StageStory, event: StoryEvent): TextRequest[] {
  switch (event.type) {
    case 'stageStart': {
      // 開始テキスト(中央・一時停止) → 開始時の内心(下部) の順。
      const out: TextRequest[] = [request('stageIntro', story.intro)];
      const inner = story.inner.stageStart;
      if (inner) out.push(request('rayInner', inner));
      return out;
    }
    case 'logFound': {
      const log = story.logs[event.slot];
      return log ? [request('scientistLog', log)] : [];
    }
    case 'bossIntro': {
      return [request('eclipseVoice', story.eclipseVoice)];
    }
    case 'inner': {
      const text = story.inner[event.sceneKey];
      return text ? [request('rayInner', text)] : [];
    }
    default:
      return [];
  }
}
