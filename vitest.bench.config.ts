/**
 * ベンチマーク専用の Vitest 設定(TEMPLATE_REPO 由来・cod-web 向けに縮約)。
 * 通常テスト(vitest.config.ts)とは分離し、bench/ 配下のみを対象にする。
 *
 * 実行: bun run bench
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [],
    benchmark: {
      include: ['bench/**/*.bench.ts'],
    },
  },
})
