import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

// DATABASE_URL 未設定時は compose.yaml(ルート)のデフォルト構成に接続する
const fallbackUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/app_db'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? fallbackUrl,
  },
})
