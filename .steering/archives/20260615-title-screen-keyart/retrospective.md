# 振り返り: タイトル画面キービジュアル導入 (2026-06-15)

## 何をやったか
タイトル画面の背景を手続き描画(`drawBackdrop`)から、外部AI生成(ChatGPT)のキービジュアル一枚絵に差し替え。PR #78 でマージ済み。

## 学び・申し送り

### Claude Design への誤解（出発点）
- シャビの当初要望は「Claude Designでタイトル/カットシーンの静止画を生成」。しかし **Claude Design(DesignSyncツール)は画像生成機能ではなく**、claude.ai上のHTML/CSSデザインシステムを同期する仕組み。ゲームの一枚絵(SVG/Canvas)生成には使えない。
- Claude Code単体もAIラスター画像生成は不可。Codexも不可(コーディングモデル)。
- 結論: リッチな一枚絵が欲しい場合は **外部AI画像生成(ChatGPT等)で生成 → こちらでWebP化&組込み** が現実解。

### 技術的な定石(再利用可)
- PNG→WebP変換は `npx --yes sharp-cli@latest` で恒久依存を足さず実施(2MB→125KB)。
- 配置は既存 `CutsceneScene.drawBackground` の cover ロジックを踏襲し統一。
- 文字視認性は暗幕rect + shadow/stroke で確保。
- 詳細手順はメモリ `ai-image-to-game-webp-pipeline` に集約。

### プロセス
- worktree作成→実装→lint/test/build→Playwright実機確認→クルトワのセキュリティレビュー(メタデータ走査含む)→PR→マージ→worktree/ブランチ削除、まで一連を完走。
- 反省: node停止で全nodeプロセスをkillしたため、並行セッションのdevサーバを巻き込むリスクがあった。次回はポート指定(5173)で対象を絞る。

## 残課題（任意）
- 同じ絵柄でカットシーン6枚分の差し替えは未着手(シャビ判断待ち)。
