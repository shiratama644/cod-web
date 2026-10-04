import { defineConfig } from '@neon/config/v1'

// Neon バックエンド宣言(backend as code)。`neon deploy` がブランチへ反映する。
//   - Postgres はデフォルトで有効(プロジェクト: misty-sea-87909993 / DB: cod / PG 18)
//   - auth: true = Neon Auth を有効化(deploy 時に認証用の環境変数が .env へ注入される)
export default defineConfig({
  auth: true,
})
