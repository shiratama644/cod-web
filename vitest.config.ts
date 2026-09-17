/// <reference types="vitest/config" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'apps/web/src'),
      '@cod/protocol': path.resolve(rootDir, 'packages/protocol/src'),
      '@cod/engine-core': path.resolve(rootDir, 'packages/engine-core/src'),
      '@cod/profile-fps': path.resolve(rootDir, 'packages/profile-fps/src'),
    },
  },
  test: {
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
        // PH1.5-B ratchet: set just below/at the measured meaningful-coverage
        // floor so future changes cannot silently fall back to the PH1.5-A baseline.
        statements: 79,
        branches: 73,
        functions: 79,
        lines: 80,
      },
    },
  },
})
