/**
 * ベンチマーク専用の Vitest 設定(TEMPLATE_REPO 由来・cod-web 向けに縮約)。
 * 通常テスト(vitest.config.ts)とは分離し、bench/ 配下のみを対象にする。
 * alias は vitest.config.ts と同方式(@cod/xxx → packages/xxx/src)。
 *
 * 実行: pnpm run bench
 */
import path from 'node:path'
import { defineConfig } from 'vitest/config'

const rootDir = __dirname

export default defineConfig({
  resolve: {
    alias: {
      '@cod/protocol': path.resolve(rootDir, 'packages/protocol/src'),
      '@cod/engine-core': path.resolve(rootDir, 'packages/engine-core/src'),
      '@cod/profile-fps': path.resolve(rootDir, 'packages/profile-fps/src'),
    },
  },
  test: {
    include: [],
    benchmark: {
      include: ['bench/**/*.bench.ts'],
    },
  },
})
