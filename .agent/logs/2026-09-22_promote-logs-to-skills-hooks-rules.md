# Promote Logs to Skills/Hooks/Rules

> Date: 2026-09-22(JST) / Commit: TBD / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)

ユーザー指示: ログをすべて確認してSKILL・Hooks・Rules・AGENTS.mdなどに追加できるものは追加してください。

- 対象: `.agent/logs/` 50ファイル (2026-09-03〜2026-09-20) + `.claude/logs/2026-09-21_em2-coverage-85.md`
- 抽出: 再利用可能な知見を `.agent/skills/*/SKILL.md` へ昇格、 `skills/index.md` 更新、 hooks (`pre-task.md`, `verify-before-commit.md`, `log-task.md`, `index.md`) と `AGENTS.md` 更新
- 受け入れ: 全ログ読了、知見抽出、スキル追加、hooks/rules更新、commit/push to `arena/01a0b161-cod-web`

## 2. 実行内容 (Executed Actions)

| # | 対象 | 実装 |
|---|---|---|
| 1 | ログ読了 | `python` で全50+1ログの「気づいたこと」抽出、 `for f in .agent/logs/*.md` で残りも確認 |
| 2 | bun-runtime | `.agent/skills/bun-runtime/SKILL.md` 新規: npm経由導入唯一確実、restore-sandbox-env.sh devDependencies.bunからversion読む、Vitest維持判断、uWS注意 |
| 3 | networking | `.agent/skills/networking/SKILL.md` 新規: Bun.serve正しい使い方、ws.send戻り値-1/0/1+、Channel 1B+payload 16B=17B、Input 16B固定、rate limit 90/20/10/30/40、Room tickIfDue、handlers.ts分離でBun.serveモック、paused Setリーク対策 |
| 4 | deterministic-sim | `.agent/skills/deterministic-sim/SKILL.md` 新規: 禁止API、LCG、smoke 100x10 vs heavy 1000x100 0.8s分離、same-inputテスト Room.join(Peer) + getPlayer、ClientPrediction stepSeconds profile由来 |
| 5 | zero-alloc | `.agent/skills/zero-alloc/SKILL.md` 新規: EM01 B4-B13全対応、getPlayersIterable、encode once、InputQueue head indexリング、interpolation sampleHead、HistoryBufferリング、remotes Map再利用、players.map廃止、pending filter in-place |
| 6 | memory-leak | `.agent/skills/memory-leak/SKILL.md` 新規: EM01 B1-B3,B14、LagCompStore/inputQueues/paused/RateLimiterがleave時に残留、Room.leaveで全削除パターン、回帰テスト |
| 7 | import-boundaries | `.agent/skills/import-boundaries/SKILL.md` 新規: L1/L2/Apps依存方向、Biome noRestrictedImports/style配下、webでengine-core禁止、profile-fpsはengine-coreで禁止、createFpsSimProfile()唯一入口、workspace:*で十分、EngineOptions thinEngine.pureからimport |
| 8 | testing | `.agent/skills/testing/SKILL.md` 新規: include-all方針、baseline→meaningful→ratchet、95.12%/87.97%/90.7%/96.8%実績、handlers.ts 97.29%、BabylonGame 96.9% babylonDepsファサード、App 0%→100%モック、InputController 72%→95%、any禁止 |
| 9 | e2e | `.agent/skills/e2e/SKILL.md` 新規: Sandboxではbrowser実行捏造しない、webServer配列+PLAYWRIGHT_BASE_URL分岐、公式URL ci/test-webserver/api/class-websocket/mock#mock-websockets、discovery検証、相対URL+proxyでHUD検証 |
| 10 | ci-quality-gates | `.agent/skills/ci-quality-gates/SKILL.md` 新規: quality-gates.yml唯一正本、proposal yml 2026-09-22削除、inputs.job all/quality/e2e、oven-sh/setup-bun@v2、frozen-lockfile、playwright install --with-deps chromium、4+3検証 |
| 11 | docs-maintenance | `.agent/skills/docs-maintenance/SKILL.md` 新規: 読込順序 AGENTS→.claude→README→docs全文、索引に無いファイルは孤児、proposal削除ルール、内部リンク整合性チェックコードスパン除外、外部URL公式リスト、ミラー排除、5点出力 |
| 12 | babylon-engine | `.agent/skills/babylon-engine/SKILL.md` 新規: R3F排除 three-mesh-bvhは衝突用に残す、EngineOptions thinEngine.pureからimport、desynchronized/preserveDrawingBufferは渡さない、babylonDepsファサードでWebGLモック、lifecycle/resize/dispose、useEffectでimperative同期 |
| 13 | input-accumulation | `.agent/skills/input-accumulation/SKILL.md` 新規: requestPointerLock戻り値Promise判定、raw mouse NotSupportedErrorのみfallback、InputController蓄積/消費、WASD/矢印/Space、joystick deadzone 0.2/normalize、touch-ui、jsdom限界、量子化 |
| 14 | physics-collision | `.agent/skills/physics-collision/SKILL.md` 新規: three-mesh-bvh、acceleratedRaycast、kinematic controllerパターン、createFpsSimProfile seam、voxel-physics-engine MIT tick(dt_in_ms)確認、TYPE_SPECS.voxel契約のみ |
| 15 | skills/index.md | 更新: 読み方ガイドに13新スキル追加、状況→スキル対応表、一覧に13スキル追加、最終更新日2026-09-22 |
| 16 | tech-stack | 更新: EM01ゼロアロケ/メモリリーク、EM02 coverage 85%達成 handlers/babylonDeps/App/InputController、Docs/CI/URL検証、proposal削除、公式URLリスト追加 |
| 17 | sandbox-constraints | 更新: bun.sh不可、.github/workflows正本、pre-commit timeout、push timeout分離、E2E discovery、リンクチェッカーcode除外、復旧手順 git log b3dd3ed確認、workspaces |
| 18 | project-overview | 更新: Phase進捗にEMフェーズ追加 95.12%/87.97%/90.7%/96.8%、規模にcoverage include-all、EM知見4点追加 |
| 19 | hooks/pre-task.md | 更新: 11スキル→16スキル、タスク別読み分け表追加、proposal削除、EMフェーズ依存明確化、メモリリーク/ゼロアロケ/決定論/coverage意識追加 |
| 20 | hooks/verify-before-commit.md | 更新: 4検証→4+3検証、check:determinism/test:coverage/test:e2e -- --list追加、noConsole/noRestrictedImports注意、handlers/babylonDeps/App/InputControllerテスト指針、ゼロアロケ/メモリリーク/proposal監査コマンド、pre-commit timeout対策、E2E discovery含める |
| 21 | hooks/index.md | 更新: pre-task/verify-before-commit/log-task/sandbox-rebuild-recovery説明を最新知見に更新 |
| 22 | hooks/log-task.md | 更新: スキル一覧16個、対応ログ列挙、スキル化判断基準追加、.claude/logsも対象明記 |
| 23 | AGENTS.md | 更新: §3.1 4→4+3検証、§6.3 proposal削除、§6.4ゼロアロケ詳細B4-B13+メモリリーク、§6.5 noConsole/noRestrictedImports/any禁止、§6.6 Bun.serve正しい使い方+rate limit+Channel 17B+handlers.ts分離+Room tickIfDue |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **ログ総数**: `.agent/logs/` 50 + `.claude/logs/2026-09-21_em2-coverage-85.md` 1 = 51。最初の `for f in .agent/logs/*.md | head -n 3000` はtruncatedで6ログしか見えず、pythonで「気づいたこと」抽出が有効だった。
- **スキル化の優先度**: EM01/EM02が最も再利用性高い（ゼロアロケ、メモリリーク、coverage include-all、handlers/babylonDeps分離）。PH0-A/B/Cの16B Input/rate-limit/backpressureも再利用性高いが既にtech-stack/networkingに一部あったため新規skillに整理。
- **AGENTS.md §6.4は既にゼロアロケを謳っていたが具体パターンが無かった**: getPlayersIterable、encode once、head indexリング、Map再利用などEM01の具体コードをAGENTS.mdに追記することで、次セッションがgrepで監査できるようになった。
- **proposal yml削除の徹底**: 2026-09-22に削除済みだが、hooksやAGENTS.mdに旧記述が残っていた。ci-quality-gates/SKILL.mdとdocs-maintenance/SKILL.mdで「再作成禁止」を明記し、監査コマンド `ls docs/ops/` + `grep -R "github-actions-proposal"` をhooksに追加。
- **coverage方針の転換**: PH1.5-Aでは0% thresholdでbaseline計測、PH1.5-Bで79/73/79/80へratchet、EM02で85/85/85/85へratchet。include-all方針（難しいfileをexcludeして数字を作らない）がEM02で確立、これはtesting/SKILL.mdの核心。
- **Sandbox制約の追加知見**: pre-commit hookがtypecheck+biome+determinism+vitest 30files 189testsで15s timeout、docs-onlyは--no-verifyで回避。pushも単一bashで15s timeout、commitとpush分離が有効。これらはsandbox-constraints/SKILL.mdとverify-before-commit.mdに追記。
- **Bun導入の唯一確実な経路**: bun.sh SSL到達不可、npm registry経由のみ確実。restore-sandbox-env.shがcorepack+pnpm前提からbun用に変更された経緯はbun-runtime/SKILL.mdに記録。
- **決定論heavyの分離**: 1000x100が0.8sでpass、plane worldで十分。smokeはunit常時、heavyはscripts/分離がPH2-Eで確立、deterministic-sim/SKILL.mdに記録。
- **Biome import境界**: `linter.rules.style.noRestrictedImports` 配下、scope packageは`**`で捕捉、DOM globalはnoRestrictedGlobals。webからengine-core直接import禁止はPH2-Dで確立、import-boundaries/SKILL.mdに記録。
- **Babylon EngineOptions**: `@babylonjs/core@9.25.0` はthinEngine.pureからimport、desynchronized/preserveDrawingBufferはPH1-Dでは渡さない、babylon-engine/SKILL.mdに記録。

## 4. 次にすべきこと (Next Actions)

1. PLAT-3 Phase3計画作成（gamemode API第1版 + fps-ffa最小）を実施する（docs/task-list.md次タスク）。
2. `docs/planning/PHASE03_PLAN.md` を `_TEMPLATE.md` 準拠で作成し、`docs/task-list.md` にPLAT-3とPH3-*を追加する。
3. Phase2完了を `docs/planning/complete/` へ移すかはPLAT-3計画時に判断する（PH2-EログのNext Actions）。
4. CIの `quality-gates.yml` に `determinism-heavy` を追加するか検討（現行でもcheck-determinismはあるがheavyは未追加、PH2-Eログ）。
5. 今回追加した16スキルの中で重複があるもの（networking vs bun-runtime、zero-alloc vs memory-leak）は運用で使い分けを明確化、必要なら統合も検討。
6. docs-maintenance/SKILL.mdの内部リンクチェッカーを `scripts/check-links.ts` として実装し、quality-gates.ymlのquality jobに追加するか検討（DOC-10）。
