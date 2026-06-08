# LAST SPARK

スマホで遊ぶ、ロックマン風 横スクロール2Dアクション(PWA / 完全オフライン)。

> 滅びたディストピア世界で目覚めた「最後のロボット」が、心を残した唯一の機械として暴走管理AIに抗う。

## 特徴(MVP)

- **横スクロールジャンプアクション**: 走行(方向ゾーン式)・ジャンプ・足場越え・落下死・カメラ追従。
- **ショット**: タップで通常弾、長押しでチャージショット。
- **ステージ → ボス戦**: 雑魚敵を倒して進み、2フェーズ + 重み付き行動抽選を持つ守護機械(大型警備機)と対決。
- **スマホ向けハイブリッドタッチ操作**: 横向き・両手持ち専用。左半分=移動、右半分=ジャンプ/ショット仮想ボタン。マルチタッチ対応。
- **PWA / 完全オフライン**: ホーム画面に追加可能、Service Worker でオフライン起動、進捗は `localStorage` に保存(サーバ通信なし)。

## 技術スタック

| 分類 | 技術 |
|------|------|
| 言語 | TypeScript 5.x |
| ゲームエンジン | Phaser 3(Arcade Physics) |
| ビルド/開発サーバ | Vite 5 |
| PWA | vite-plugin-pwa(Workbox) |
| テスト | Vitest(ユニット/統合)/ Playwright(E2E) |
| 静的解析 | ESLint + Prettier |

詳細は `docs/` を参照(PRD / 機能設計 / アーキテクチャ / リポジトリ構造 / 開発ガイドライン / 用語集)。

## セットアップ

```bash
npm install
npm run dev        # 開発サーバ(Vite)
```

ブラウザの開発者ツールで端末をスマホ・横向きにすると操作感を確認できます。
キーボード操作(開発時): ← → 移動 / Space ジャンプ / J ショット(長押しでチャージ)。

## スクリプト

| コマンド | 内容 |
|----------|------|
| `npm run dev` | 開発サーバ起動 |
| `npm run build` | 本番ビルド(型チェック + Vite + PWA 生成) |
| `npm run preview` | ビルド成果物のプレビュー |
| `npm test` | ユニット/統合テスト(Vitest) |
| `npm run test:e2e` | E2E テスト(Playwright) |
| `npm run lint` | ESLint |
| `npm run typecheck` | 型チェック(tsc --noEmit) |
| `npm run gen:icons` | PWA アイコン生成(`public/icons/`) |

## アーキテクチャ

クライアント内レイヤードアーキテクチャ(依存は上から下への一方向):

```
scenes/   (画面・状態・入力受付)
   ↓
systems/  (入力解釈・戦闘・出現・ボスAI)
   ↓
entities/ (Player / Enemy / Boss / Projectile)
   ↓
config/ , types/   (定数・共有型)

scenes/ → persistence/ (SaveManager → localStorage)
```

ゲームのチューニング値は `src/config/balance.ts` に集約しています(マジックナンバーをコードに直書きしない方針)。

## アセットについて

本 MVP のグラフィックは Phaser の図形描画で実行時に生成したプレースホルダです(`src/scenes/PreloadScene.ts`)。第三者の知的財産は使用していません。詳細は [CREDITS.md](./CREDITS.md) を参照。

## スコープ外(Post-MVP)

武器交換システム / 2ステージ目以降・複数ボス / オンライン要素(ランキング等) / ログイン・課金・広告。
