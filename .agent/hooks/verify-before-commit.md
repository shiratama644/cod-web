# Hook: Verify Before Commit（commit 直前検証）

> **トリガー**: 実装が終わり、Git Commit する直前。
> **目的**: AGENT.md §3.1 の検証を必ず全 pass させてから commit する。途中の検証失敗で次へ進んではならない。

## 検証（順に実行、1 つでも失敗したら原因特定→修正→再全検証）

実装層に応じて対象が変わるため、**各パッケージの検証手順に従う**。標準は:

```bash
pnpm typecheck                # tsc --noEmit (client / server / shared)
pnpm lint                     # 各パッケージの linter
pnpm test:unit                # vitest run （※ watch を使わない）
pnpm build                    # production build / bundle
```

> 検証コマンドが未確定の段階では、**検証手順の整備を先に進める**（ドキュメントファースト方針）。捏造したコマンドは実行しない。

### 各コマンドの注意

- **typecheck**: `noUncheckedIndexedAccess` 有効なら配列アクセスに注意。
- **lint**: `0 error / 0 warning` を目指す。無効化・エラー握りつぶしはしない（§3.2）。
- **test:unit**: `pnpm test`（watch）**ではない**。必ず `test:unit`（vitest run）。
- **build**: 開発環境固有の通信エラー（ネットワーク到達不可等）は §6.2 の方針に従い迂回。exit code 0 を基準に判断。

## 追加確認（commit 前）

```bash
git status
git diff                       # 意図しないファイル/差分が無いか
```

## 検証失敗時の原則（§3.2）

- テストを通すためだけの**不正な修正厳禁**（テスト削除/skip・アサーション緩和・安易な `any`・Lint 無効化・エラー握り潰し）。
- 既存テストが落ちたら「テストが間違っている」と即断せず、**既存仕様を壊していないか**先に確認。

## E2E について

- `playwright test` 等は必要に応じ CI で実行。ローカル実行可否は開発環境に依存し、できない場合は CI で担保する（ローカルで無理に実行しない）。

## 完了後

検証 all pass + 意図しない差分なし を確認 → commit（Conventional Commits 形式）→ `git push origin <session-branch>`。
