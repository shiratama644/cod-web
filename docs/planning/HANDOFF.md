# 次セッションへの橋渡し（フェーズ 1 計画の直前）

> 対象: 新しいセッションの AI。人間ではない。
> 進捗の正本: [`docs/task-list.md`](../task-list.md)
> 作業規約: [`AGENTS.md`](../../AGENTS.md)
> 仕様正本: [`docs/arch/`](../arch/README.md)
> このファイルは計画の代替ではない。**PLAT-1R は完了済み。次は `PHASE01_PLAN.md` を再読して PH1-A に進む。**

## 0. 最初にやること（これ以外から始めない）

1. `git status` / `git branch --show-current` / `git log -5 --oneline`
2. ブランチ名は **毎回コマンドで確認**する。文書に書いてある過去ブランチ名を fetch/push しない（AGENTS.md §4.4）
3. `git log` が起点 1 件だけ / status が大量削除+未追跡 / `bun` なし / `node_modules` なし → Sandbox 再構築。`.agent/hooks/sandbox-rebuild-recovery.md` どおり `git fetch origin <現在ブランチ>` → `git reset --hard FETCH_HEAD` → `bash .agent/hooks/restore-sandbox-env.sh`
4. 未コミット変更を勝手に捨てない（再構築復旧の `reset --hard FETCH_HEAD` だけ例外）
5. **進行中は 1 件。** PLAT-1R は完了済み。次の 1 件は **PH1-A**（bun workspaces + fps 系へ移動）
6. PH1-A 着手前に `PHASE01_PLAN.md` §5 / §7 / §10.5 を再読する。公式・型・arch が食い違う場合は停止して人間に確認する

## 1. いま決まっていること（覆さない）

人間が 2026-09-05 に選んだ。計画の範囲切り。ADR を覆すものではない。

| ID | 決定 | 意味 |
|---|---|---|
| D1 | モノレポは **fps 系だけ** | 作る: `packages/protocol`, `engine-core`, `profile-fps`, `apps/gameserver`, `apps/web`。作らない: profile-voxel, gamemode-sdk, matchmaker, gamemodes/*, client-voxel |
| D2 | ワイヤは **Channel 頭 1B だけ** | Input **本体 16B** と Snapshot **現行 type=2 レイアウト**は変えない。ソケット上の Input は 17B。Hello HMAC は入れない（フェーズ 4） |
| D3 | GPU 数値 DoD は **フェーズ 1 完了条件から外す** | engineering.md の「ドローコール &lt; 100」「中位機 &lt; 8ms」は残す。本フェーズをそれで 100% にしない |
| D4 | lagcomp は **残して毎ティック record**。窓 500ms | 削除しない（PH0-E 済み） |
| D5 | OPEN-A（`dtMs` が ms か ×10 か）は **触らない** | 決めたと書かない |
| D6 | トランスポートは **WebSocket のみ** | WT / geckos / 生 UDP / WebRTC DataChannel を実装しない |
| D7 | `bufferedAmount` は **使わない** | bun `ws.send` の -1 / 0 / 1+。共通 `NetTransport` API に `bufferedAmount` を必須にしない |
| D8 | ホットパス送信は **`subarray`** | `slice` でバイトコピーしない |
| D9 | ライセンス MIT。初期は匿名。モバイル両タイプだが **タッチは後続**。ボイスは理想、ゲーム同期に WebRTC は使わない |
| D10 | プレーヤー同士はすり抜け。FPS マップは CDN 前提で **パスだけ**。チャンクは当面メモリ。初期リージョン 1 拠点 |

## 2. コードの現状（事実）

| 項目 | 値 |
|---|---|
| フェーズ 0 | **完了** PH0-A〜F |
| PH0-F | `69e9ce2`。ingest 1e6 fuzz、Input ±1 は 1002。72 tests |
| PH0-E | `042e26d`。`Simulation.step` から `lagComp.record`。`LAGCOMP_HISTORY_MS = 500` |
| PH0-D | `a241b8b`。ring `subarray`、受信は offset DataView |
| PH0-C | `70e44cb`。`send` -1 スキップ / drain 再開 / 0 切断 |
| PH0-B | `5afb369`。入力 90/s 超で切断 |
| PH0-A | `e57d747`。Input 16B、type `0x10` |
| PLAT-1 初版 | `663f815`。`PHASE01_PLAN.md` |
| PLAT-1 API 表 | `87e0294`。§10.5 は arch 二次情報のみ（検索なし） |
| PLAT-1R | `20fa678`。§10.5 を公式一次情報に差し替え。Babylon EngineOptions の不一致を明示 |
| DOC-4 | `02bcd7a`。docs 全体の外部 API 記述を公式確認メモへ集約し、古い重複仕様書を案内文に変更 |
| DOC-5 | 本コミット。official/UGC 階層、Babylon GLB エディタ、voxel 公式地形生成、Noa 系依存候補を仕様へ反映 |
| 現行ツリー | 単一 `package.json`。`src/` `shared/` `server/` `_tests_/`。R3F シーンはまだある |
| テスト | `bun run test:unit` 72 passed（PH0-F 時点） |

フェーズ 1 の **実装（PH1-A〜F）は未着手**。

## 3. PLAT-1R 完了後の次の 1 件: PH1-A

### 目的

`docs/planning/PHASE01_PLAN.md` の §10.5 は公式一次情報で確認済み。次は **PH1-A** として、計画に従い fps 系だけの bun workspaces へ移動する。

### やってはいけない

- D1–D10 を覆す（覆したくなったら実装せず人間に聞く）
- 不一致を「こちらが正しい」と決める（§4 を読め）
- PH1-A に PH1-B/C/D の内容を混ぜる（依存規則・Channel・Babylon は後続）
- `.agent/logs/` の過去ログを書き換える
- `.archive/` を正本にする
- `git reset --hard`（再構築復旧以外）/ rebase / force push
- セッション固定ブランチ以外へ push

### PH1-A 開始条件

- [ ] `git status` / `git branch --show-current` / `git log -5 --oneline`
- [ ] `docs/task-list.md` で PLAT-1R 完了を確認
- [ ] `PHASE01_PLAN.md` §5（DoD）/ §7（停止条件）/ §9（サブタスク）/ §10.1（モノレポ）/ §10.5（公式 API）を再読
- [ ] 未コミット変更があれば停止

### PH1-A の範囲

- 作る: `packages/protocol`, `packages/engine-core`, `packages/profile-fps`, `apps/gameserver`, `apps/web`
- 作らない: `packages/profile-voxel`, `gamemode-sdk`, `matchmaker`, `gamemodes/*`, `client-voxel`
- 描画はまだ R3F のまま移動だけ。Babylon 移行は PH1-D

### PH1-A 完了条件

- [ ] bun workspaces で fps 系 5 workspace がビルドできる
- [ ] 既存テストが新 import path で通る
- [ ] `bun run typecheck` / `bunx biome lint .` / `bun run test:unit` / `bun run build` 全 pass
- [ ] `docs/task-list.md` の PH1-A を証拠付きで更新
- [ ] Conventional Commit + セッションブランチへ push


## 4. 不一致（両方引用。どちらが正しいか決めない）

実装で衝突したら **停止して人間に聞く**。

**bufferedAmount**

- DOC-4 で protocol.md の `NetTransport` 型例から `bufferedAmount` を削除済み。
- AGENTS.md / server.md / フェーズ 0: Bun server 側は `send()` の -1 / 0 / 1+ を見る。

**Input 長さ**

- DOC-4 で protocol.md の古い Input 長さ記述を削除済み。
- コード / PH0-A: `INPUT_PACKET_BYTES === 16`、type `0x10`

**lagcomp**

- product.md: 「`record()` が呼ばれていないならデッドコード」
- コード / PH0-E: 毎ティック `record`、窓 500ms

**Hello / Channel「最初から」**

- ADR-005: Channel・Hello 認証は最初から
- milestones フェーズ 1: モノレポ + Babylon。Hello はフェーズ 4（マッチメイカー）
- 合意 D2: Channel だけ今やる

**milestones GPU DoD vs 合意 D3**

- milestones フェーズ 1 DoD: ドローコール &lt; 100、中位機フレーム &lt; 8ms
- 合意 D3: 本フェーズ完了条件から外す

## 5. 強制されていない（やらない）

voxel パッケージ、SimProfile 本実装、defineGameMode、Hello HMAC、Snapshot `0x11` 化、`vy` 削除、タッチ配線、ボイス、OPEN-A の決定、GPU 実測、Playwright 捏造、`.github/workflows/` 作成。

## 6. 読み順（次セッション）

1. 本ファイル
2. `AGENTS.md`
3. `docs/task-list.md`
4. `docs/planning/PHASE01_PLAN.md`（PLAT-1R 後。§10.5 が公式確認済み）
5. `docs/arch/product.md` `architecture.md` `editor.md` `adr.md` `client.md` `protocol.md` `milestones.md` `legal.md`
6. `.agent/hooks/pre-task.md` → 必要なスキルだけ（`skills/index.md`）

旧仕様は `.archive/docs/`。正本にしない。

## 7. 人間への話し方

日本語。敬体。絵文字は報告の最小限。表で状態を出す。Go 待ちで止める。推測と事実を分ける。
