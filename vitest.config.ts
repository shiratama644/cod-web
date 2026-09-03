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
      '@': path.resolve(rootDir, 'src'),
      '@shared': path.resolve(rootDir, 'shared'),
    },
  },
  test: {
    // 既定は jsdom（クライアント/R3F コンポーネント用）。
    // shared/ と server/ の純粋ロジックはファイル先頭の
    // `// @vitest-environment node` で DOM 非依存に切り替える。
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'shared/**/*.{test,spec}.ts',
      'server/**/*.{test,spec}.ts',
    ],
    css: false,
  },
})
