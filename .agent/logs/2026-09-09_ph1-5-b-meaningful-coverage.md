# PH1.5-B: 意味のある Vitest coverage 増加

- 日付: 2026-09-09
- ブランチ: `arena/01a0748a-cod-web`
- タスク: `PH1.5-B`

## 実施内容

- Sandbox 再構築状態から `origin/arena/01a0748a-cod-web` の `1aba712` へ復旧し、bun 1.4.0 / 依存を再構築。
- coverage の数字稼ぎではなく、重要経路の assertion を追加。
  - `WebSocketTransport`: browser `WebSocket` mock で `binaryType = 'arraybuffer'`、open/close/error status、text control 分岐、Channel-prefixed binary decode、malformed frame 1002 close、no-copy send、fallback frame buffer を検証。
  - `GameClient`: mock transport で welcome reject、status lifecycle、malformed snapshot ignore、Reliable channel ignore、long frame clamp、dispose 後送信停止を検証。
  - `Interpolator`: short extrapolation、cap 超過 hold、departing remote、yaw wrap、history bound を検証。
  - `StartOverlay`: Fullscreen unavailable / Promise reject / sync throw / change cleanup を mock screenfull で検証。
  - `TouchControls`: non-touch fallback、coarse pointer joystick、clamp、end/hidden/removed/unmount reset、jump を mock nipplejs で検証。
- Coverage thresholds を PH1.5-B after に合わせて conservative に ratchet。

## Coverage

| Metric | PH1.5-A baseline | PH1.5-B after |
|---|---:|---:|
| Statements | 66.82% (725/1085) | 79.17% (859/1085) |
| Branches | 57.10% (225/394) | 73.85% (291/394) |
| Functions | 64.43% (125/194) | 79.38% (154/194) |
| Lines | 68.97% (696/1009) | 80.77% (815/1009) |

Ratchet thresholds in `vitest.config.ts`:

- statements: 79
- branches: 73
- functions: 79
- lines: 80

## 検証

- `bun run test:coverage`: pass（17 files / 107 tests、coverage thresholds pass）
- `bun run typecheck`: pass
- `bunx biome lint .`: pass（75 files）
- `bun run test:unit`: pass（17 files / 107 tests）
- `bun run build`: pass（既存 Vite chunk-size warning のみ）
- `git diff --check`: pass

## Gotchas

- `apps/gameserver/src/index.ts` は top-level `Bun.serve` / timer を持つため、coverage のために直 import しない。必要なら handler seam 抽出を別途行う。
- `WebSocketTransport` の fallback send は内部 `frameBuffer` を再利用するため、送信 mock に保持された subarray は後続送信で backing buffer の内容が変わり得る。テストでは送信直後に byte snapshot を取る。
- `TouchControls` の親要素は `aria-hidden="true"` なので、Testing Library の role query では jump button が見つからない。テストでは `getByText('JUMP')` を使う。
