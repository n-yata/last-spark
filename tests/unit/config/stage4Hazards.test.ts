import { describe, it, expect } from 'vitest';
import { getStageData } from '../../../src/config/stage1';
import { STAGE } from '../../../src/config/balance';

// stage4「汚染地帯」の汚染溜まり(②新ギミック)の配置検証。汚染床は人間の荒廃の遺産であって
// 殺意の罠ではないが、ジオメトリ上は「落下死の奈落」と「汚染床(地面の上に乗れるダメージ床)」が
// 両立し、汚染床が地面の上に薄く敷かれていることを守る(汚染床が地面のない空中=奈落の上に浮くと、
// 踏む前に落下死してしまうため)。

describe('stage4 の汚染溜まり(ダメージ床)', () => {
  const stage = getStageData('stage4');
  const GROUND_TOP = STAGE.groundY;

  it('汚染溜まり(hazards)が定義されている', () => {
    expect(stage.hazards).toBeDefined();
    expect(stage.hazards!.length).toBeGreaterThan(0);
  });

  it('元の 1 つ目の奈落跡(1600付近)は地面で埋まっている(落下死ではなく汚染床に置換)', () => {
    // x=1620(元の奈落の内側)に、上に乗れる地面セグメントが存在すること。
    const x = 1620;
    const ground = stage.platforms.find(
      (p) => p.height > 40 && p.x <= x && x <= p.x + p.width && p.y === GROUND_TOP,
    );
    expect(ground).toBeDefined();
  });

  it('各汚染溜まりは地面の上(乗れる位置)に敷かれている=奈落の上に浮いていない', () => {
    for (const h of stage.hazards!) {
      const cx = h.x + h.width / 2;
      const groundBelow = stage.platforms.find(
        (p) => p.height > 40 && p.x <= cx && cx <= p.x + p.width && p.y === GROUND_TOP,
      );
      expect(groundBelow).toBeDefined();
      // 汚染床の下端は地面上端付近(プレイヤーが立つ足元)に来る。
      expect(h.y + h.height).toBeGreaterThanOrEqual(GROUND_TOP - 4);
      expect(h.y).toBeLessThan(GROUND_TOP);
    }
  });

  it('2 つ目の奈落(2900–2968)は従来どおり落下死として残っている', () => {
    // x=2934(2 つ目の奈落の内側)には地面が無い(穴)こと。
    const x = 2934;
    const ground = stage.platforms.find(
      (p) => p.height > 40 && p.x <= x && x <= p.x + p.width && p.y === GROUND_TOP,
    );
    expect(ground).toBeUndefined();
  });
});
