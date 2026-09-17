# DOC-5 — official / UGC 階層とエディタ方針の反映

> Date: 2026-09-06(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザー指示: fps / voxel の中に `official` と `ugc` がある階層へ整理し、Krunker.io のようなマップ/ワールドエディタ、Babylon.js 製 GLB 読み込み対応エディタ、voxel 公式の Minecraft 風地形生成と Noa 系ライブラリ候補を仕様へ反映する。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---|---|---|
| 1 | 公式確認 | Babylon glTF/GLB loader、SceneLoader typedoc、`@babylonjs/loaders` npm、`micro-game-shell` / `game-inputs` / `nipplejs` npm metadata を確認 |
| 2 | `docs/arch/editor.md` | `/fps|voxel/{official|ugc}/<slug>`、FPS/voxel エディタ、GLB 読み込み、voxel 公式 terrain generator、UGC 方針を新規仕様化 |
| 3 | `docs/arch/product.md` / `architecture.md` / `types.md` | `official` / `ugc` を Game Type ではなく Content Source として定義し、GameMode metadata に `source` / `slug` を追加 |
| 4 | `docs/arch/sim-profiles.md` / `ugc.md` / `matchmaker.md` | voxel 公式/UGC、Noa 系依存候補、UGC URL、matchmaker の source filter を反映 |
| 5 | `docs/arch/api-sources.md` / `legal.md` | GLB loader と Noa 系依存の公式確認情報・ライセンスを追記 |
| 6 | `README.md` / `docs/README.md` / `docs/arch/README.md` / skills | 新仕様の入口と実践知見を更新 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- `official` / `ugc` は type ではなく Content Source として扱うのが、既存の L2 `fps` / `voxel` 分離と矛盾しない。
- Babylon 公式は GLB/glTF 読み込みに `@babylonjs/loaders` を推奨し、`SceneLoader` class より module-level functions を推奨している。
- `@babylonjs/loaders@9.25.0` は `@babylonjs/core ^9.0.0` peer。Noa は `@babylonjs/core ^6.1.0` peer のため、fps editor / voxel client の Babylon major は導入時に再確認が必要。
- Minecraft 風地形生成は一般的なノイズ/バイオーム手法の独自実装として書く。Minecraft のコード・アセット・商標表現は流用しない。

## 4. 検証

- `bun run typecheck`: pass
- `bunx biome lint .`: pass（既存 `$schema` 2.5.11 vs CLI 2.5.12 の info あり）
- `bun run test:unit`: pass（11 files / 72 tests）
- `bun run build`: pass（既存 large chunk warning あり）
- markdown relative link check: 33 md files checked / broken 0

## 5. 次にすべきこと (Next Actions)

次の実装タスクは引き続き PH1-A（bun workspaces + fps 系へ移動）。エディタ本体や voxel 公式 terrain generator は後続フェーズで、PH1-A には混ぜない。
