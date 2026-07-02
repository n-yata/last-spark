import { defineConfig, devices } from '@playwright/test';

// E2E 用サーバーのポート。既定 4173。複数セッション(worktree)が並行で E2E を回すと、
// reuseExistingServer が「別 worktree のサーバー」を掴んで自分のビルドを検証しない事故が
// 起きるため、E2E_PORT で worktree ごとに専用ポートへ分離できるようにする。
const port = Number(process.env.E2E_PORT ?? 4173);

// 横向き(ランドスケープ)・両手持ち専用の前提を E2E でも再現する。
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // リアルタイム描画・物理のゲームを実操作で検証するため、並列インスタンスが多いと
  // フレーム供給を奪い合い、タイミング依存のテスト(命中/移動/シーン遷移)が不安定になる。
  // 特に通しプレイ(約40秒・CPU集約)が他テストを枯渇させるので、worker 数を絞って競合を防ぐ。
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-landscape',
      use: {
        ...devices['Pixel 5 landscape'],
      },
    },
  ],
  webServer: {
    // strictPort: 指定ポートが塞がっていたら別ポートへ逃げず失敗させる。逃げてしまうと
    // Playwright は url(旧ポート=他人のサーバー)に対してテストを流してしまう。
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
