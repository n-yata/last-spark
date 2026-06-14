import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // コアロジック(純粋関数)を対象にカバレッジを測る
      include: ['src/systems/**/*.ts', 'src/persistence/**/*.ts', 'src/config/**/*.ts'],
      // 以下の System クラスは Phaser.Scene / Arcade Physics への依存が強く jsdom で
      // 単体テストできないため、カバレッジ計測から除外する(実挙動は E2E で検証する)。
      // systems/ に新しい純粋関数を足す場合は除外不要 — Phaser 依存の System クラスのみここに追加する。
      exclude: [
        'src/systems/InputController.ts',
        'src/systems/CombatSystem.ts',
        'src/systems/SpawnSystem.ts',
      ],
    },
  },
});
