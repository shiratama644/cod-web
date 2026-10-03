# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

本リポジトリは常に `main` ブランチが最新です。セキュリティ修正は `main` に直接適用されます。

## Reporting a Vulnerability

セキュリティ脆弱性を見つけた場合は、**公開の Issue ではなく**以下の方法で非公開に報告してください。

1. **GitHub Security Advisories**(推奨):
   - <https://github.com/shiratama644/cod-web/security/advisories/new>
   - 「Report a vulnerability」から非公開で報告できます

報告には以下を含めてください:

- 影響を受けるコンポーネント(例: `apps/gameserver`、`packages/protocol`)
- 再現手順または PoC
- 想定される影響(例: サーバー権威の迂回、チート可能性)

## Scope

特に以下は重点領域です:

- サーバー権威シミュレーションの迂回(クライアント側での状態改ざん)
- プロトコル(バイナリ encode/decode)の境界検査不備
- 依存パッケージの既知脆弱性(`bun run security:check` で検査)
