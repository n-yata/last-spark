# 振り返り: RAY をカットアウト・リグへ差し替え (2026-06-16)

## 何をやったか
プレイヤー RAY の見た目を、手続き図形リグ → 外部生成キービジュアル(横向き)を切り分けたカットアウト・
リグへ差し替え。「イラスト画質 ＋ 関節歩行」を両立。PR #85 マージ済み(プレイヤーのみの縦切り)。

## 学び・申し送り

### AIキャラ絵 × 横スクロールの根本ジレンマ
- AIは「1枚の良い絵」は得意だが「同一キャラの連続アニメ」「厳密な横向き素体」は苦手。横スクロールは
  左右の向き/水平照準/脚の前後振りが要る。正面・3/4・腕下げの立ち絵は2回とも使えず、**指示を厳密化**
  (STRICT 90-degree side profile / NOT front / 腕脚を体から離す)してようやく横向きが出た。曖昧な指示は正面に逃げる。

### 解決の型: カットアウト・リグ([[sidescroller-needs-side-view-art]])
- 横向き1枚絵を**アルファ走査**で上半身/前脚/後脚に分離。**脚は股で交差するので矩形では切れず**、
  行ごとに左右クラスタへ塗り分けるマスクが必須だった(最初の矩形版は後脚に前脚が写り込み失敗)。
- `SpriteRig` を `CharacterRig` と同一I/Fのドロップイン置換にしたことで、Player 側の変更は3行(import/型/生成)で済んだ。
  既存の rigAnimation(legSwing/squashStretch/armRecoil/hitLean)もそのまま再利用。
- RAYは画面上~28×40pxと小さい→表示サイズを拡大(targetHeight 76)して絵を映えさせた(当たり判定は据え置き)。

### 検証
- `window.lastSpark` で `scene.start('GameScene',{stageId,skipCutscene:true})` → gameplay直行。
  カメラはstopFollow+centerOn+zoomで寄せて撮る。**シーンをpauseすると描画が凍結**して反映されないので、
  寄せる時は resume 状態で行う(pause→centerOnは前フレームのまま)。

### セキュリティ([[ai-image-to-game-webp-pipeline]])
- OpenAI gpt-image のPNGは C2PA来歴(`caBX`チャンク)を持つ。配布WebPは sharp 再エンコードでクリーンだが、
  マスターPNGをリポジトリに入れる場合は `-strip` 相当(sharp再保存)で除去してからコミット。

## 残課題
- idle 時も原画ストライド姿勢のまま(待機モーション未実装)。
- 敵/ボスの同様差し替え(別フェーズ)。マスター絵は `art-src/`(非配布)、再生成は `node scripts/cut-ray.mjs`。
