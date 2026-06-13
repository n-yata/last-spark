import { describe, it, expect } from 'vitest';
import { getStageStory } from '../../../src/config/story';
import { getStageData } from '../../../src/config/stage1';

// 確定テキスト(docs/story.md)の取りこぼし・誤編集を検出するデータ整合テスト。
// 表示そのものは実機確認だが、データが確定版どおりであることはここで保証する。

describe('getStageStory', () => {
  it('stage1 / stage2 のストーリーが登録されている', () => {
    expect(getStageStory('stage1')).toBeDefined();
    expect(getStageStory('stage2')).toBeDefined();
  });

  it('未登録ステージは undefined', () => {
    expect(getStageStory('stageX')).toBeUndefined();
  });

  it('stage1 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage1')!;
    expect(s.eclipseVoice).toBe('この区域は管理下にある。侵入を排除する');
    expect(s.intro).toContain('廃墟。錆と蔓草に覆われた、かつての都市。');
    expect(s.logs.early).toContain('起動テスト記録 №001');
    expect(s.logs.preBoss).toContain('外に出るな、まだだ。');
    expect(s.logs.postBoss).toContain('俺が誰かは、言わない。');
    expect(s.inner.stageStart).toBe('……俺は、起きた');
    expect(s.inner.firstEnemyDefeated).toBe('動けた。——俺は、何者だ');
    expect(s.inner.firstLogFound).toBe('誰かが、ここにいた');
  });

  it('stage2 の確定テキストが story.md と一致する', () => {
    const s = getStageStory('stage2')!;
    expect(s.eclipseVoice).toBe('この構造物の制御権はECLIPSEに帰属する。侵入を排除する');
    expect(s.logs.early).toContain('研究ノート');
    expect(s.logs.preBoss).toContain('ECLIPSEは止まらない。');
    expect(s.logs.postBoss).toContain('感情テスト記録');
    expect(s.inner.stageStart).toBe('上に、何かある。引かれる——なぜ');
    expect(s.inner.firstLogFound).toBe('……誰かが、これを書いた');
    expect(s.inner.firstLogRead).toBe('俺のために、誰かが——');
  });

  it('全3スロットのログ本文が確定版として存在する', () => {
    for (const id of ['stage1', 'stage2']) {
      const s = getStageStory(id)!;
      expect(s.logs.early).toBeTruthy();
      expect(s.logs.preBoss).toBeTruthy();
      expect(s.logs.postBoss).toBeTruthy();
    }
  });
});

describe('ログトリガー配置', () => {
  it('stage1 / stage2 に early・preBoss のトリガーが配置されている', () => {
    for (const id of ['stage1', 'stage2']) {
      const slots = (getStageData(id).logTriggers ?? []).map((t) => t.slot);
      expect(slots).toContain('early');
      expect(slots).toContain('preBoss');
    }
  });

  it('preBoss トリガーはボストリガー手前に置かれている', () => {
    for (const id of ['stage1', 'stage2']) {
      const stage = getStageData(id);
      const preBoss = (stage.logTriggers ?? []).find((t) => t.slot === 'preBoss');
      expect(preBoss).toBeDefined();
      expect(preBoss!.x).toBeLessThan(stage.bossTriggerX);
    }
  });
});
