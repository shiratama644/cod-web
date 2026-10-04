import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow the Arena sandbox live-preview host (https://{port}-{sandboxId}.e2b.app)
  allowedDevOrigins: ['*.e2b.app'],
  // @libsql/client はネイティブバイナリを含むためバンドルせず Node 側で解決する
  serverExternalPackages: ['@libsql/client'],
}

export default nextConfig
