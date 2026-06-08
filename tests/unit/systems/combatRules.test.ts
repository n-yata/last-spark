import { describe, it, expect } from 'vitest';
import {
  isInvincible,
  applyDamageToHp,
  isDead,
  bossPhaseForHp,
} from '../../../src/systems/combatRules';
import { BOSS } from '../../../src/config/balance';

describe('isInvincible', () => {
  it('現在時刻が無敵終了時刻より前なら無敵', () => {
    expect(isInvincible(500, 800)).toBe(true);
  });

  it('無敵終了時刻ちょうど・以降は無敵でない', () => {
    expect(isInvincible(800, 800)).toBe(false);
    expect(isInvincible(900, 800)).toBe(false);
  });

  it('invincibleUntil=0 は常に無敵でない', () => {
    expect(isInvincible(0, 0)).toBe(false);
  });
});

describe('applyDamageToHp', () => {
  it('HP を減らす', () => {
    expect(applyDamageToHp(10, 3)).toBe(7);
  });

  it('HP は 0 未満にならない', () => {
    expect(applyDamageToHp(2, 5)).toBe(0);
  });

  it('負のダメージは無視する(回復しない)', () => {
    expect(applyDamageToHp(5, -3)).toBe(5);
  });
});

describe('isDead', () => {
  it('HP0 以下で撃破', () => {
    expect(isDead(0)).toBe(true);
    expect(isDead(-1)).toBe(true);
  });

  it('HP が残っていれば撃破でない', () => {
    expect(isDead(1)).toBe(false);
  });
});

describe('bossPhaseForHp', () => {
  it('HP が 50% より多い間は phase1', () => {
    expect(bossPhaseForHp(BOSS.maxHp, BOSS.maxHp)).toBe('phase1');
    expect(bossPhaseForHp(BOSS.maxHp * 0.6, BOSS.maxHp)).toBe('phase1');
  });

  it('HP がちょうど 50% で phase2 に移行する', () => {
    expect(bossPhaseForHp(BOSS.maxHp * BOSS.phase2HpRatio, BOSS.maxHp)).toBe('phase2');
  });

  it('HP が 50% 未満は phase2', () => {
    expect(bossPhaseForHp(BOSS.maxHp * 0.2, BOSS.maxHp)).toBe('phase2');
  });
});
