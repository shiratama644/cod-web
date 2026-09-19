import { defineConfig, devices } from '@playwright/test'

const localBaseURL = 'http://127.0.0.1:4173'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? localBaseURL
const shouldStartLocalServer = !process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: shouldStartLocalServer
    ? {
        // lighter than `bun run start` (which does install+build+server+preview).
        // For E2E discovery (`--list`) browser binary is not needed.
        // Full E2E with WS needs gameserver running separately (`bun run server`)
        // or use `bun run start` manually. See docs/ops/quality-gates.md.
        command: 'bun run preview',
        url: localBaseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
        gracefulShutdown: { signal: 'SIGTERM', timeout: 1_000 },
      }
    : undefined,
})
