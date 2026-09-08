# タスクリスト（唯一の正本）

> 1. 本ファイルが進捗の正本。矛盾時は本ファイル。
> 2. 進行中は原則 1 件。
> 3. タスク ID は再利用しない。中止は「対象外」＋理由。
> 4. 新問題は新タスク。混ぜない。
> 5. 完了は証拠で判定。
> 6. 詳細は `docs/planning/*_PLAN.md`。完了済み計画は `docs/planning/complete/`（`_TEMPLATE.md` 準拠）。
> 7. 仕様の正本は `docs/arch/`（マルチタイププラットフォーム）。旧 FPS 専用仕様は `.archive/docs/`。

**状態**: `未着手` / `調査中` / `実装中` / `ローカル検証済み` / `実環境検証待ち` / `完了` / `保留` / `対象外`

---

## プロダクト概要

ブラウザ向け **マルチタイプ・ゲームプラットフォーム**（`voxel` / `fps`）。プラットフォーム層（L0/L1）を共有し、Sim Profile（L2）だけを差し替える。描画は Babylon.js。今のトランスポートは WebSocket のみ。詳細は [`arch/product.md`](./arch/product.md)。

ライセンス **MIT**。初期は匿名。モバイルは両タイプ（タッチは後続）。ボイスは理想に含む（ゲーム同期とは別）。

---

## 現行コード（移行元）

単一ルーム FPS（旧 Phase 0–1）。理想形のフェーズ番号とは別。資産の移植判定は [`arch/product.md`](./arch/product.md)。

| 項目 | 状態 | 備考 |
|---|---|---|
| Vite + React + TS + Biome + Vitest | 移行元として存在 | bun 1.4.0 |
| R3F シーン（WebGPU/WebGL2） | **破棄予定** | ADR-003 |
| bun WS 権威サーバ・位置同期 | **拡張して移植** | 16B Input 等はフェーズ 0 で穴埋め |
| shared バイナリ packer | **移植** | レイアウトは理想プロトコルへ更新 |
| 実ブラウザ 2 タブ目視 | 旧 P1-G が実環境検証待ち | プラットフォーム移行後に再確認 |

旧タスク ID（P0-* / P1-*）は `.archive/docs/task-list.md` に残す。本ファイルでは再利用しない。

---

## 目標ロードマップ（理想形フェーズ）

計画書は着手前に `docs/planning/PHASE{N}_PLAN.md` を作る。DoD は [`arch/milestones.md`](./arch/milestones.md)。

| Phase | テーマ | 状態 |
|---|---|---|
| **0** | 現行コードの穴（長さ検証・fuzz・backpressure・slice） | 完了（PH0-A〜F） |
| **1** | モノレポ + Babylon 移行 | PH1-C ローカル検証済み（次: PH1-D） |
| **2** | Sim Profile 分離 | 未着手 |
| **3** | ゲームモード API 第 1 版 + fps-ffa 最小 | 未着手 |
| **4** | ハブ + マッチメイカー + voxel 永続化方針 | 未着手 |
| **5** | voxel-creative / bedwars / fps-tdm | 未着手 |
| **6** | API 再設計 | 未着手 |
| **7** | チャンク本同期・AOI・スケール | 未着手 |
| **8** | UGC | 未着手 |
| **9** | WebTransport（条件付き） | 未着手 |

### Phase 0

計画書: [`planning/complete/PHASE00_PLAN.md`](./planning/complete/PHASE00_PLAN.md)

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| PLAT-0 | フェーズ 0 計画書作成（`PHASE00_PLAN.md`） | 完了 | 100% | DOC-2 | `_TEMPLATE.md` 準拠の計画が arch と矛盾しない | 本コミット |
| PH0-A | BinaryReader + Input 16B + 長さ/範囲で切断 | 完了 | 100% | PLAT-0 | 16B 往復。15/17B は切断。短バッファでプロセス死なし | 本コミット / 59 tests |
| PH0-B | 入力レート制限 90/s | 完了 | 100% | PH0-A | 超過で切断するテストがある | 本コミット / 64 tests |
| PH0-C | Bun WS オプション + `send()` -1/0 | 完了 | 100% | PH0-A | `bufferedAmount` 不使用。-1 スキップ / 0 切断 | 本コミット / 65 tests |
| PH0-D | `slice` → `subarray` | 完了 | 100% | PH0-C | ホットパス送信がコピーでない | 本コミット / 66 tests |
| PH0-E | lagcomp 毎ティック `record()`（または削除） | 完了 | 100% | PH0-A | 記録されているかモジュール削除。混在しない | 本コミット / 68 tests |
| PH0-F | 100 万 fuzz + 固定長 ±1 | 完了 | 100% | PH0-A〜E | 1e6 で落ちない。Input ±1 で切断 | 本コミット / 72 tests / 1e6 fuzz 4.9s |

### Phase 1

計画書: [`planning/PHASE01_PLAN.md`](./planning/PHASE01_PLAN.md)  
橋渡し: [`planning/HANDOFF.md`](./planning/HANDOFF.md)（PLAT-1R 完了後。次は **PH1-D**）

合意: fps 系パッケージのみ。Channel 頭 1B。GPU 予算は本フェーズ DoD 外。`dtMs` はミリ秒。fps Snapshot は `vy` を含める。workspace package name は `@cod/*`。Babylon options は型にあるものだけ使う。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| PLAT-1 | フェーズ 1 計画書作成（`PHASE01_PLAN.md`） | 完了 | 100% | PH0-F | `_TEMPLATE.md` 準拠。arch と合意が矛盾しない | `663f815` / `87e0294` |
| PLAT-1R | 公式 API を Web 検索して `PHASE01_PLAN` を書き直す | 完了 | 100% | PLAT-1 | 公式 URL 付き。D1–D10 維持。invent なし | `20fa678` / 公式一次情報 URL を PHASE01_PLAN §10.5 に記載 / link check broken 0 / typecheck・lint・unit・build pass |
| PLAT-1Q | 不確かな点の最終決定を docs へ反映 | 完了 | 100% | PLAT-1R | `dtMs` 単位、fps Snapshot `vy`、workspace package name、Babylon options 方針が arch / plan / handoff に反映される | 本コミット / 人間回答: `vy`含む・`@cod/*` / agent推奨採用: `dtMs`ミリ秒・Babylon型にあるものだけ |
| PH1-A | bun workspaces + fps 系へ移動 | ローカル検証済み | 100% | PLAT-1Q | `@cod/protocol` / `@cod/engine-core` / `@cod/profile-fps` / `@cod/gameserver` / `@cod/web` がビルドできる | 本コミット / `bun run typecheck` pass / `bunx biome lint .` pass / `bun run test:unit` 11 files・72 tests pass / `bun run build` pass |
| PH1-B | 依存規則を Biome で強制 | ローカル検証済み | 100% | PH1-A | 破ると lint が落ちる。ルール名は公式確認 | 本コミット / `biome.json` overrides / `SimulationStep<TWorld>` 注入で engine-core→profile-fps 依存を解消 / probe: WebSocket 直接参照は `lint/style/noRestrictedGlobals`、engine-core→profile-fps は `lint/style/noRestrictedImports` で失敗 / 4検証 pass |
| PH1-C | Channel 頭 1B | ローカル検証済み | 100% | PH1-A | Unreliable の payload は Input 16B。欠落は 1002 | 本コミット / `Channel` + `decodeFrame` 追加 / Input frame 17B・payload 16B / Channel 欠落・空・Reliable・Bulk は ProtocolError 1002 / `bun run test:unit` 12 files・78 tests pass / 4検証 pass |
| PH1-D | Babylon Engine + R3F シーン削除 | 未着手 | 0% | PH1-A | R3F シーンが無い。EngineOptions は公式どおり | |
| PH1-E | unadjustedMovement + 入力累積 | 未着手 | 0% | PH1-D | 視線はフレーム先頭で消費 | |
| PH1-F | React は HUD のみ + 位置同期経路 | 未着手 | 0% | PH1-C〜E | 単一静的マップで既存ネットが Babylon 上の経路になる | |

### ドキュメント・規約

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| DOC-1 | 旧 docs を `.archive/docs/` へ退避し、理想形で `docs/arch` を再構成 | 完了 | 100% | — | 索引が実ファイルと一致。旧 docs が archive にある。相対リンク切れ 0 | `cbd026e` |
| DOC-2 | AGENTS.md §6 を理想形（Babylon・WS のみ・16B Input 等）へ追従 | 完了 | 100% | DOC-1 | AGENTS と docs/arch が矛盾しない | 本コミット |
| DOC-3 | `.agent/skills` を理想形の実践ノウハウへ更新 | 完了 | 100% | DOC-1 | skills/index が arch を参照し旧 WT 主・R3F 前提が残らない | 本コミット |
| LIC-1 | MIT の LICENSE ファイルをルートに配置 | 完了 | 100% | — | LICENSE が MIT 全文 | 本コミット |
| DOC-4 | 現用ドキュメント全体の外部 API 記述を公式一次情報に追従 | 完了 | 100% | PLAT-1R | `docs/arch/api-sources.md` を追加し、現用 docs の古い API 記述を解消。リンク切れなし | 本コミット / Bun・Biome・Babylon・Noa・QuickJS・Colyseus 公式確認 / link check broken 0 / typecheck・lint・unit・build pass |
| DOC-5 | 公式/UGC 階層とエディタ方針を仕様へ反映 | 完了 | 100% | DOC-4 | `/fps|voxel/{official|ugc}/<slug>`、Babylon GLB エディタ、voxel 公式地形生成、Noa 系依存候補が docs に反映 | 本コミット / `docs/arch/editor.md` / Babylon loaders・Noa 系 npm metadata 確認 / link check broken 0 / typecheck・lint・unit・build pass |
| DOC-6 | Krunker.io / bloxd.io Deep Research 計画書作成 | 完了 | 100% | DOC-5 | 調査範囲・禁止事項・GitHub clone + SHA 記録ルールを明文化 | 本コミット / `docs/planning/complete/DEEP_RESEARCH_PLAN.md` / link check broken 0 |
| DOC-7 | ドキュメント整理（Deep Research 統合入口と読む順の整理） | 完了 | 100% | DR-5 | `docs/README.md` / `docs/research/README.md` / `docs/planning/HANDOFF.md` が DR-5 後の読む順と調査入口を示す | `9bd5371` / [`research/DEEP_RESEARCH_SYNTHESIS.md`](./research/DEEP_RESEARCH_SYNTHESIS.md) / link check broken 0 |
| DOC-8 | ドキュメント整理（planning/arch/research 導線と安全な索引追加） | 完了 | 100% | DOC-7 | ファイル移動なしで、読む順・計画書入口・仕様/調査の境界が docs に明示される | `4f1e2fc` / [`planning/README.md`](./planning/README.md) / link check broken 0 |
| DOC-9 | ドキュメント最終チェックと完了済み plan の整理 | 完了 | 100% | DOC-8 | 完了済み計画を `docs/planning/complete/` に移し、現用リンク・計画導線・API 根拠を再確認する | 本コミット / [`planning/complete/README.md`](./planning/complete/README.md) / link check broken 0 |

### 検証待ち・将来

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| CI-1 | GitHub Actions を `docs/ops/` に提案（`.github/workflows/` は書き込み不可） | 未着手 | 0% | — | YAML を docs/ops に用意 | |
| DR-1 | Krunker.io / bloxd.io Deep Research 実施 | 完了 | 100% | DOC-6 | network / frontend / editor / UGC / voxel 実装を source URL・clone SHA 付きで整理 | 本コミット / [`research/DR-1_COMPETITOR_DEEP_RESEARCH.md`](./research/DR-1_COMPETITOR_DEEP_RESEARCH.md) / clone SHA・読んだファイル一覧記録 / link check broken 0 |
| DR-2 | DR-1 要確認の追加 Deep Research | 完了 | 100% | DR-1 | bloxd 公式 Terms、Krunker direct API URL、Noa/Babylon peer mismatch を source URL・clone SHA 付きで整理 | 本コミット / [`research/DR-2_ADDITIONAL_SOURCE_RESEARCH.md`](./research/DR-2_ADDITIONAL_SOURCE_RESEARCH.md) / Noa examples clone SHA 記録 / link check broken 0 |
| DR-3 | 追加 Deep Research（search depth 3） | 完了 | 100% | DR-2 | Krunker direct API、bloxd code-api 追加 docs、texture-packs、authoritative netcode を deep search / fetch / clone SHA 付きで整理 | 本コミット / [`research/DR-3_DEEPER_COMPETITOR_RESEARCH.md`](./research/DR-3_DEEPER_COMPETITOR_RESEARCH.md) / web_search depth 3 / clone SHA 再確認 / link check broken 0 |
| DR-4 | 追加 Deep Research（engine / UGC / asset pipeline） | 完了 | 100% | DR-3 | Noa 系 engine、voxel physics、input/mobile、QuickJS sandbox、glTF validation/optimization pipeline を deep search / fetch / clone SHA 付きで整理 | 本コミット / [`research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md`](./research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md) / web_search depth 3 / clone SHA 記録 / link check broken 0 |
| DR-5 | Perplexity DeepResearch 差分検証 | 完了 | 100% | DR-4 | `docs/Perplexity-AI.md` と DR-1〜DR-4 の差分を分類し、一次情報/現行コードで修正済み・未解決・低信頼を整理 | 本コミット / [`research/DR-5_PERPLEXITY_DIFF_RESEARCH.md`](./research/DR-5_PERPLEXITY_DIFF_RESEARCH.md) / web_search depth 3 / 現行コード再監査 / link check broken 0 |
| OPEN-A | Input `dtMs` の単位（ms か ×10 か）を決定 | 完了 | 100% | PLAT-0 | 人間の回答が protocol.md に反映 | `dtMs` はミリ秒で確定。0.1ms単位（×10）は不採用 |
