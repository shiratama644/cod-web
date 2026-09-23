/// <reference types="vitest/config" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'apps/web/src'),
      '@cod/protocol': path.resolve(rootDir, 'packages/protocol/src'),
      '@cod/engine-core': path.resolve(rootDir, 'packages/engine-core/src'),
      '@cod/profile-fps': path.resolve(rootDir, 'packages/profile-fps/src'),
      '@cod/gamemode-api': path.resolve(rootDir, 'packages/gamemode-api/src'),
      '@cod/gamemode-sdk': path.resolve(rootDir, 'packages/gamemode-sdk/src'),
      '@cod/gameserver': path.resolve(rootDir, 'apps/gameserver/src'),
    },
  },
  test: {
    // Termux Proot-Distro では forks pool が
    // node_modules/.bun/vitest@.../dist/workers/forks.js を解決できず
    // MODULE_NOT_FOUND になるため、threads pool を使用。
    // 2026-09-23 Termuxログ: Cannot find module .../forks.js
    pool: 'threads',
    // 既定は jsdom（クライアント DOM コンポーネント用）。
    // packages/ と apps/gameserver の純粋ロジックはファイル先頭の
    // `// @vitest-environment node` で DOM 非依存に切り替える。
    //
    // テストファイルは全て ./_tests_/ 配下に集約し、ワークスペース構造をミラーする
    // （例: apps/web/src/lib/clamp.ts → _tests_/apps/web/src/lib/clamp.test.ts）。
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['_tests_/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text-summary', 'json-summary', 'lcov'],
      include: [
        'packages/protocol/src/**/*.{ts,tsx}',
        'packages/engine-core/src/**/*.{ts,tsx}',
        'packages/profile-fps/src/**/*.{ts,tsx}',
        'packages/gamemode-api/src/**/*.{ts,tsx}',
        'packages/gamemode-sdk/src/**/*.{ts,tsx}',
        'gamemodes/**/*.{ts,tsx}',
        'apps/web/src/**/*.{ts,tsx}',
        'apps/gameserver/src/**/*.{ts,tsx}',
      ],
      exclude: [
        // package public barrels: runtime behavior is covered through concrete modules.
        'packages/*/src/index.ts',
        // browser entrypoint: verified by build/E2E, not by jsdom unit coverage.
        'apps/web/src/main.tsx',
        // type-only transport contract; concrete behavior is in websocket.ts.
        'apps/web/src/game/net/transport.ts',
        // ambient references only.
        'apps/web/src/vite-env.d.ts',
      ],
      thresholds: {
        // EM2: meaningful coverage 85% for all metrics (statements/branches/functions/lines)
        // Baseline after EM1: 81.22%/76.02%/81.9%/82.8%
        // After EM2-A/B: 93.88%/86.19%/88.49%/95.56% (30 files/185 tests)
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
})
