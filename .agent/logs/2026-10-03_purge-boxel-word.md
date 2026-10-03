# 2026-10-03 旧タイポ単語の全削除(ユーザー指示)

## 指示
- ユーザーの旧タイポ単語(voxel の誤記)を**ドキュメント含むリポジトリ全体から完全に削除**する。
  「タイポだった」という注記自体も、当該単語を含まない表現に書き換える。
- **voxel は今後追加予定だが、今は絶対に追加しない**(standing rule。既存の fps 先行・voxel は契約のみ方針と整合。
  `TYPE_SPECS.voxel` 等の既存 contract-only コードは現状維持、新規 voxel 実装は一切行わない)。

## 実施内容
- 12 ファイル・17 箇所を書き換え(grep -i で残存 0 件を確認):
  - cspell.json: `flagWords` 行ごと削除
  - .agent/: README.md、skills/gamemode-api/SKILL.md、logs×2(ユーザー明示指示によるため append-only の例外)
  - docs/: Perplexity-AI.md(転記ログ内も voxel に訂正)、arch/architecture.md、task-list.md、
    planning/{HANDOFF(D22), SANDBOX_FILTER_DISCUSSION(見出し含む4箇所), SANDBOX_FINAL_AGREED, SANDBOX_SPEC整理}
- cspell 辞書の `voxel` / `voxels` は**維持**(SimProfile.ts・gamemode-api・TYPE_SPECS 等の既存コードが使用中のため)。

## 検証(実測)
- grep -rni(.git/node_modules 除外): 当該単語 0 件
- `bun run spell`: 0 issues / `bun run verify:docs`: PASS / `bunx biome lint cspell.json`: OK
