import { describe, it, expect } from 'vitest';
import type { Damageable } from '../../../src/types/combat';
import {
  resolveInvincibleDamage,
  bossPhaseForHp,
  isDead,
  applyDamageToHp,
} from '../../../src/systems/combatRules';
import { createProjectileSpec } from '../../../src/systems/shot';
import { pickNextBossAction } from '../../../src/systems/bossAi';
import { PLAYER, BOSS } from '../../../src/config/balance';

// 衝突 → HP 減少 → 撃破/ゲームオーバー遷移の一連を、
// 実コード(combatRules / shot / bossAi)を結合して統合検証する。

// プレイヤー被弾モデル(Player.takeDamage と同じ純粋ロジックを共有)
class PlayerModel implements Damageable {
  hp: number = PLAYER.maxHp;
  maxHp: number = PLAYER.maxHp;
  private invincibleUntil = 0;
  takeDamageAt(amount: number, now: number): void {
    const next = resolveInvincibleDamage(
      { hp: this.hp, invincibleUntil: this.invincibleUntil },
      amount,
      now,
      PLAYER.invincibleMs,
    );
    this.hp = next.hp;
    this.invincibleUntil = next.invincibleUntil;
  }
  takeDamage(amount: number): void {
    this.takeDamageAt(amount, 0);
  }
  isDead(): boolean {
    return isDead(this.hp);
  }
}

describe('プレイヤー被弾フロー(無敵時間)', () => {
  it('無敵時間中の連続被弾は重複しない(1 回分のみ)', () => {
    const p = new PlayerModel();
    p.takeDamageAt(3, 1000);
    p.takeDamageAt(3, 1000 + PLAYER.invincibleMs - 1); // 無敵中
    expect(p.hp).toBe(PLAYER.maxHp - 3);
  });

  it('無敵が明けた後の被弾は再び適用される', () => {
    const p = new PlayerModel();
    p.takeDamageAt(3, 1000);
    p.takeDamageAt(3, 1000 + PLAYER.invincibleMs); // 無敵終了ちょうど
    expect(p.hp).toBe(PLAYER.maxHp - 6);
  });

  it('被弾を重ねると HP0 でゲームオーバー(撃破)になる', () => {
    const p = new PlayerModel();
    let now = 0;
    while (!p.isDead()) {
      p.takeDamageAt(4, now);
      now += PLAYER.invincibleMs; // 毎回無敵明けに被弾
    }
    expect(p.hp).toBe(0);
    expect(p.isDead()).toBe(true);
  });
});

// ボス被弾モデル(弾命中 → HP 減少 → フェーズ遷移 → 撃破)
class BossModel implements Damageable {
  hp: number = BOSS.maxHp;
  maxHp: number = BOSS.maxHp;
  takeDamage(amount: number): void {
    this.hp = applyDamageToHp(this.hp, amount);
  }
  isDead(): boolean {
    return isDead(this.hp);
  }
  phase() {
    return bossPhaseForHp(this.hp, this.maxHp);
  }
}

describe('ボス撃破フロー', () => {
  it('チャージ弾命中で通常弾より速く HP が減る', () => {
    const a = new BossModel();
    const b = new BossModel();
    a.takeDamage(createProjectileSpec('normal').damage);
    b.takeDamage(createProjectileSpec('charged').damage);
    expect(b.hp).toBeLessThan(a.hp);
  });

  it('HP が 50% 以下になると phase2 に遷移する', () => {
    const boss = new BossModel();
    expect(boss.phase()).toBe('phase1');
    boss.takeDamage(BOSS.maxHp * 0.5);
    expect(boss.phase()).toBe('phase2');
  });

  it('phase2 移行後もボス行動に jump が現れうる(攻勢強化)', () => {
    const boss = new BossModel();
    boss.takeDamage(BOSS.maxHp * 0.6); // phase2 へ
    const phase = boss.phase();
    const actions = new Set(
      Array.from({ length: 200 }, (_, i) => pickNextBossAction(phase, 'idle', () => (i + 0.5) / 200)),
    );
    expect(actions.has('jump')).toBe(true);
  });

  it('チャージ弾を撃ち込み続けるとボスを撃破できる(クリア条件)', () => {
    const boss = new BossModel();
    const chargedDmg = createProjectileSpec('charged').damage;
    let hits = 0;
    while (!boss.isDead()) {
      boss.takeDamage(chargedDmg);
      hits++;
      if (hits > 1000) break; // 無限ループ保険
    }
    expect(boss.isDead()).toBe(true);
    expect(hits).toBe(Math.ceil(BOSS.maxHp / chargedDmg));
  });
});
