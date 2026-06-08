import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// 完全オフライン PWA。サーバ通信を行わないため、すべてのアセットを
// プリキャッシュして 2 回目以降の起動を高速化する。
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'assets/**/*'],
      manifest: {
        name: 'LAST SPARK',
        short_name: 'LAST SPARK',
        description: '退廃の中の希望。ロックマン風 横スクロール2Dアクション',
        lang: 'ja',
        theme_color: '#0a0e14',
        background_color: '#0a0e14',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,json}'],
        // ゲームアセットは大きくなりうるため上限を引き上げる
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
