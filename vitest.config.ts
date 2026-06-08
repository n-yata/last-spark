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
      exclude: ['src/systems/InputController.ts', 'src/systems/CombatSystem.ts', 'src/systems/SpawnSystem.ts'],
    },
  },
});
