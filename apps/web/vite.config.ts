import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(appDir, '../..')

// ゲームサーバー（bun・ネイティブ WebSocket）のアドレス。
// 開発時は Vite dev サーバ（5173）が /ws をゲームサーバ（8080）へプロキシする。
const GAME_SERVER_TARGET = process.env.GAME_SERVER_URL ?? 'ws://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(appDir, 'src'),
      '@cod/protocol': path.resolve(repoRoot, 'packages/protocol/src'),
      '@cod/profile-fps': path.resolve(repoRoot, 'packages/profile-fps/src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    // ライブプレビュー（e2b.app プロキシ配下）のホストを許可する。
    allowedHosts: true,
    proxy: {
      // WebSocket をゲームサーバーへ中継（クライアントは同一オリジン /ws に接続）。
      '/ws': {
        target: GAME_SERVER_TARGET.replace(/^ws/, 'http'),
        ws: true,
        rewrite: () => '/',
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
    proxy: {
      '/ws': {
        target: GAME_SERVER_TARGET.replace(/^ws/, 'http'),
        ws: true,
        rewrite: () => '/',
      },
    },
  },
})
