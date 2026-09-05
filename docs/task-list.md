# タスクリスト（唯一の正本）

> 1. 本ファイルが進捗の正本。矛盾時は本ファイル。
> 2. 進行中は原則 1 件。
> 3. タスク ID は再利用しない。中止は「対象外」＋理由。
> 4. 新問題は新タスク。混ぜない。
> 5. 完了は証拠で判定。
> 6. 詳細は `docs/planning/*_PLAN.md`（`_TEMPLATE.md` 準拠）。
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
| **0** | 現行コードの穴（長さ検証・fuzz・backpressure・slice） | 計画済み（実装は PH0-*） |
| **1** | モノレポ + Babylon 移行 | 未着手 |
| **2** | Sim Profile 分離 | 未着手 |
| **3** | ゲームモード API 第 1 版 + fps-ffa 最小 | 未着手 |
| **4** | ハブ + マッチメイカー + voxel 永続化方針 | 未着手 |
| **5** | voxel-creative / bedwars / fps-tdm | 未着手 |
| **6** | API 再設計 | 未着手 |
| **7** | チャンク本同期・AOI・スケール | 未着手 |
| **8** | UGC | 未着手 |
| **9** | WebTransport（条件付き） | 未着手 |

### Phase 0

計画書: [`planning/PHASE00_PLAN.md`](./planning/PHASE00_PLAN.md)

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| PLAT-0 | フェーズ 0 計画書作成（`PHASE00_PLAN.md`） | 完了 | 100% | DOC-2 | `_TEMPLATE.md` 準拠の計画が arch と矛盾しない | 本コミット |
| PH0-A | BinaryReader + Input 16B + 長さ/範囲で切断 | 完了 | 100% | PLAT-0 | 16B 往復。15/17B は切断。短バッファでプロセス死なし | 本コミット / 59 tests |
| PH0-B | 入力レート制限 90/s | 完了 | 100% | PH0-A | 超過で切断するテストがある | 本コミット / 64 tests |
| PH0-C | Bun WS オプション + `send()` -1/0 | 完了 | 100% | PH0-A | `bufferedAmount` 不使用。-1 スキップ / 0 切断 | 本コミット / 65 tests |
| PH0-D | `slice` → `subarray` | 完了 | 100% | PH0-C | ホットパス送信がコピーでない | 本コミット / 66 tests |
| PH0-E | lagcomp 毎ティック `record()`（または削除） | 未着手 | 0% | PH0-A | 記録されているかモジュール削除。混在しない | |
| PH0-F | 100 万 fuzz + 固定長 ±1 | 未着手 | 0% | PH0-A〜E | 1e6 で落ちない。Input ±1 で切断 | |

### ドキュメント・規約

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| DOC-1 | 旧 docs を `.archive/docs/` へ退避し、理想形で `docs/arch` を再構成 | 完了 | 100% | — | 索引が実ファイルと一致。旧 docs が archive にある。相対リンク切れ 0 | `cbd026e` |
| DOC-2 | AGENTS.md §6 を理想形（Babylon・WS のみ・16B Input 等）へ追従 | 完了 | 100% | DOC-1 | AGENTS と docs/arch が矛盾しない | 本コミット |
| DOC-3 | `.agent/skills` を理想形の実践ノウハウへ更新 | 完了 | 100% | DOC-1 | skills/index が arch を参照し旧 WT 主・R3F 前提が残らない | 本コミット |
| LIC-1 | MIT の LICENSE ファイルをルートに配置 | 完了 | 100% | — | LICENSE が MIT 全文 | 本コミット |

### 検証待ち・将来

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| CI-1 | GitHub Actions を `docs/ops/` に提案（`.github/workflows/` は書き込み不可） | 未着手 | 0% | — | YAML を docs/ops に用意 | |
| OPEN-A | Input `dtMs` の単位（ms か ×10 か）を決定 | 保留 | 0% | PLAT-0 | 人間の回答が protocol.md に反映 | |
