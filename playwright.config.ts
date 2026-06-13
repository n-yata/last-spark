import { defineConfig, devices } from '@playwright/test';

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
    baseURL: 'http://localhost:4173',
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
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
