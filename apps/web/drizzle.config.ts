import 'dotenv/config'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { defineConfig } from 'drizzle-kit'

// 組み込み SQLite(ファイル DB)。保存先は SQLITE_PATH で上書き可
const sqlitePath = process.env.SQLITE_PATH ?? '.data/cod.sqlite'

// SQLite は親ディレクトリが無いと開けない(error 14)ため先に作る
mkdirSync(dirname(sqlitePath), { recursive: true })

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  dbCredentials: {
    url: `file:${sqlitePath}`,
  },
})
