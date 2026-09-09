# Phase 1.5: Coverage / Meaningful Tests / E2E 品質ゲート

> 対応 task-list ID: `PLAT-1.5`（本計画） / 実装 `PH1.5-A` … `PH1.5-D`（docs/task-list.md）
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠
> 仕様正本: [`docs/arch/engineering.md`](../arch/engineering.md)、[`client.md`](../arch/client.md)、[`protocol.md`](../arch/protocol.md)、[`api-sources.md`](../arch/api-sources.md)
> 着手意図（2026-09-09）: Phase 2 へ進む前に、Vitest coverage 測定、意味のある coverage 増加、Playwright E2E 実装を挟む。

## 1. 開始前確認

- ブランチはセッション固定。着手時に `git status` / `git branch --show-current` / `git log -5 --oneline` を確認し、未コミット変更があれば停止する
- `docs/task-list.md` で PH1-F がローカル検証済みであることを確認する
- 本計画の §5（DoD）/ §7（停止条件）/ §10（設計詳細）を再読する
- `package.json` / `vitest.config.ts` / `apps/web/vite.config.ts` / `scripts/execute.ts` / 既存 `_tests_/` を全体確認してから実装する
- Vitest / Playwright の API は `docs/arch/api-sources.md` と公式 docs を再確認する。公式・型・現行コードが食い違う場合は停止して質問する

## 2. 目的 (Why)

PH1 でモノレポ・Channel・Babylon・入力・React/HUD 境界はローカル検証済みになった。Phase 2 の Sim Profile 分離に入る前に、品質ゲートを追加して「テストがある」だけでなく、未テストの重要経路を可視化し、意味のあるテスト増加とブラウザ E2E の入口を作る。

このフェーズの目的は次の 3 点。

1. **Coverage 測定を導入する**: Vitest coverage を公式 API に沿って設定し、測定対象・除外理由・baseline を記録する。
2. **意味のある coverage 増加**: 数字稼ぎの浅い snapshot / render 存在確認ではなく、protocol 境界、入力、予測/補間、サーバ backpressure / rate-limit / lifecycle など、壊れるとゲームが壊れる経路を優先してテストを足す。
3. **Playwright E2E を実装する**: CI / 実環境で実行可能な E2E 設定と smoke / integration tests を追加する。ただし Sandbox では Chromium バイナリ制約により実行を捏造しない。

## 3. 変更範囲 (Scope)

変更対象:

- `package.json` / workspace package manifests — coverage / e2e 用 scripts と devDependencies（`@vitest/coverage-v8`、`@playwright/test` 等）
- `vitest.config.ts` — coverage provider / include / exclude / reporter / thresholds の設定
- `_tests_/` — coverage report に基づいた意味のある unit / component tests の追加
- `playwright.config.ts` — Playwright Test 設定。`webServer` で `bun run start` を起動し、`baseURL` は local preview に合わせる
- `e2e/` または `_tests_/e2e/` — Playwright specs。開始 overlay / HUD / canvas / basic WS path などを検証
- `docs/task-list.md` / 本計画 / `docs/arch/engineering.md` / `docs/arch/api-sources.md` / `docs/planning/HANDOFF.md` — 進捗・証拠・品質方針更新
- 必要なら `docs/ops/` — `.github/workflows/` に直接書けないため、CI 配置用の提案 YAML / 手順を置く

変更しない（境界外）:

- Phase 2 の Sim Profile 分離実装
- voxel package / gamemode SDK / matchmaker / Hello HMAC / WebTransport
- Snapshot 0x11 化や Input 16B payload の変更
- テストしやすくするための protocol 緩和、lint 例外、実装の不正な単純化
- Playwright browser binary の Sandbox install 成否をもって E2E 実行済みと主張すること
- `.github/workflows/` への直接書き込み（権限制約）

## 4. 禁止事項

- coverage 数字だけを上げる目的で、意味の薄い import-only test / snapshot test / 実装詳細だけの test を大量追加しない
- coverage 対象から難しいファイルを安易に除外しない。除外する場合は「runtime なし」「entrypoint」「型だけ」「ブラウザ実 API 依存」など理由を計画または config コメントに残す
- threshold を初回から過剰に高くして、以後の開発を不必要に止めない。baseline を測ってから ratchet する
- coverage を通すためにテストを skip / only / assertion 緩和しない
- Playwright E2E を Sandbox で実行できたように捏造しない。ローカルで browser install 不可なら「設定・型検証まで」と明記する
- E2E からブラウザに `localhost` backend を直接叩かせない。クライアントは相対 `/ws`、Vite proxy / preview 経由を維持する
- `.github/workflows/` を作らない。CI workflow は必要なら `docs/ops/` に提案として置く

## 5. 完了条件 (DoD)

フェーズ全体（PH1.5-D 完了時）:

- [ ] `test:coverage` 等の script があり、Vitest coverage を測定できる
- [ ] coverage provider / reporter / include / exclude / thresholds が `vitest.config.ts` に明示されている
- [ ] 初回 baseline coverage と、意味のある test 追加後の coverage 増加が `docs/task-list.md` または本計画 §12 に証拠として残る
- [ ] coverage 増加は protocol / input / prediction / interpolation / server lifecycle / net transport 等の重要経路に対する assertion を含む
- [ ] Playwright Test 設定と E2E specs が追加され、CI / 実環境で `bun run test:e2e` 可能な形になっている
- [ ] Sandbox で Playwright 実行不可の場合は、未実行理由と実環境検証条件が明記されている
- [ ] `bun run typecheck` / `bunx biome lint .` / `bun run test:unit` / `bun run build` 全 pass
- [ ] `bun run test:coverage` は PH1.5-A 以降の対象タスクで pass。E2E は Sandbox では原則実行せず、CI / 実環境で pass を記録する
- [ ] `docs/task-list.md` の状態・進捗・証拠を更新
- [ ] タスク範囲外のファイル（`.archive/` を含む）に意図しない変更がない

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (Vitest) | 必須 | 既存 14 files / 84 tests を維持し、重要経路の test を追加。coverage report で未テスト branch を確認 |
| Coverage (Vitest) | 必須 | `@vitest/coverage-v8` を基本に `vitest run --coverage`。baseline と after を比較。必要なら provider は公式 docs / runtime 制約を再確認 |
| Component (testing-library) | 任意 | HUD / overlay / React と Babylon runtime seam。Canvas/WebGL は jsdom で描画しない |
| E2E (Playwright / CI) | 実装必須・Sandbox 実行は原則不可 | `webServer` で `bun run start` を起動し、`baseURL` から canvas / overlay / HUD / WS status などを確認。CI または実機で実行 |
| 実環境 | 必須（E2E 完了判定） | Playwright browser install 済みの環境で `bun run test:e2e`。2 タブ同期などを含める場合は flakes を避けるため明示待機を使う |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:

- Vitest / Playwright の公式 API と installed version の型・設定が食い違い、設定名を確定できない
- coverage provider が現行 runner / Sandbox で動かず、Istanbul fallback 等の選択が必要になる
- E2E 実装のために WebSocket protocol / Input payload / Snapshot layout の変更が必要になる
- `.github/workflows/` への書き込みが必要になる
- coverage 対象から重要な production code を広く除外しないと pass できない
- Phase 2 以降の設計実装を混ぜないと E2E が書けない

## 8. 完了時に行うこと

1. 差分を自己レビュー（coverage 除外理由、Playwright 設定、E2E の実行可否、スコープ外変更）
2. 4 検証を実行。coverage / e2e task では該当追加コマンドも実行または未実行理由を明記
3. `docs/task-list.md` を証拠付きで更新
4. `.agent/logs/YYYY-MM-DD_<summary>.md` を追加し、必要な知見を `.agent/skills/` に同期
5. タスク ID を含む Conventional Commit
6. セッション固定ブランチへ push
7. 証拠中心の完了報告

## 9. サブタスク分割

1 サブタスク = 1 commit。順序固定。進行中は 1 件。

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| PLAT-1.5 | Phase 1.5 計画追加 | `PHASE01_5_PLAN.md`、task-list / planning / handoff / API 根拠更新 | PH1-F |
| PH1.5-A | Vitest coverage 測定導入 | `@vitest/coverage-v8`、`test:coverage`、coverage config、baseline report | PLAT-1.5 |
| PH1.5-B | 意味のある coverage 増加 | report で選んだ重要未テスト branch への tests、before/after 証拠 | PH1.5-A |
| PH1.5-C | Playwright E2E 実装 | `@playwright/test`、`playwright.config.ts`、E2E smoke / network specs、Sandbox 未実行理由 | PH1.5-B |
| PH1.5-D | Quality gate docs / CI 提案整理 | task-list 証拠、必要なら `docs/ops/` CI 手順、次 Phase 2 handoff | PH1.5-C |

## 10. 設計詳細・仕様

### 10.1 Vitest coverage

公式 docs では Vitest coverage は `v8` / `istanbul` provider を選べ、support package は任意導入（例: `@vitest/coverage-v8`）とされている。`vitest run --coverage` または `test.coverage.enabled` で有効化できる。coverage include は未 import ファイルも測るため明示する。

本プロジェクト方針:

- まず `provider: 'v8'` を基本とする。ただし公式 docs は V8 provider が V8 runtime を必要とし、Bun runtime では動かないと明記しているため、実際の `vitest` 実行 runtime を確認する。問題があれば `istanbul` fallback を検討し、勝手に決めず停止条件に従う
- `coverage.include` は production source を対象にする。候補:
  - `packages/protocol/src/**/*.{ts,tsx}`
  - `packages/engine-core/src/**/*.{ts,tsx}`
  - `packages/profile-fps/src/**/*.{ts,tsx}`
  - `apps/web/src/**/*.{ts,tsx}`
  - `apps/gameserver/src/**/*.{ts,tsx}`
- `coverage.exclude` は entrypoint / vite-env / pure type / generated / test / barrel export など理由が明確なものに限る
- reporter は `text-summary`, `json-summary`, `lcov` を基本にし、HTML はローカル確認用。coverage artifacts は `.gitignore` 対象にする
- thresholds は PH1.5-A では baseline を壊さない控えめな値または未設定から始め、PH1.5-B で meaningful tests を追加した後に ratchet する。`autoUpdate` は便利だが config 自動書換えを伴うため、導入する場合は差分を必ず確認する

### 10.2 意味のある coverage 増加

優先順位:

1. **protocol / binary**: invalid length / channel / reserved flags / quantization roundtrip / fuzz の穴
2. **engine-core**: Room lifecycle、rate-limit 境界、SnapshotBroadcaster backpressure、Simulation accumulator edge
3. **profile-fps**: collision / movement edge、jump / gravity / obstacle collision
4. **apps/web net**: WebSocketTransport framing、GameClient welcome / binary reject / remotes / dispose
5. **input / UI seam**: PointerLock fallback、look delta consumption、StartOverlay / TouchControls の browser API fallback

禁止例:

- import するだけで coverage を通す test
- DOM に存在するだけの test を増やして critical branch を放置
- private field を無理に触るための `any` 多用
- 実装を test 都合へ退化させる変更

### 10.3 Playwright E2E

公式 docs では Playwright config に `webServer` を設定して local dev server を起動でき、`use.baseURL` を設定すると `page.goto('/')` など相対 URL を使える。複数 server も配列で起動できる。

本プロジェクト方針:

- `webServer.command` は root から `bun run start` を使う。`scripts/execute.ts` が build → gameserver :8080 → web preview :4173 を起動する
- `webServer.url` / `use.baseURL` は `http://127.0.0.1:4173` を基本にする。プレビュー環境では browser-facing code が backend を localhost 直叩きしないよう、アプリ側は引き続き `/ws` を使う
- E2E はまず Desktop Chromium 1 project。Firefox/WebKit/mobile は flake と browser install コストを見て後続
- テスト例:
  - page load → start overlay / canvas / renderer HUD が表示される
  - start 操作 → overlay が消える（fullscreen / pointer lock は拒否されても no crash）
  - `net: connected` など、gameserver と Vite proxy 経由の WS 接続が成立する（実環境のみ）
  - 2 page を開き、remote player path が破綻しない（flaky なら PH1.5-D または別タスク）
- Sandbox では Chromium binary install 不可のため、`bun run test:e2e` 実行は CI / 実環境に限定する。ローカルでは config typecheck / lint / unit / build で担保する

### 10.4 `.github/workflows/` 制約

AGENTS.md §6.3 により `.github/workflows/` は書き込み不可。CI を提案する場合は `docs/ops/` に YAML と配置手順を置く。PR 上で実 CI が必要な場合は人間が配置する。

## 11. リスク・Gotchas

- **coverage provider と Bun**: Vitest 公式は V8 provider が Bun runtime では動かないと明記している。`bun run` で script を起動していても、`vitest` 自体の実行 runtime / provider 挙動は実測で確認する
- **coverage artifacts**: `coverage/`, `playwright-report/`, `test-results/` は Git に入れない。必要な数値だけ docs に記録する
- **threshold 初期値**: 初回から高すぎる threshold は開発を止める。baseline → meaningful tests → ratchet の順にする
- **E2E flake**: WebGL / PointerLock / Fullscreen / WS timing は flake になりやすい。E2E は user-visible state と protocol-level signal を待つ
- **Sandbox**: Playwright browser 実行・2 タブ実結合・raw pointer lock 成否は実環境検証待ちにする。捏造しない

## 12. 実績と証拠（実装後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| PLAT-1.5 | 本コミット | docs 整合 / link check | Phase 1 と Phase 2 の間に coverage / meaningful tests / Playwright E2E 品質ゲートを追加。Vitest / Playwright 公式 docs を確認し、Sandbox での E2E 実行制約を明記。link check broken 0、typecheck・lint・unit・build pass、git diff --check pass |
| PH1.5-A | | | |
| PH1.5-B | | | |
| PH1.5-C | | | |
| PH1.5-D | | | |
