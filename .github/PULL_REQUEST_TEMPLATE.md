# 概要

<!-- この PR で何を変更したか、なぜ変更したかを簡潔に -->

## 変更種別

- [ ] 機能追加 / バグ修正 / リファクタ / ドキュメント / CI / その他

## 変更内容

- ...

## 関連 Issue

- Closes #<!-- issue番号 -->

## チェックリスト

### 品質ゲート(`bun run check:all` = 7 ゲート)

- [ ] `bun run check:all` が 7/7 PASS(install / lint / determinism / heavy / typecheck / test:unit / coverage)
- [ ] 決定論に関わる変更の場合、`bun run check:determinism:heavy` も確認した
- [ ] Next.js(apps/web)に触れた場合、`cd apps/web && bun run build` が通る

### 任意検査(該当する場合)

- [ ] `bun run verify:docs`(ドキュメントを変更した場合)
- [ ] `bun run security:check`(依存を追加・更新した場合)
- [ ] `bun run bench`(protocol/engine-core のホットパスに触れた場合)

### 運用

- [ ] コミットメッセージは Conventional Commits 形式
- [ ] `.agent/logs/` に作業ログを追加した(エージェント作業の場合)
- [ ] 公式アセット・名称を含まない(IP 境界 — メカニクス/数値のみ)
