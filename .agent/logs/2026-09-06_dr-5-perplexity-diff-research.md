# DR-5 Perplexity Diff Research Log

## Scope

- User added `docs/Perplexity-AI.md` and asked to understand all of it, compare it with previous DeepResearch, and make the differences accurate.
- Treated as docs-only research.
- No competitor live service connection analysis, traffic capture, production bundle/minified client analysis, or asset/code reuse.

## Files read

- `docs/Perplexity-AI.md` (full file)
- `docs/research/DR-1_COMPETITOR_DEEP_RESEARCH.md`
- `docs/research/DR-2_ADDITIONAL_SOURCE_RESEARCH.md`
- `docs/research/DR-3_DEEPER_COMPETITOR_RESEARCH.md`
- `docs/research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md`
- `docs/task-list.md`
- `docs/planning/DEEP_RESEARCH_PLAN.md`
- `docs/research/README.md`
- `docs/README.md`
- `docs/arch/api-sources.md`
- `docs/arch/adr.md`
- `docs/arch/protocol.md`
- `docs/arch/server.md`
- `package.json`
- `server/index.ts`
- `server/net/ingest.ts`
- `server/net/rate-limit.ts`
- `server/net/snapshot.ts`
- `server/sim/Simulation.ts`
- `server/net/lagcomp-store.ts`
- `server/room/Room.ts`
- `shared/protocol/binary.ts`
- `shared/protocol/packer.ts`
- `shared/protocol/constants.ts`
- `src/game/net/GameClient.ts`
- `src/game/net/websocket.ts`
- `src/game/net/interpolation.ts`
- `src/game/net/prediction.ts`
- Existing clone: `/tmp/cod-web-research/code-api/README.md`

## Web research

All web searches used `depth: "3"`.

Fetched/confirmed:

- <https://bun.com/docs/runtime/http/websockets>
- <https://bun.com/guides/http/cluster>
- <https://docs.colyseus.io/matchmaker>
- <https://docs.colyseus.io/scalability>
- <https://krunker.io/docs/settings.txt>
- <https://docs.krunker.io/guides/multiplayer-networking>
- <https://docs.krunker.io/api/network>
- <https://docs.krunker.io/guides/data-storage>
- <https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock>
- <https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext>
- <https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances>
- <https://doc.babylonjs.com/typedoc/classes/BABYLON.Mesh>
- <https://agones.dev/site/docs/reference/gameserverallocation/>
- <https://gafferongames.com/post/snapshot_compression/>
- <https://www.bloxdforge.com/studio/wiki/guides/coding-guide>
- <https://jakob.space/blog/browser-games-aren-t-an-easy-target.html>

Fetch failed:

- `https://rat.dev/hrt/AnticheatJS` failed. The source was not used as a factual basis beyond noting that cheat/reverse-engineering sources are low-trust and not design inputs.

## GitHub clone inventory checked

- `/tmp/cod-web-research/code-api`
  - remote: `https://github.com/Bloxdy/code-api.git`
  - HEAD: `675b56d94a2d56bb19924ff7a8dfa83710105536`
  - license file: none found
  - read: `README.md`
- `/tmp/cod-web-research/texture-packs`
  - remote: `https://github.com/Bloxdy/texture-packs.git`
  - HEAD: `cdb31ca160f0db2bcb1d1443261feef1708620ab`
  - license file: none found
  - only path/HEAD/license existence was rechecked in this task; content conclusions remain in DR-3/DR-4.

## Changes

- Added `docs/research/DR-5_PERPLEXITY_DIFF_RESEARCH.md`.
- Updated `docs/arch/api-sources.md` with primary-source entries for Bun `reusePort`, Colyseus scalability, Agones allocation, Krunker `settings.txt`, MDN Canvas attributes, and Babylon thin instances.
- Updated `docs/research/README.md` and `docs/README.md` indexes.
- Updated `docs/planning/DEEP_RESEARCH_PLAN.md` with DR-5 subtask and evidence row.
- Updated `docs/task-list.md` with completed DR-5 row.

## Key conclusions

- Perplexity's current-code critique included several stale items: Input is now 16B, length/bounds validation exists, rate limiting exists, Bun WS compression/backpressure options are set, snapshot sends use `subarray`, lagcomp recording is connected, and fuzz testing is recorded.
- Still-real issues: no AOI, no delta snapshots, single Room/single process, no matchmaker/seat reservation implementation, no TimeSync implementation, WebTransport remains future-only, and zero-allocation hot paths still have allocations.
- Krunker live matchmaker endpoint details, WSS subdomain hashing, social WS/msgpack, anti-cheat/WASM internals, and hosting-provider guesses are not safe/primary design inputs.
- Useful primary additions: Bun `reusePort`, Colyseus scaling mechanics, Krunker settings key inventory, MDN Pointer Lock/Canvas attributes, Babylon thin instance constraints, and Agones allocation model.

## Validation

- Markdown relative link check: `checked 71 md files, 176 relative links`, `broken 0`.
- `bun run typecheck`: passed.
- `bun run lint`: passed. Existing Biome schema info only: schema 2.5.11 vs CLI 2.5.12.
- `bun run test:unit`: passed. 11 files / 72 tests.
- `bun run build`: passed. Existing Vite chunk-size warning only.
