# プロジェクト運用ガイド

## 技術スタック

- Node.js v24 系（`.nvmrc` で固定。CI は Node 22 で検証）
- TypeScript 5.x
- パッケージマネージャーは npm（ロックファイル同期のため `npm ci` を推奨）

## 作業前の確認

新しい実装や修正を始める前に、必ず以下を確認すること。

1. この `AGENTS.md` を読む
2. 関連する永続ドキュメント（`docs/`）を読む
3. `rg` で既存の類似実装を検索する
4. 既存パターンを理解してから変更に入る

## スペック駆動開発の基本

基本フロー:

1. 永続ドキュメント（`docs/`）で「何を作るか」を定義する
2. ステアリングファイル（`.steering/`）で「今回何をするか」を計画する
3. `tasklist.md` に沿って実装し、進捗を更新する
4. テストと動作確認を行う
5. 必要に応じてドキュメントを更新する

ドキュメントを新規作成するときは、1ファイルずつ作成し、各ファイルごとにユーザー承認を得てから次へ進むこと。

## ドキュメント構成

### 永続ドキュメント（`docs/`）

- `docs/ideas/`: 下書き、壁打ち、技術調査メモ
- `docs/product-requirements.md`: PRD
- `docs/functional-design.md`: 機能設計
- `docs/architecture.md`: 技術仕様
- `docs/repository-structure.md`: リポジトリ構造
- `docs/development-guidelines.md`: 開発ガイドライン
- `docs/glossary.md`: 用語集
- `docs/story.md`: ストーリー設定書。世界観や演出方針の北極星

### 作業単位ドキュメント（`.steering/`）

作業ごとに `.steering/[YYYYMMDD]-[task-name]/` を作る。

- `requirements.md`: 要求内容
- `design.md`: 実装アプローチ
- `tasklist.md`: タスクリスト
- `retrospective.md`: 実装後の振り返り

軽微な作業でも、再発防止や設計判断として残す価値があるなら `retrospective.md` だけを残すこと。学びがない単純修正なら不要。

## Git 運用

- `master` への直接コミットは禁止
- 実装・修正は必ず `feature/<description>` ブランチで行う
- 作業開始前に最新 `master` から `git worktree add ../last-spark-<description> -b feature/<description> master` で専用 worktree を切る
- 作業完了時は、必要なら `retrospective.md` を同じブランチに含め、最新 `master` を取り込んだうえでコミットする
- マージ方式は Merge commit
- マージ後は feature ブランチと作業用 worktree を削除する
- 自分の作業範囲外の変更はコミットに巻き込まない

## セキュリティとコミット

- コミット前には必ず `security-engineer` 観点のセキュリティレビューを行う
- Critical / High の指摘があれば修正してからコミットする
- `git commit` / `git push` の `--no-verify`、`-n`、`--no-gpg-sign` は使用禁止

## テスト方針

- 実際の機能を検証するテストを書く
- `expect(true).toBe(true)` のような無意味なアサーションは禁止
- 具体的な入力と期待結果を検証する
- テストを通すためだけのハードコードや `if (testMode)` のような本番分岐は禁止

## 既存 Claude 資産

- 旧 Claude Code 資産は `.claude/` に残っている
- command / skill / agent を追加・削除・リネームしたら `.claude/README.md` も同時に更新する
- Codex 用の設定は `.codex/` に置く
- Codex 用の repo ローカル skill は `.agents/skills/` に置く
- Codex では Claude の `/command` はそのまま使えない。repo ローカル skill は基本的に `$skill-name` または自然言語で呼び出す（例: `$plan-feature`, `$add-feature`, `$review-docs`, `$setup-project`）

## Codex 移行・運用ルール

- Claude Code に対応する構成を Codex へ移すときは、**最初から Claude 側と同等の情報密度・運用品質を目標にすること**。`動くだけ` の薄い暫定版を完成形として置いてはいけない。
- custom agent を作るときは、**役割説明だけで終わらせず**、少なくとも以下を含めること:
  - 開始報告と完了報告
  - 口調・キャラクター
  - 専門領域
  - 作業アプローチ
  - 出力フォーマット
  - 必須チェック観点または禁止事項
- `skills` / `agents` / `hooks` / `config` の移行では、**構文上成立する最小構成より、実際に人が運用しやすい自然な構成を優先すること**。
- 構成変更を提案するときは、実施前に以下を明確にすること:
  - なぜその構成にするのか
  - もっと単純な代替案があるか
  - Claude Code と比べて何が増え、何が減るか
- 永続化すべき再発防止ルールやユーザーからの重要な運用フィードバックは、**memory を有効化しただけで完了扱いにせず**、必要に応じて `AGENTS.md` などの明示的な checked-in ドキュメントにも反映すること。
