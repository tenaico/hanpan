import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath } from './helpers'

/**
 * The Vietnamese screen shows DON CHICKEN's logo under Hanpan's (with DON
 * CHICKEN Vietnam's permission, 2026-11-19); every language says TenAI made
 * the app.
 */
test.describe('partner logo and maker line', () => {
  test('the Vietnamese home shows the DON CHICKEN logo and the TenAI line', async () => {
    const launched = await launchShell({
      onboardingSeen: true,
      lang: 'vi',
      videoDir: 'co-brand-vi',
    })
    const { page } = launched
    try {
      const logo = page.locator('.sidebar .cobrand img.cobrand-logo')
      await expect(logo).toBeVisible()
      await expect(logo).toHaveAttribute('alt', 'DON CHICKEN')
      // the picture really loaded (a broken image has no natural width)
      await expect
        .poll(() => logo.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(1000)
      await expect(page.locator('.sidebar .made-by')).toHaveText('Sản phẩm của TenAI')
      await page.screenshot({ path: screenshotPath('co-brand-vi-home') })
    } finally {
      await closeAndSaveVideo(launched, 'co-brand-vi')
    }
  })

  test('the Korean home has no partner logo and says TenAI made it', async () => {
    const launched = await launchShell({
      onboardingSeen: true,
      lang: 'ko',
      videoDir: 'co-brand-ko',
    })
    const { page } = launched
    try {
      await expect(page.locator('.sidebar .made-by')).toHaveText('TenAI가 만들었습니다')
      await expect(page.locator('.cobrand')).toHaveCount(0)
    } finally {
      await closeAndSaveVideo(launched, 'co-brand-ko')
    }
  })
})
