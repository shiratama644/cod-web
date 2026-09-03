import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
// host: true はサンドボックスのライブプレビュー（0.0.0.0 バインド）で必要。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@shared': path.resolve(rootDir, 'shared'),
    },
  },
  server: {
    host: true,
    port: 5173,
    // ライブプレビュー（e2b.app プロキシ配下）のホストを許可する。
    // dev サーバーはローカル/サンドボックス起動のみなので全許可で問題なし。
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
})
