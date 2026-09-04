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
      '@server': path.resolve(rootDir, 'server'),
    },
  },
  test: {
    // 既定は jsdom（クライアント/R3F コンポーネント用）。
    // shared/ と server/ の純粋ロジックはファイル先頭の
    // `// @vitest-environment node` で DOM 非依存に切り替える。
    //
    // テストファイルは全て ./_tests_/ 配下に集約し、ソース（src/shared/server）と
    // 同じディレクトリ構造をミラーする（例: src/lib/clamp.ts →
    // _tests_/src/lib/clamp.test.ts）。import は @/@shared/@server のエイリアスを使う。
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['_tests_/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
})
