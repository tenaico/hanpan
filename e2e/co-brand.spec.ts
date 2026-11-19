import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath } from './helpers'

/**
 * The logo row and the made-by line on the real home: Vietnamese shows
 * "Hanpan" with DON CHICKEN's logo beside it (with DON CHICKEN Vietnam's
 * permission, 2026-11-19), Korean shows "한판" alone, and every language
 * says "Made by TenAI". The line is not pressed here: it opens a browser.
 */
test.describe('logo row and made-by line', () => {
  test.describe.configure({ timeout: 120_000 })

  test('the Vietnamese home shows Hanpan beside the DON CHICKEN logo', async () => {
    const launched = await launchShell({
      onboardingSeen: true,
      lang: 'vi',
      videoDir: 'co-brand-vi',
    })
    const { page } = launched
    try {
      const row = page.locator('.sidebar .sidebar-logo.with-partner')
      await expect(row.locator('img.logo-lockup')).toHaveAttribute('alt', 'Hanpan')
      const logo = row.locator('img.cobrand-logo')
      await expect(logo).toBeVisible()
      await expect(logo).toHaveAttribute('alt', 'DON CHICKEN')
      // both pictures really loaded (a broken image has no natural width)
      for (const img of [row.locator('img.logo-lockup'), logo]) {
        await expect
          .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
          .toBeGreaterThan(500)
      }
      await expect(page.locator('.sidebar .made-by-link')).toHaveText('Made by TenAI')
      await page.screenshot({ path: screenshotPath('co-brand-vi-home') })
    } finally {
      await closeAndSaveVideo(launched, 'co-brand-vi')
    }
  })

  test('the Korean home shows 한판 alone and the same made-by line', async () => {
    const launched = await launchShell({
      onboardingSeen: true,
      lang: 'ko',
      videoDir: 'co-brand-ko',
    })
    const { page } = launched
    try {
      await expect(page.locator('.sidebar img.logo-lockup')).toHaveAttribute('alt', '한판')
      await expect(page.locator('.sidebar .cobrand-logo')).toHaveCount(0)
      await expect(page.locator('.sidebar .made-by-link')).toHaveText('Made by TenAI')
    } finally {
      await closeAndSaveVideo(launched, 'co-brand-ko')
    }
  })
})
