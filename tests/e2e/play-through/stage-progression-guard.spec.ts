import { test, expect, type Page } from '@playwright/test';
import { waitForScene, startGame } from '../_helpers';

// 多重遷移ガード(transition.fading)の「居残り」回帰テスト。
//
// 【捉えるバグ】
// シーン遷移ヘルパ transitionTo は scene.data の 'transition.fading' キーで多重遷移を防ぐ。
// このキー(Phaser DataManager)は scene.start() による再起動をまたいで永続する。
// GameScene は stage1→stage2→… と同一インスタンスを再利用して継続するが、ガードを
// false へ戻す fadeIn() は、以前は演出ありステージ(stage1/4/5)の finishIntro でしか
// 呼ばれなかった。そのため:
//   1. stage1 クリア → GameScene の transitionTo でガード=true のまま ClearScene へ
//   2. ClearScene の continue → GameScene を stage2 で再起動。stage2 は「演出なし」のため
//      fadeIn を一度も呼ばず、ガードが true のまま居残る
//   3. stage2 クリア → GameScene の transitionTo がガード true で早期 return し、遷移が
//      握り潰される =「クリアしても次のステージに進めない」
// 症状(stage1→2 は通るが stage2→3 で詰まる)と一致する。
//
// 【修正】
// GameScene.startIntro() の演出なし分岐で fadeIn(this) を呼び、演出なしステージ入場時に
// 必ずガードを false にリセットする。
//
// 【このテストの検証方針(決定的・非フレーク)】
// バグの発生には「GameScene 自身の本物のクリア遷移(transitionTo)でガードが true になっている」
// ことが不可欠。そこで stage1 では本物のクリア確定処理 finishStageClear() を呼んで
// transitionTo を発火させ(撃破の不確定性を避けつつ、撃破後と同じ遷移経路を通す)、GameScene の
// ガードを true にした状態から ClearScene→stage2 再起動へ進める。
//   - 核心: stage1 のクリア遷移でガードが true になり、stage2(演出なし)再起動後に false へ
//     戻っていること。revert すると true が居残り(バグ再現)、修正があれば false になる。
//   - 振る舞い補強: stage2 でも同様に本物のクリア遷移を起こし、ガード居残りがなければ ClearScene
//     へ実際に遷移できること(=「クリア後に次へ進める」)を確認する。
//
// finishStageClear は private だが、boss-damage.spec.ts が spawnBoss を直接呼ぶのと同じく、
// 公開 game インスタンス経由でシーンの内部メソッドを叩いて本番の遷移経路を再現する。
//
// 補足: テスト用ビューポートのリサイズ過渡で OrientationScene が GameScene を一時 pause する
// ことがある(実機の手動プレイでは起きない過渡)。ガードは scene.data に保持され pause と独立な
// ため検証自体は成立するが、ClearScene→GameScene 再起動の決定性のため、continue 前に
// OrientationScene を畳んで GameScene を resume し、実機同様のクリーンな状態へ揃える。

const FADING_KEY = 'transition.fading';

/** GameScene の private stageId を読む(init で data から取り込まれる開始ステージ)。 */
async function readGameSceneStageId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const gs = window.lastSpark?.scene.getScene('GameScene') as unknown as {
      stageId?: string;
    } | null;
    return gs?.stageId ?? null;
  });
}

/** GameScene の多重遷移ガード(scene.data の transition.fading)の現在値を読む。 */
async function readGameSceneFadingGuard(page: Page): Promise<unknown> {
  return page.evaluate((key) => {
    const gs = window.lastSpark?.scene.getScene('GameScene');
    // data 未生成なら未定義を返す(false と区別する)。
    return gs?.data?.get(key);
  }, FADING_KEY);
}

/**
 * GameScene 自身に本物のクリア遷移を起こさせる(finishStageClear→transitionTo)。
 * これにより GameScene のガード(transition.fading)が true になり、ClearScene へ遷移する。
 * 撃破そのものは行わず(命中の不確定性を排除)、撃破後と同じクリア確定処理を直接叩く。
 */
async function triggerRealClearTransition(page: Page): Promise<void> {
  await page.evaluate(() => {
    const gs = window.lastSpark!.scene.getScene('GameScene') as unknown as {
      finishStageClear: (clearTimeMs: number) => void;
      ended: boolean;
    };
    // 撃破時と同様に update ループを止めてからクリア確定処理を走らせる。
    gs.ended = true;
    gs.finishStageClear(60_000);
  });
  await waitForScene(page, 'ClearScene');
}

/**
 * ClearScene の continue を本物の遷移パスで送り、GameScene を nextStageId で再起動させる。
 * GameScene が nextStageId で create 済み(init で stageId 取り込み済み)になるまで待つ。
 * active 状態には依存しない(リサイズ過渡で pause していてもガード居残りは検証できる)。
 */
async function continueFromClear(page: Page, nextStageId: string): Promise<void> {
  // continue 前に過渡を排除して実機同様のクリーンな状態に揃える。
  await page.evaluate(() => {
    const game = window.lastSpark!;
    if (game.scene.isActive('OrientationScene')) game.scene.stop('OrientationScene');
    if (game.scene.isPaused('GameScene')) game.scene.resume('GameScene');
  });

  // ClearScene は create から 600ms 後に continue 入力(POINTER_DOWN)を受け付ける。
  // 受付開始後に canvas をクリックして proceed=本物の transitionTo(GameScene, {stageId:next}) を発火。
  await page.waitForTimeout(800);
  await page.locator('#game-root canvas').click();

  await expect
    .poll(async () => readGameSceneStageId(page), { timeout: 10_000 })
    .toBe(nextStageId);
}

test('ClearScene 経由で演出なしステージ(stage2)へ再起動すると、GameScene の多重遷移ガードが居残らない(stage2→3 で詰まる回帰)', async ({
  page,
}) => {
  await page.goto('/');

  // 1) stage1(演出あり)を通常開始し、GameScene を実行中にする。
  await startGame(page);
  await waitForScene(page, 'GameScene');

  // 2) stage1 を本物のクリア遷移で確定する。GameScene の transitionTo がガードを true にして
  //    ClearScene へ進む(=バグ発生に不可欠な「ガードが立った状態」を実経路で作る)。
  await triggerRealClearTransition(page);
  // この時点で GameScene のガードは true(クリア遷移で立った)。stage2 再起動でこれが居残るかが争点。
  expect(await readGameSceneFadingGuard(page)).toBe(true);

  // 3) ClearScene の continue で GameScene を stage2(演出なし)で再起動する。
  await continueFromClear(page, 'stage2');

  // 4) 【核心検証】stage2 再起動直後、多重遷移ガードが false に戻っていること。
  //    revert(startIntro の演出なし分岐で fadeIn を呼ばない)では、stage1 のクリア遷移で立った
  //    ガード(true)が居残り、transitionTo の早期 return 条件(=== true)に直撃して以降の stage2
  //    クリア遷移を握り潰す。修正があれば fadeIn でリセットされ false になる。
  expect(await readGameSceneStageId(page)).toBe('stage2');
  expect(await readGameSceneFadingGuard(page)).toBe(false);

  // 5) 【振る舞い補強】stage2 でも本物のクリア遷移を起こし、ガード居残りがなければ実際に
  //    ClearScene へ遷移できること(=「クリア後に次へ進める」)を確認する。
  //    revert ではガード true のため finishStageClear 内の transitionTo が早期 return し、
  //    ClearScene へ進めず triggerRealClearTransition の waitForScene がタイムアウトする。
  await triggerRealClearTransition(page);
  await continueFromClear(page, 'stage3');
  expect(await readGameSceneStageId(page)).toBe('stage3');
  // stage3 入場直後もガードはリセットされている(stage3 も演出なしステージ)。
  expect(await readGameSceneFadingGuard(page)).toBe(false);
});
