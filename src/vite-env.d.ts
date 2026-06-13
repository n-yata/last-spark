/// <reference types="vite/client" />

// ビルド時に注入するカスタム環境変数の型。
// VITE_DEV_MODE='true' のとき、本番ビルドでも開発モード(ステージ選択)を有効化する。
// GitHub Pages デプロイ(確認用環境)でのみ有効化し、素の本番ビルドでは無効のまま。
interface ImportMetaEnv {
  readonly VITE_DEV_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
