# 次セッションへの橋渡し（フェーズ 1 計画の直前）

> 対象: 新しいセッションの AI。人間ではない。
> 進捗の正本: [`docs/task-list.md`](../task-list.md)
> 作業規約: [`AGENTS.md`](../../AGENTS.md)
> 仕様正本: [`docs/arch/`](../arch/README.md)
> このファイルは計画の代替ではない。**最初にこれを読み、次に Web 検索で `PHASE01_PLAN.md` を書き直す。**

## 0. 最初にやること（これ以外から始めない）

1. `git status` / `git branch --show-current` / `git log -5 --oneline`
2. ブランチ名は **毎回コマンドで確認**する。文書に書いてある過去ブランチ名を fetch/push しない（AGENTS.md §4.4）
3. `git log` が起点 1 件だけ / status が大量削除+未追跡 / `bun` なし / `node_modules` なし → Sandbox 再構築。`.agent/hooks/sandbox-rebuild-recovery.md` どおり `git fetch origin <現在ブランチ>` → `git reset --hard FETCH_HEAD` → `bash .agent/hooks/restore-sandbox-env.sh`
4. 未コミット変更を勝手に捨てない（再構築復旧の `reset --hard FETCH_HEAD` だけ例外）
5. **進行中は 1 件。** 次の 1 件は **PLAT-1R**（本ファイル末尾）。PH1-A（workspaces 実装）は計画の書き直しが終わるまで禁止
6. **Web 検索は必須**（AGENTS.md §7.5）。このセッションでは検索ツールが失敗したため、計画の API 表は arch の二次情報だけ。公式一次情報で書き直せ

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
| D7 | `bufferedAmount` は **使わない** | bun `ws.send` の -1 / 0 / 1+。protocol.md の型例に `bufferedAmount` があっても載せない |
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
| PLAT-1 API 表 | `87e0294`。§10.5 は **arch 二次情報のみ**（検索なし） |
| 現行ツリー | 単一 `package.json`。`src/` `shared/` `server/` `_tests_/`。R3F シーンはまだある |
| テスト | `bun run test:unit` 72 passed（PH0-F 時点） |

フェーズ 1 の **実装（PH1-A〜F）は未着手**。

## 3. 次の 1 件: PLAT-1R（計画の書き直し）

### 目的

`docs/planning/PHASE01_PLAN.md` を、**公式ドキュメントの Web 検索結果**で書き直す（または §10.5 を一次情報に差し替える）。合意 D1–D10 は変えない。

### やってはいけない

- 検索せずに API 名を invent する
- D1–D10 を覆す（覆したくなったら実装せず人間に聞く）
- 不一致を「こちらが正しい」と決める（§4 を読め）
- PH1-A のコード移動をこのタスクに混ぜる
- `.agent/logs/` の過去ログを書き換える
- `.archive/` を正本にする
- `git reset --hard`（再構築復旧以外）/ rebase / force push
- セッション固定ブランチ以外へ push

### 検索クエリ（公式を優先。引用は AGENTS.md どおり `[id](url)`）

`docs/arch/legal.md` の一次情報 URL から入る。少なくとも次を確認して計画に **シグネチャと出典**を書く。

| 調べること | 手がかり（legal.md / arch） |
|---|---|
| Babylon `Engine` コンストラクタ / `EngineOptions` に `desynchronized` `preserveDrawingBuffer` があるか | doc.babylonjs.com、client.md |
| `setHardwareScalingLevel` / `freezeActiveMeshes` / thin instances | doc.babylonjs.com |
| Pointer Lock `unadjustedMovement` | https://w3c.github.io/pointerlock/ |
| Canvas `desynchronized` | https://developer.chrome.com/blog/desynchronized |
| bun `package.json` workspaces の書き方（1.4.x） | bun.sh。 invent した catalog キーは使わない |
| bun `ws.send` 戻り値 | https://bun.sh/docs/runtime/http/websockets |
| Biome 2.5.x の import 制限ルールの **実際のキー名** | biomejs.dev schema。architecture.md の `noRestrictedImports` は意図であり ID ではない |
| 現行 `@babylonjs/core` の入れ方（peer の有無） | npm / 公式。バージョンは実装時に人間へ確認してよい |

検索ツールが失敗したら: 停止して報告する。arch の二次情報だけで「公式確認済み」と書かない。`node_modules` の `.d.ts` と schema は検索の代替になり得る（インストール後）。

### 完了条件

- [ ] 公式ソースを計画 §10.5（または相当）に URL 付きで書いた
- [ ] D1–D10 が計画本文と一致する
- [ ] 型/公式に無い名前を計画から消した
- [ ] `docs/task-list.md` の PLAT-1R を証拠付きで完了にした
- [ ] ドキュメント整合（リンク切れなし）
- [ ] Conventional Commit（例: `docs(PLAT-1R): …`）+ セッションブランチへ push

その後、人間の Go を待って **PH1-A**。勝手に実装しない（AGENTS.md §5 / §2.7）。

## 4. 不一致（両方引用。どちらが正しいか決めない）

実装で衝突したら **停止して人間に聞く**。

**bufferedAmount**

- protocol.md: `readonly bufferedAmount: number;`（NetTransport 型例）
- AGENTS.md / server.md / フェーズ 0: 存在しない `bufferedAmount` に頼らない。`send()` の -1 / 0 / 1+

合意 D7 は「載せない」。protocol.md は本タスクで書き換えない（範囲外）。計画に「型例と bun が食い違う。実装は send 戻り値」と残す。

**Input 長さ**

- protocol.md: 「現行 packer は type 込み 13 バイト」
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
4. `docs/planning/PHASE01_PLAN.md`（現行。検索後に書き直す）
5. `docs/arch/product.md` `architecture.md` `adr.md` `client.md` `protocol.md` `milestones.md` `legal.md`
6. `.agent/hooks/pre-task.md` → 必要なスキルだけ（`skills/index.md`）

旧仕様は `.archive/docs/`。正本にしない。

## 7. 人間への話し方

日本語。敬体。絵文字は報告の最小限。表で状態を出す。Go 待ちで止める。推測と事実を分ける。
