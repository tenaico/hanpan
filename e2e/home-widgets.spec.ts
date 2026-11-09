import { test, expect, type Page } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath } from './helpers'

/**
 * The home board (0.19): Home starts with the start, New, Continue, quick memo
 * and favorites cards; the person adds and configures more cards (a titled
 * note, a link shortcut, a clock) while customizing, removes one, hides an
 * app, and the board survives a restart. Pinning an app back from All apps
 * and Default layout finish it.
 */

const cardTypes = (page: Page) =>
  page
    .locator('[data-home-board] [data-card]')
    .evaluateAll((cards) => cards.map((c) => c.getAttribute('data-card-type')))

test('Home board: add, configure, remove and keep cards across a restart', async () => {
  test.setTimeout(150_000)
  const first = await launchShell({ onboardingSeen: true, videoDir: 'home-widgets', lang: 'ko' })
  const { page, userDataDir } = first
  const last = () => page.locator('[data-home-board] [data-card]').last()
  const memo = page.locator('[data-card="memo"] textarea')
  try {
    // the default board: no forecast address in e2e (R10), so no trend card
    await expect(page.locator('[data-home-board]')).toBeVisible()
    await expect
      .poll(() => cardTypes(page))
      .toEqual(['start', 'apps', 'recent', 'memo', 'favorites'])
    await memo.fill('오후 3시 결재 올리기')
    await memo.blur()

    // a second note with its own title; card bodies are inert while customizing
    // (R16), so the note text goes in after Done
    await page.locator('[data-home-custom="open"]').click()
    await expect(page.locator('[data-customize-bar]')).toBeVisible()
    await page.locator('[data-customize="add"]').click()
    await page.screenshot({ path: screenshotPath('home-widgets-gallery') })
    await page.locator('[data-widget-gallery] [data-add-type="memo"]').click()
    await expect(last()).toHaveAttribute('data-card-type', 'memo')
    await last().locator('input[name="title"]').fill('이번 주 할 일')
    await last().locator('[data-widget-done]').click()
    await page.locator('[data-customize="done"]').click()
    await expect(page.locator('[data-customize-bar]')).toHaveCount(0)
    await last().locator('textarea').fill('견적서 보내기')
    await last().locator('textarea').blur()

    // a web link shortcut, made wide
    await page.locator('[data-home-custom="open"]').click()
    await page.locator('[data-customize="add"]').click()
    await page.locator('[data-widget-gallery] [data-add-type="shortcut"]').click()
    await expect(last()).toHaveAttribute('data-card-type', 'shortcut')
    await last().locator('select[name="kind"]').selectOption('link')
    await last().locator('input[name="title"]').fill('사내 포털')
    await last().locator('input[name="link"]').fill('https://intra.example.com')
    await last().locator('select[name="size"]').selectOption('6x2')
    await page.screenshot({ path: screenshotPath('home-widgets-settings') })
    await last().locator('[data-widget-done]').click()
    await expect(last()).toHaveAttribute('data-size', '6x2')
    await expect(last().locator('[data-shortcut-open]')).toContainText('사내 포털')

    // a clock, then take the Continue card off the board
    await page.locator('[data-customize="add"]').click()
    await page.locator('[data-widget-gallery] [data-add-type="clock"]').click()
    await expect(last()).toHaveAttribute('data-card-type', 'clock')
    await expect(last().locator('[data-clock-time]')).toHaveText(/\d{1,2}:\d{2}/)
    await page.locator('[data-card-type="recent"] [data-card-remove]').click()
    await expect(page.locator('[data-card-type="recent"]')).toHaveCount(0)

    // hide one app from the New card in the list view
    await page.locator('[data-customize="list"]').click()
    const panel = page.locator('[data-home-custom="panel"]')
    await panel.locator('[data-custom-card="html"] input[type="checkbox"]').uncheck()
    await page.screenshot({ path: screenshotPath('home-widgets-panel') })
    await panel.locator('[data-home-custom="close"]').click()
    await page.locator('[data-customize="done"]').click()
    await expect(page.locator('.quick-card[data-new="html"]')).toHaveCount(0)
    await page.screenshot({ path: screenshotPath('home-widgets'), fullPage: true })
  } finally {
    await closeAndSaveVideo(first, 'home-widgets')
  }

  const second = await launchShell({ userDataDir, videoDir: 'home-widgets-restart', lang: 'ko' })
  try {
    const page2 = second.page
    const memos = page2.locator('[data-card-type="memo"]')
    await expect(memos).toHaveCount(2)
    await expect(memos.first().locator('textarea')).toHaveValue('오후 3시 결재 올리기')
    await expect(page2.locator('[data-card-type="recent"]')).toHaveCount(0)
    await expect(page2.locator('[data-card-type="shortcut"]')).toHaveAttribute('data-size', '6x2')
    await expect(page2.locator('[data-card-type="clock"]')).toBeVisible()
    await expect(page2.locator('.quick-card[data-new="html"]')).toHaveCount(0)
    await page2.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page2.screenshot({ path: screenshotPath('home-widgets-dark'), fullPage: true })

    // pinning from All apps puts the app back on the New card, at the end
    // (replaces the 0.18 data-pin / data-fav-app check)
    await page2.locator('[data-all-apps-open]').first().click()
    await page2.locator('[data-all-apps] [data-app-pin="html"]').click()
    await page2.keyboard.press('Escape')
    await expect(page2.locator('[data-all-apps]')).toHaveCount(0)
    await expect(page2.locator('.quick-card[data-new="html"]')).toHaveCount(1)
    await expect(page2.locator('.quick-card').last()).toHaveAttribute('data-new', 'html')

    // Default layout asks first; nothing changes until the person confirms,
    // then the default cards come back in front and added cards stay (R17)
    await page2.locator('[data-home-custom="open"]').click()
    await page2.locator('[data-customize="reset"]').click()
    await expect(page2.locator('[data-reset-confirm]')).toBeVisible()
    await expect(page2.locator('[data-home-board] [data-card]')).toHaveCount(7)
    await page2.locator('[data-reset-confirm] [data-reset="yes"]').click()
    await expect
      .poll(() => cardTypes(page2))
      .toEqual(['start', 'apps', 'recent', 'memo', 'favorites', 'memo', 'shortcut', 'clock'])
    await page2.locator('[data-customize="done"]').click()
    await expect(page2.locator('[data-card="memo"] textarea')).toHaveValue('오후 3시 결재 올리기')
  } finally {
    await closeAndSaveVideo(second, 'home-widgets-restart')
  }
})
