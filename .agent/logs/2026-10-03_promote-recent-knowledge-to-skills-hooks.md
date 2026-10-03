# ログ総点検 + 直近知見の hooks/skills 昇格

> Date: 2026-10-03(JST) / Commit: TBD / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)

ユーザー: 「AGENTS.mdと.agent/をすべてくまなく読み込んでください。.agent/logs/を確認して再利用可能なものhooks, skillsにしてください」

## 2. 実行内容 (Executed Actions)

| # | 対象 | 実装 |
|---|---|---|
| 1 | 全読込 | AGENTS.md 全文、hooks 7ファイル、skills 17 + index、logs 70件（2026-09-03〜09-23）を読了 |
| 2 | 昇格状況の判定 | 2026-09-22 の昇格作業（`2026-09-22_promote-logs-to-skills-hooks-rules.md`）で 9/22 までのログは昇格済み、9/23 TS ログも tech-stack 反映済みと確認。**未昇格 = ログ未作成だった 2026-09-24〜10-03 の直近セッション知見** |
| 3 | 新スキル | `nextjs-frontend/SKILL.md`（Next 16 運用・e2b プレビュー・@types dedupe・ツールチェーン分担・E2E webServer）、`codm-research/SKILL.md`（R0〜R7・ハイブリッド基準・検証ラベル・IP境界） |
| 4 | hooks 更新 | `sandbox-rebuild-recovery.md` に「完全再構築 vs HEADのみ巻き戻り」診断表 + `reset --soft` 復旧を追加。`pre-task.md` に巻き戻り診断・bun PATH 復旧・19スキル読み分け（nextjs-frontend / codm-research / gamemode-api 追加）・旧クライアント参照注意。`verify-before-commit.md` を Next 体制に刷新（check:all 推奨、build=next、apps/web は ESLint+ローカル tsc、旧 Vite/App.tsx/BabylonGame 記述を整理）。`hooks/index.md` / `log-task.md` の一覧・判断基準を 19 スキル体制に更新 |
| 5 | skills 更新 | `skills/index.md` に新2スキル + 2026-10-03 注記（旧クライアント参照は歴史的記録）。stale 参照を含む 8 スキル（tech-stack / project-overview / babylon-engine / input-accumulation / testing / e2e / zero-alloc / import-boundaries）に現状注記を挿入。`sandbox-constraints` に巻き戻り・bun PATH・frozen-lockfile 知見追記 |
| 6 | ログ | 未記録だった直近2タスクをバックフィル（`codm-deep-research-plan-r0-hybrid-baseline`, `nextjs-frontend-adoption-and-vite-removal`）+ 本ログ。過去ログは一切書き換えていない（§8.5 遵守） |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- ログは 9/23 で途絶えており、9/24 以降の大型タスク（リサーチ計画・Next 採用・Vite 削除）がログ未作成だった。**log-task hook はタスク完了ターンで即実行しないと漏れる**。
- index 類のスキル数が「11」のまま stale だった（実際は 17→今回 19）。スキル追加時は index の数まで grep して直す。
- 旧クライアント知見（babylon-engine / input-accumulation 等）は削除で無価値になるのではなく、S フェーズ再統合の設計資産。消さずに「歴史的記録 + 再利用予定」と明示する方針を採った。
- HEAD のみ巻き戻り（reset --soft 復旧）はこのセッション最頻出の環境トラブルだが、どの hook にも書かれていなかった。恒久化した。

## 4. 次にすべきこと (Next Actions)

1. AGENTS.md の Vite 前提記述（§3.1 build コメント、§6.1 Build/Dev、§6.5 noConsole パス、§7.2 報告テンプレ）が stale。スコープ外のためユーザー確認の上で別タスクとして更新する。
2. R1 リサーチの GO、または S フェーズ設計着手の指示待ち。
3. `packages/engine-core/src/client/` の要否についてユーザー返答待ち。
