# Hook: Verify Before Commit（commit 直前検証）

> **トリガー**: 実装が終わり、Git Commit する直前。
> **目的**: AGENTS.md §3.1 の 4 検証 + coverage + determinism + E2E discoveryを必ず全 pass させてから commit する。途中の検証失敗で次へ進んではならない。

## 4+3 検証（順に実行、1 つでも失敗したら原因特定→修正→再全検証）

```bash
bun run typecheck                # tsc --noEmit および tsc -p tsconfig.server.json
bunx biome lint .                # Biome 直接呼出（bun run lint より起動が速い）
bun run test:unit                # vitest run （※ watch モードではない）
bun run build                    # vite build（production）
# 追加（EM01/EM02で確立、quality-gates.ymlと同順）
bun run check:determinism        # SimProfile.step禁止API検出
bun run test:coverage            # threshold 85/85/85/85、実績95.12%/87.97%/90.7%/96.8%
bun run test:e2e -- --list       # E2E discovery、browser起動なし（Sandboxでも実行可）
```

### 各コマンドの注意

- **typecheck**: `tsc --noEmit`。strict 構成。配列アクセス・nullable に注意。
- **biome lint**: `0 error / 0 warning` まで。`biome-ignore` は対象コードの**直前の行**に置く（1 行以上離れると unused 判定で逆に警告になる, AGENTS.md §6.5）。テストファイルは `overrides` で `noNonNullAssertion` off。
  - `noConsole` は `apps/web/src/game/babylon/**/*` と `apps/web/src/game/net/**/*` でerrorレベル（EM01-B）。`console.log` 3件はgameserver運用ログとして許容、BabylonGameのクライアント側はHUD代替。
  - `noRestrictedImports` / `noPrivateImports` はレイヤー境界（`import-boundaries/SKILL.md`）。`@cod/engine-core` 直接importはwebで禁止、profile-fpsは `createFpsSimProfile()` 経由のみ。
- **test:unit**: `vitest`（watch）**ではない**。必ず `test:unit`（vitest run）。Canvas/WebGL は jsdom で描画テストしない。シム・パックは純粋関数（[`../skills/sandbox-constraints/SKILL.md`](../skills/sandbox-constraints/SKILL.md)）。
  - `App.tsx` は `GameCanvas/HUD/TouchControls/StartOverlay` モックで100%（EM02）。
  - `BabylonGame` は `babylonDeps.ts` ファサード分離 + `vi.mock` でWebGL非依存（EM02 96.9%）。
  - `InputController` はWASD/矢印/Space/joystick deadzone/normalize/pitch clamp/pointer up/PointerLock（EM02 95%）。
- **build**: `vite build`。成果物は `dist/`。
  - バンドルサイズは `ls -lh dist/assets` 等で直接確認（3D エンジンは大きい。依存の重複・chunk 分割に注意）。
- **check:determinism**: `scripts/check-determinism.ts` 禁止パターン検出。`Math.random` / `Date.now` / `performance.now` / `setTimeout` がSimProfile.stepに混入していないか（`deterministic-sim/SKILL.md`）。
- **test:coverage**: threshold 85/85/85/85。include-all方針、難しいfileをexcludeして数字を作らない。handlers.ts分離でBun.serveモック、babylonDeps分離でWebGLモック（`testing/SKILL.md`）。
- **test:e2e -- --list**: E2E discovery、browser起動なし。Sandboxでも実行可、spec列挙のみ確認（`e2e/SKILL.md`）。本物のbrowser実行はCI `quality-gates.yml` e2e jobで `bunx playwright install --with-deps chromium` 後に `bun run test:e2e`。
- **ドキュメントのみ変更時**: 4+3 検証はスキップ可（AGENTS.md §3.1）。代わりに「リンク切れ・他ファイルとの参照整合・旧名称の残存がないこと」を grep 等で確認する。内部リンクはfenced/inline code除外、外部URLは公式URLをfetch_pageで200確認、proposal yml参照残存チェック（`docs-maintenance/SKILL.md`）。

## 追加確認（commit 前）

```bash
git status
git diff                       # 意図しないファイル/差分が無いか
# ゼロアロケ監査（EM01）
grep -R "getPlayers()" packages/engine-core --include="*.ts" | grep -v "getPlayersIterable\|getPeersIterable"
grep -R "\.shift()" packages/engine-core/src --include="*.ts"
# メモリリーク監査（EM01）
grep -R "removePlayer\|clear" packages/engine-core/src --include="*.ts" | grep -E "leave|close"
# proposal yml残存チェック（2026-09-22）
ls docs/ops/  # README.md + quality-gates.md のみ
grep -R "github-actions-proposal" docs/ --include="*.md"
```
- タスク範囲外のファイルが混ざっていないか確認する。
- `.archive/` 等のアーカイブを置いている場合は、それがビルド/lint/テストの対象外であることを確認（AGENTS.md §4.5）。

## 検証失敗時の原則（AGENTS.md §3.2）

- テストを通すためだけの**不正な修正厳禁**（テスト削除/skip・アサーション緩和・安易な `any`・Lint 無効化・エラー握り潰し）。
- 既存テストが落ちたら「テストが間違っている」と即断せず、**既存仕様を壊していないか**先に確認。
- **any濫用禁止**: biome-ignore + anyはprivate accessテストのみ許容、prodではany禁止（EM02）。

## E2E について

- `bun run test:e2e`（Playwright）は **Sandbox ではbrowser実行不可**（Chromium install 不可）。CI（GitHub Actions）でのみbrowser実行。
- commit 前検証には `test:e2e -- --list` discoveryは含める（Sandboxでも実行可）。browser実行は含めない。

## pre-commit hook timeout対策

- `git commit` without --no-verifyは typecheck+biome+determinism+vitest 30files 189tests ~5sで15s timeoutする可能性。docs-onlyなら `--no-verify` で回避可（AGENTS.md §3.1、sandbox-constraints/SKILL.md）。
- `git add -A; git commit; git push` 単一bashはpushで15s timeout。commitとpushを分離。

## 完了後

4+3 検証 all pass（または docs-only 時の整合性確認）を確認 → commit（Conventional Commits、タスク ID をスコープに）→ `git push origin <session-branch>`（AGENTS.md §4.3.1 で事前許可済み）。

