# DR-4 engine / UGC / asset pipeline deep research log

- Date: 2026-09-06 (Asia/Tokyo)
- Branch: `arena/01a0748a-cod-web`
- Scope: docs-only deep research. No implementation.

## Start checks

- `git status --short`: clean
- `git branch --show-current`: `arena/01a0748a-cod-web`
- `git log -5 --oneline`: HEAD `a09a374 docs(DR-3): add deeper competitor research`
- Read fully before research:
  - `AGENTS.md`
  - `.agent/hooks/pre-task.md`
  - `.agent/skills/index.md`
  - `docs/task-list.md`
  - `docs/planning/DEEP_RESEARCH_PLAN.md`
  - `docs/research/DR-3_DEEPER_COMPETITOR_RESEARCH.md`
  - `docs/research/README.md`
  - `docs/README.md`
  - `docs/arch/legal.md`
  - `docs/arch/ugc.md`
  - `docs/arch/protocol.md`
  - `docs/arch/client.md`
  - `docs/arch/sim-profiles.md`
  - `docs/arch/api-sources.md`

## Web research

Used `web_search` with `depth: "3"` only for:

- Noa API / chunk loading / components
- `voxel-physics-engine`
- `ent-comp` / `micro-game-shell` / `game-inputs`
- `nipplejs`
- QuickJS sandbox options
- glTF / GLB validation and optimization pipeline

Fetched npm/official docs:

- `https://registry.npmjs.org/voxel-physics-engine/latest`
- `https://registry.npmjs.org/ent-comp/latest`
- `https://registry.npmjs.org/micro-game-shell/latest`
- `https://registry.npmjs.org/game-inputs/latest`
- `https://registry.npmjs.org/nipplejs/latest`
- `https://jsr.io/@sebastianwessel/quickjs`
- `https://sebastianwessel.github.io/quickjs/docs/runtime-options.html`
- `https://www.khronos.org/gltf/`

## Clone checks

Confirmed public GitHub clones and recorded metadata in DR-4:

- `fenomas/noa`: `/tmp/cod-web-research/noa`, HEAD `bd74cd8add3abf216b53a995139276af665b1d52`, MIT
- `fenomas/voxel-physics-engine`: `/tmp/cod-web-research/voxel-physics-engine`, HEAD `53685b1219eba404fbf7ad35216f8c593ed0db41`, MIT
- `fenomas/ent-comp`: `/tmp/cod-web-research/ent-comp`, HEAD `ad16110528a5ad44bedbf66c1dfbdc1aba5e6778`, package/README MIT, license file not found
- `fenomas/micro-game-shell`: `/tmp/cod-web-research/micro-game-shell`, HEAD `fce4465e871944b4bc296aae0dc7e20092959ebf`, package/README ISC, license file not found
- `fenomas/game-inputs`: `/tmp/cod-web-research/game-inputs`, HEAD `1bcdfd60ee09a6c492a91981f3e6d01c28f7608a`, package/README ISC, license file not found
- `yoannmoinet/nipplejs`: `/tmp/cod-web-research/nipplejs`, HEAD `ea425b3e81deaed14e384a2edcfbbd6a9a50f45b`, MIT
- `sebastianwessel/quickjs`: `/tmp/cod-web-research/quickjs`, HEAD `25e5ed6ab75c212fff21935599afc3eb41439e6d`, MIT
- `KhronosGroup/glTF-Validator`: `/tmp/cod-web-research/glTF-Validator`, HEAD `434283be08a668a8fb4e437145630ddbf93b0686`, Apache-2.0 + NOTICES
- `donmccurdy/glTF-Transform`: `/tmp/cod-web-research/glTF-Transform`, HEAD `01cad7b8e516b334bb2ac3e7e662231ba017352b`, MIT

## Files changed

- `docs/research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md`
- `docs/research/README.md`
- `docs/README.md`
- `docs/task-list.md`
- `docs/planning/DEEP_RESEARCH_PLAN.md`
- `docs/arch/api-sources.md`
- `.agent/logs/2026-09-06_dr-4-engine-ugc-source-research.md`

## Validation

- Markdown relative link check (current docs/.agent only): `checked 68 md files, 170 relative links`, `broken 0`
- `bun run typecheck`: pass
- `bun run lint`: pass (`biome.json` schema 2.5.11 vs CLI 2.5.12 info only)
- `bun run test:unit`: pass (`72 passed`)
- `bun run build`: pass (Vite chunk size warning only)
