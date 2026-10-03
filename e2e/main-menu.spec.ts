import { expect, test } from '@playwright/test'

// Landscape viewport — the UI shows a rotate-device overlay in portrait.
test.use({ viewport: { width: 1280, height: 720 } })

test.describe('main menu smoke', () => {
  test('loads the home panel with mode tabs and loadout entry', async ({ page }) => {
    await page.goto('/')

    // Mode tabs (MP / BR) are rendered on the home panel.
    await expect(page.getByText('MULTIPLAYER', { exact: false }).first()).toBeVisible()
    // Loadout entry point exists.
    await expect(page.getByText('LOADOUT', { exact: false }).first()).toBeVisible()
  })

  test('loadouts API round-trips (in-memory fallback without DATABASE_URL)', async ({
    request,
  }) => {
    const put = await request.put('/api/loadouts', {
      data: { data: { classes: [], equipped: 0 } },
    })
    expect(put.ok()).toBeTruthy()

    const get = await request.get('/api/loadouts')
    expect(get.ok()).toBeTruthy()
    const body = (await get.json()) as { data: { equipped: number } | null }
    expect(body.data?.equipped).toBe(0)
  })

  test('health endpoint reports ok', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBeTruthy()
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
  })
})
