import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath } from './helpers'

/**
 * 0.17 위젯 및 인터페이스 사용자화: Home starts with recent documents,
 * favorites and a quick memo; the person adds and configures more widgets
 * (a titled note, a link shortcut, a clock), resizes and removes them, and
 * the arrangement survives a restart.
 */
test('Home widgets: add, configure, resize, remove and keep them across a restart', async () => {
  test.setTimeout(150_000)
  const first = await launchShell({ onboardingSeen: true, videoDir: 'home-widgets', lang: 'ko' })
  const { page, userDataDir } = first
  const last = () => page.locator('[data-widget]').last()
  try {
    for (const type of ['recent', 'favorites', 'memo'])
      await expect(page.locator(`[data-widget-type="${type}"]`)).toBeVisible()
    await page.locator('[data-widget-type="memo"] textarea').fill('오후 3시 결재 올리기')
    await page.locator('[data-widget-type="memo"] textarea').blur()

    // a second note with its own title
    await page.locator('[data-home-widgets="add"]').first().click()
    await page.screenshot({ path: screenshotPath('home-widgets-gallery') })
    await page.locator('[data-widget-gallery] [data-add-type="memo"]').click()
    await last().locator('input[name="title"]').fill('이번 주 할 일')
    await last().locator('[data-widget-done]').click()
    await last().locator('textarea').fill('견적서 보내기')
    await last().locator('textarea').blur()

    // a web link shortcut, made wide
    await page.locator('[data-home-widgets="add"]').first().click()
    await page.locator('[data-widget-gallery] [data-add-type="shortcut"]').click()
    await last().locator('select[name="kind"]').selectOption('link')
    await last().locator('input[name="title"]').fill('사내 포털')
    await last().locator('input[name="link"]').fill('https://intra.example.com')
    await last().locator('select[name="size"]').selectOption('wide')
    await page.screenshot({ path: screenshotPath('home-widgets-settings') })
    await last().locator('[data-widget-done]').click()
    await expect(last()).toHaveAttribute('data-size', 'wide')
    await expect(last().locator('[data-shortcut-open]')).toContainText('사내 포털')

    // a clock, then remove the recent documents widget
    await page.locator('[data-home-widgets="add"]').first().click()
    await page.locator('[data-widget-gallery] [data-add-type="clock"]').click()
    await expect(last().locator('[data-clock-time]')).toHaveText(/\d{1,2}:\d{2}/)
    await page.locator('[data-widget-type="recent"]').hover()
    await page.locator('[data-widget-type="recent"] [data-widget-remove]').click()
    await expect(page.locator('[data-widget-type="recent"]')).toHaveCount(0)

    // app cards: hide one and pin one into favorites
    await page.locator('[data-home-custom="open"]').click()
    const panel = page.locator('[data-home-custom="panel"]')
    await panel.locator('[data-custom-card="html"] input[type="checkbox"]').uncheck()
    await panel.locator('[data-custom-card="pptx"] [data-pin]').click()
    await page.screenshot({ path: screenshotPath('home-widgets-panel') })
    await panel.locator('[data-home-custom="close"]').click()
    await page.locator('.home-widgets-wrap').scrollIntoViewIfNeeded()
    await page.screenshot({ path: screenshotPath('home-widgets'), fullPage: true })
  } finally {
    await closeAndSaveVideo(first)
  }

  const second = await launchShell({ userDataDir, videoDir: 'home-widgets-restart', lang: 'ko' })
  try {
    const page2 = second.page
    await expect(page2.locator('[data-widget-type="memo"]')).toHaveCount(2)
    await expect(page2.locator('[data-widget-type="memo"] textarea').first()).toHaveValue(
      '오후 3시 결재 올리기',
    )
    await expect(page2.locator('[data-widget-type="recent"]')).toHaveCount(0)
    await expect(page2.locator('[data-widget-type="shortcut"]')).toHaveAttribute(
      'data-size',
      'wide',
    )
    await expect(page2.locator('[data-widget-type="clock"]')).toBeVisible()
    await expect(page2.locator('.hp-cards [data-new="html"]')).toHaveCount(0)
    await expect(page2.locator('[data-fav-app="pptx"]')).toBeVisible()
    await page2.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page2.locator('.home-widgets-wrap').scrollIntoViewIfNeeded()
    await page2.screenshot({ path: screenshotPath('home-widgets-dark') })

    // 기본값으로 되돌리기 brings back the three default widgets
    await page2.locator('[data-home-custom="open"]').click()
    await page2.locator('[data-home-custom="reset"]').click()
    // it asks first (99c216e9); nothing changes until the person confirms
    await expect(page2.locator('.hc-reset-ask')).toBeVisible()
    await expect(page2.locator('[data-widget]')).toHaveCount(5)
    await page2.locator('[data-home-custom="reset-confirm"]').click()
    await page2.locator('[data-home-custom="close"]').click()
    await expect(page2.locator('[data-widget]')).toHaveCount(3)
    await expect(page2.locator('.hp-cards [data-new="html"]')).toHaveCount(1)
  } finally {
    await closeAndSaveVideo(second)
  }
})
