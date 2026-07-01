# 振り返り: dpr=1 で canvas CSS サイズがビューポートに追従しないバグ修正

## 作業概要

- 対象: `src/systems/dprScaling.ts` の `apply()`
- 症状: devicePixelRatio=1 の環境(主にPCブラウザ)で、canvas の内部解像度(`scale.resize`)は
  ビューポートに追従するのに CSS 表示サイズ(`canvas.style`)が古いまま残り、表示がはみ出す。
  さらに調査の結果、リサイズ後だけでなく **dpr=1 の初回ロード時点で既に** config の暫定値
  (960x540)が style に焼き付いており、ビューポートと不一致だった。
- 修正: `setZoom(1/dpr)` → `resize()` の呼び出し順を `resize()` → `setZoom(1/dpr)` に入れ替え(実質1行)。

## 根本原因(Phaser 3 ScaleManager の2つの挙動の合わせ技)

1. `resize()` は `styleWidth !== width`(= zoom≠1)のときしか `canvas.style` を書かない
   (ScaleManager.js の resize 内 `if (styleWidth !== width || styleHeight !== height)`)。
   → dpr=1 (zoom=1) では resize が style を一切更新しない。
2. `setZoom()` は `_resetZoom` フラグ経由で `refresh()`→`updateScale()` の NONE 分岐が
   「**その時点の gameSize** × zoom」を style に書く。旧実装は setZoom を resize より
   **先に**呼んでいたため、常に「1世代前の寸法」が style に焼き付いていた。

dpr>1(モバイル)では 1. の条件が真になり resize 側が style を書くため顕在化しない。
モバイル前提で検証してきたプロジェクトの盲点だった。

## 学び・申し送り

- **Phaser Scale.NONE + zoom 併用時は「resize → setZoom」の順が正**。setZoom の
  `_resetZoom` 経路が「新しい gameSize × zoom」で style を書き、直後の refresh() が
  canvasBounds / displayScale を再計測するので、canvas.style 手書き(禁止事項)を
  使わずに表示と pointer 変換の整合が保てる。
- **dpr=1 は「zoom=1 だから何もしなくていい」経路ではない**。ScaleManager は
  zoom=1 のとき style 更新をスキップするため、むしろ dpr=1 だけ壊れる非対称がある。
  スケーリング系の変更は dpr=1(デスクトップ)と dpr=2(モバイル)の両方で e2e 検証する
  (`tests/e2e/orientation/dpr1-resize.spec.ts` に両方の回帰ガードを追加済み)。
- **Playwright(Chromium)では window resize と visualViewport resize の両リスナーが
  発火して2回 apply されるため、旧バグの「リサイズ後1世代遅れ」は2回目の apply で
  偶然追いついてマスクされる**。一方、初回ロードは apply が1回なので必ず露呈する。
  リサイズ追従のテストはロード直後の初期状態アサーションも必ず入れること
  (今回の赤確認は初期状態アサーションで検出できた)。
- 赤→緑の確認は `git stash push -- <対象ファイル>` で修正だけ退避して旧コードで
  テスト実行するのが手軽で確実だった。

## 検証結果

- 旧コードで新規 spec が赤(dpr=1 決定的ガードが rect=960 vs viewport=900 で失敗)を確認。
- 修正後: 新規 spec 3件 + 既存 orientation 系 6件(hidpi-resolution / fill-screen)全緑。
- lint / typecheck / vitest 648件 / e2e フルスイート / build 通過。
