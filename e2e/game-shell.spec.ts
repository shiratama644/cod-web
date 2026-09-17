import { expect, test } from '@playwright/test'

test.describe('game shell smoke', () => {
  test('loads the Babylon game shell with HUD and start overlay', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle('cod-web')
    await expect(page.getByLabel('Game view')).toBeVisible()
    await expect(page.getByRole('status')).toContainText('renderer:')
    await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'TAP TO START' })).toBeVisible()
  })

  test('starts from the overlay even if browser fullscreen is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        configurable: true,
        value: false,
      })
    })
    await page.goto('/')

    await page.getByRole('button', { name: 'Start game' }).click()

    await expect(page.getByRole('button', { name: 'Start game' })).toBeHidden()
    await expect(page.getByLabel('Game view')).toBeVisible()
  })

  test('connects to the game server through the same-origin websocket proxy', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('status')).toContainText('renderer: babylon-webgl')
    await expect(page.getByRole('status')).toContainText('net: connected', { timeout: 10_000 })
  })
})
