# 2026-10-03 pnpm 移行の取り消し — bun へ復帰(ユーザー指示・D26 更新)

## 指示
「やっぱ bun に戻したい。commit 履歴から適切に戻すだけで戻せるはず」

## 実施内容
- 移行は単一コミット **c603528** に閉じていたため、`git revert c603528` で全 63 ファイルを復元
  (bun.lock・bunfig.toml 復活、pnpm-lock.yaml・pnpm-workspace.yaml 削除、scripts/CI/hooks/docs すべて bun 版へ)
- 例外対応:
  - `.agent/logs/2026-10-03_migrate-bun-to-pnpm.md` は revert で消えるため `git checkout c603528 --` で復元
    (追記専用ポリシー + pnpm 知見の保存。「revert 済み」追記)
  - `docs/planning/HANDOFF.md` D26 を「移行→同日取り消し、bun 統一が正」に書き換え(決定履歴の正確性)
- node_modules(pnpm 配置)を全削除 → `bun install --frozen-lockfile` で再構築(628 packages)
- グローバル pnpm は残置(無害。bun 運用には影響しない)

## 検証結果(実測)
- `bun run check:all`: 7/7 PASS
- `cd apps/web && bun run build`: 成功
- `bun run verify:docs` / `check:env` / `spell` / `bench`: PASS(bun 版スクリプトに復帰)
- `git log`: revert コミットとして履歴に記録(force push なし)

## 知見
- 大きな横断変更は 1 コミットに閉じると `git revert` 一発で戻せる(今回それが効いた)
- revert は追記専用ファイル(.agent/logs/)も巻き戻すため、ログだけ `git checkout <sha> -- path` で選択復元する
