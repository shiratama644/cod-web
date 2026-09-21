# PLAT-3 Phase 3 Plan — gamemode API第1版 + fps-ffa最小

> Date: 2026-09-22(JST) / Commit: 24cd39e / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)

ユーザー指示「お願いします」により、HANDOFF.mdで次タスクとされていた PLAT-3 Phase 3計画作成を実施。

- `docs/planning/PHASE03_PLAN.md` を `_TEMPLATE.md` 準拠で作成
- `docs/task-list.md` に PLAT-3 / PH3-A〜D を追加
- `docs/planning/README.md` 更新
- 範囲: gamemode API第1版 + fps-ffa最小、fps先行＋voxel契約のみ継続、voxel本実装/AOI/delta/matchmaker/UGC/WT含めない

## 2. 実行内容 (Executed Actions)

| # | 対象 | 実装 |
|---|---|---|
| 1 | 現状把握 | git status/branch/log、task-list roadmap確認、HANDOFF D1-D14、_TEMPLATE読込、milestones Phase 3 DoD、types.md GameModeDefinition/RoomCtx、architecture L0-L3依存 |
| 2 | PHASE03_PLAN.md | 新規作成520行: §1開始前確認、§2目的 L1 gamemode-api + L3 ffa、§3変更範囲 packages/gamemode-api + engine-core/gamemode + gamemodes/fps/official/ffa + gameserver runtime + protocol + tests + docs/biome、§4禁止 L1純度/gamemodes→apiのみ/setTimeout禁止/zero-alloc/wire維持、§5 DoD PLAT-3 docs-only + Phase 3全体 defineGameMode検証+exception safety+tick timer+rate limit+ffa lifecycle+biome+quality gate 85%+import境界、§6テスト方法 unit/coverage/typecheck/lint/build/E2E/determinism/same-input/構造監査、§7停止条件、§8完了時、§9サブタスク PLAT-3/PH3-A/B/C/D、§10設計詳細 ctx + runtime + timer + ffa + integration + TYPE_SPECS、§11リスク、§12実績 |
| 3 | task-list.md | roadmap Phase 3を PLAT-3ローカル検証済みに更新、Phase 3セクション追加 PLAT-3 100% + PH3-A/B/C/D 0%、trailing whitespace修正 |
| 4 | planning/README.md | PHASE03_PLAN.mdエントリ追加、次タスク PH3-Aに更新 |
| 5 | 検証 | link check broken 2件は既存 false positive（%20エンコード）、git diff --check pass、docs-onlyなので4+3検証スキップ可 |
| 6 | commit/push | 24cd39e docs(PLAT-3): Phase 3 plan... push to arena/01a0b161-cod-web |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **Phase 3の核心はL1純度**: gamemode-apiはprotocolのみ依存、profile-fps/three/bvh依存禁止。gamemodes/*はgamemode-apiのみimport（Biomeで強制）。engine-coreはprofile-*禁止維持、gamemode-apiはL1なのでOK。この境界が守られているかが設計判定基準（architecture.md）。
- **Tick timerはsetTimeout禁止**: after/every/cancelはtick基準、Map<timerId,{dueTick,interval}> + head indexリング（EM01知見）。GameModeRuntime.safeCallでtry/catch、1ルーム例外で他ルーム巻き込まない。
- **Rate limit**: gamemode message 40/s burst 20、超過時false、Input 90/s超過で切断維持（protocol.md表）。
- **fps-ffa最小**: waiting→countdown→playing→ended、spawn選択、kill→score、death→respawn 3s、static arena再利用、three-mesh-bvh衝突はprofile側維持、kill判定簡易、巻き戻しヒットスキャンは将来。
- **DoDが明確**: milestones.md Phase 3 DoD「レート制限テスト全項目、モード例外でルームが落ちない」を具体テストに落とし込む。coverage 85%維持、E2E discovery 11+維持、determinism heavy 0.8s維持。
- **docs/planning/README.mdの次タスク更新を忘れがち**: PLAT-3完了後はPH3-Aが次、HANDOFFも更新必要（次セッションで）。
- **%20リンク**: docs/README.mdの「マルチタイプ・ゲームプラットフォーム 設計書.md」は%20エンコードでリンク、実ファイルはスペース含み存在するが、pythonチェッカーはデコードしないためbroken誤検出。既存issue、今回の変更ではない。

## 4. 次にすべきこと (Next Actions)

1. PH3-A: gamemode-api package作成（L1 contract）。`packages/gamemode-api/` package.json + src/defineGameMode.ts + types.ts + ctx.ts + barrel、define validation tests、L1 type非依存監査。
2. PH3-B: GameModeRuntime + Tick timer + RateLimiter。`packages/engine-core/src/gamemode/`新規、Room統合、exception safety / after/every/cancel tick / rate limit tests。
3. PH3-C: fps-ffa最小モード。`gamemodes/fps/official/ffa/index.ts`、defineGameMode export、spawn/score/round lifecycle、static arena再利用。
4. PH3-D: 統合 + docs + import境界 + quality gate。gameserver runtimeでprofile+gamemode注入、biome.json gamemodes/*→gamemode-apiのみ、coverage 85%維持、最終検証。
5. HANDOFF.md更新はPH3-D完了時に実施、現状はEM02完了のまま。
