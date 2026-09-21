---
name: e2e
description: Playwright E2EをSandboxでも安全に扱うスキル。webServer配列、baseURL分岐、discovery検証、WebSocketモック、browser非捏造原則。
---

# E2E — PlaywrightをSandboxで安全に扱うスキル

> 仕様正本: `docs/ops/quality-gates.md` §5, `docs/arch/engineering.md`  
> 計画: `docs/planning/PHASE01_5_PLAN.md` §10.3, `EM01_PLAN.md` B16, `EM02_PLAN.md` §10.4

## Sandbox制約

- E2E browser実行をSandboxで捏造しない
- `bun run test:e2e -- --list` はbrowserを起動しないdiscovery検証として有用（PH1.5-C/Dで確立）
- 本物のbrowser実行はCI (`quality-gates.yml` e2e job) またはpreviewで

## playwright.config.ts 正しい構成

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : [
    {
      command: 'bun run --filter @cod/gameserver start',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'bun run --filter @cod/web dev -- --host 0.0.0.0 --port 5173',
      port: 5173,
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

### なぜ配列webServerか

- 単一commandでは `bun run start`（install/build/server/previewまとめる）が使えるが、並列制御とgracefulShutdownが配列の方が明確
- `PLAYWRIGHT_BASE_URL` がある場合はpreview/CIの既存URLを対象にし、local `webServer` を起動しない構成にすると、同じspecをlocalとCI/previewで使い回せる
- `reuseExistingServer: !CI` でCIでは毎回fresh、localでは再利用

## 公式docs検証（PH1.5-C/D）

| 項目 | 公式URL | 要点 |
|---|---|---|
| CI | https://playwright.dev/docs/ci | `bunx playwright install --with-deps chromium` がBun projectで自然 |
| webServer | https://playwright.dev/docs/test-webserver | `command/url/reuseExistingServer/timeout/stdout/stderr/gracefulShutdown` と `use.baseURL` 併用推奨 |
| WebSocket | https://playwright.dev/docs/api/class-websocket | frameのinspect/manipulate |
| Mock | https://playwright.dev/docs/mock#mock-websockets | websocket mocking、page.route、HAR |

## E2E specの書き方

- browser-facing codeにbackend `localhost` を書かず、app側の `/ws` same-origin proxyをユーザー可視HUD (`net: connected`) で検証
- `page.waitForSelector('[data-testid="net-connected"]')` のようにHUD経由
- WebSocketは `page.on('websocket', ws => ws.on('framereceived', ...))` で観測

```ts
test('connects via ws proxy and shows HUD', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-overlay')).toBeVisible();
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('net-connected')).toBeVisible({ timeout: 10_000 });
  // WebSocket frames
  page.on('websocket', ws => {
    ws.on('framereceived', ({ payload }) => {
      // payload instanceof ArrayBuffer | string
    });
  });
});
```

## Discovery検証（Sandboxで実行可能）

```bash
bun run test:e2e -- --list   # spec列挙のみ、browser起動なし
bun run test:e2e -- --list 2>&1 | grep "test:"
```

- quality-gates.ymlのe2e jobは `bunx playwright install --with-deps chromium` 後に `bun run test:e2e`

## よくある失敗

- `localhost:3000` 直叩き: ブラウザ側でlocalhost固定するとpreviewホストで動かない。相対URL + dev server proxyを使う
- `webServer.command` に `bun run start` しか書かないと、gameserver/webのログが混ざってデバッグ困難。配列で分離
- `page.route` でwsをmockしようとしてhttpのみmock: `mock#mock-websockets` セクションを参照

## 関連

- `docs/ops/quality-gates.md` §5 E2E
- `tests/e2e/*.spec.ts`
- `playwright.config.ts`
- `.agent/logs/2026-09-09_ph1-5-c-playwright-e2e-entry.md`
- `.agent/logs/2026-09-12_ph1-5-d-quality-gates-ci-proposal.md`
