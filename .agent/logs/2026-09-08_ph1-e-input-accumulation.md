# PH1-E: unadjustedMovement + 入力累積

> Date: 2026-09-08(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

PH1-E として、Pointer Lock で `unadjustedMovement: true` を first try し、raw mouse input が未対応で拒否された場合は通常 Pointer Lock にフォールバックする。さらに mousemove/pointermove で yaw/pitch を直接更新せず、視線 delta を累積し、Babylon render loop のフレーム先頭で消費する。

## 2. 実行内容 (Executed Actions)

| 対象 | 内容 |
|---|---|
| `apps/web/src/game/input/InputController.ts` | `requestPointerLock({ unadjustedMovement: true })` を first try。Promise/void 差を Promise-like 判定で扱い、`NotSupportedError` 時だけ通常 `requestPointerLock()` へ fallback。視線 delta 用の pending queue と `consumeLookDelta()` を追加 |
| `apps/web/src/game/babylon/BabylonGame.ts` | render loop 先頭で `input.consumeLookDelta()` を呼び、入力サンプリング前に視線 delta を消費 |
| `_tests_/apps/web/src/game/input/InputController.test.ts` | raw pointer lock fallback、ドラッグ look の蓄積消費、PointerLock movement の蓄積消費を jsdom unit で検証 |
| docs / skills | `docs/task-list.md`, `PHASE01_PLAN.md`, `HANDOFF.md`, `planning/README.md`, `docs/arch/client.md`, `.agent/skills/tech-stack/SKILL.md`, `.agent/skills/index.md` を PH1-E 実績と次タスク PH1-F に更新 |

検証:

- `bun run typecheck`: pass
- `bunx biome lint .`: pass（71 files）
- `bun run test:unit`: pass（13 files / 81 tests）
- `bun run build`: pass（Vite chunk-size warning のみ）

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- `Element.requestPointerLock()` は現行 TS DOM lib では `Promise<void>` だが、実ブラウザには旧式の void 戻り値が残り得るため、戻り値を Promise と決め打ちして `.catch()` しない。
- raw mouse 未対応の fallback は MDN の例どおり `NotSupportedError` を通常 Pointer Lock へ戻す経路に限定するのが安全。`SecurityError` 等はユーザージェスチャ不足など通常 fallback でも解決しない可能性がある。
- jsdom では Pointer Lock 実ブラウザ挙動や raw mouse の成否は確認できない。unit では呼び出し順と delta 蓄積/消費のロジックだけを検証する。

## 4. 次にすべきこと (Next Actions)

- PH1-F: React が HUD / メニュー / オーバーレイに留まること、3D JSX / R3F / Three 描画が戻っていないこと、単一静的マップで既存ネット経路が Babylon 上に維持されていることを最終整理する。
- raw pointer lock の実ブラウザ成功可否や 2 タブ位置同期の目視は Sandbox で捏造せず、必要に応じて実環境検証待ちとして扱う。
