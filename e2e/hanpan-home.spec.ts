import { test, expect, type Page } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/** Hanpan Home: the mind map leads, and a topic typed on the start board opens a map with it in the middle. */

test('Home leads with the mind map, and a typed topic opens a map with it', async () => {
  test.setTimeout(120_000)
  const launched = await launchShell({ onboardingSeen: true, videoDir: 'hanpan-home', lang: 'ko' })
  const { app, page } = launched
  try {
    const board = page.locator('[data-hanpan="start-board"]')
    await expect(board).toBeVisible()
    await expect(page.locator('.quick-card').first()).toHaveAttribute('data-new', 'xmind')
    await expect(page.locator('.quick-card').nth(1)).toHaveAttribute('data-new', 'hwp')
    await expect(page.locator('.quick-card').nth(2)).toHaveAttribute('data-new', 'pptx')
    await expect(page.locator('.quick-card').nth(3)).toHaveAttribute('data-new', 'docx')
    await page.screenshot({ path: screenshotPath('hanpan-home-light') })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.screenshot({ path: screenshotPath('hanpan-home-dark') })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))

    await page.locator('[data-hanpan="start-topic"]').fill('학부모 설명회 준비')
    await page.locator('[data-hanpan="start-go"]').click()
    const map = await waitForPageWithUrl(app, '://mindmap/', 30_000)
    await expect(map.locator('body')).toContainText('학부모 설명회 준비', { timeout: 30_000 })
    await map.screenshot({ path: screenshotPath('hanpan-home-new-map') })

    // the user guide, one click from the top of the board: the help tab opens on Hanpan's guide
    await page.evaluate(() =>
      (window as unknown as { aiOfficeTabs: { activate(id: string): Promise<void> } }).aiOfficeTabs.activate('home'),
    )
    await page.locator('[data-hanpan="start-guide"]').click()
    // the help tab's page is the one with the manual's topic list
    let help: Page | undefined
    await expect
      .poll(
        async () => {
          for (const candidate of app.windows()) {
            if (await candidate.locator('.help-topic').count().catch(() => 0)) help = candidate
          }
          return Boolean(help)
        },
        { timeout: 30_000 },
      )
      .toBe(true)
    // it opens on Hanpan's own guide, which walks through the design AI helper
    await expect(help!.locator('body')).toContainText('이 디자인에 글 채우기', { timeout: 15_000 })
    await help!.screenshot({ path: screenshotPath('hanpan-home-guide') })
  } finally {
    await closeAndSaveVideo(launched)
  }
})
