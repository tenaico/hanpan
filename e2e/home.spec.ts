import { test, expect } from '@playwright/test'
import { launchShell, closeAndSaveVideo, screenshotPath, waitForPageWithUrl } from './helpers'

test.describe('home screen', () => {
  test('shows hero, quick-create cards and tab bar', async () => {
    const launched = await launchShell({ onboardingSeen: true, videoDir: 'home-basics' })
    const { page } = launched
    try {
      // Hanpan: the start board, then the mind map and the documents it feeds, then the rest
      await expect(page.locator('[data-hanpan="start-board"]')).toBeVisible()
      const order = await page
        .locator('.quick-card')
        .evaluateAll((cards) => cards.map((c) => c.getAttribute('data-new')))
      expect(order).toEqual([
        'xmind',
        'hwp',
        'pptx',
        'templates',
        'docx',
        'xlsx',
        'design',
        'md',
        'html',
        'pdf',
        'photo',
        'illust',
        'open',
      ])
      await expect(page.locator('.quick-card[data-new="xmind"]')).toContainText('Mind Map')
      await expect(page.locator('.quick-card[data-new="docx"]')).toContainText('AI Docs')
      // the agent is not a document to make: it sits in the sidebar, under Ask AI,
      // named "AI folder work" like its window (c887855d)
      const nav = page.locator('.sidebar-nav .nav-label')
      await expect(nav).toHaveText(['Recent', 'Starred', 'Ask AI', 'AI folder work'])
      await expect(page.locator('.sidebar-nav .nav-item').nth(3)).toHaveAttribute(
        'title',
        'Work in a folder with Claude Code or Codex',
      )
      await expect(page.locator('.tab-bar .tab-item.tab-home')).toBeVisible()
      await page.screenshot({ path: screenshotPath('home-overview') })
      // clicking it opens the agent window
      await page.locator('.sidebar-nav .nav-item').nth(3).click()
      const agent = await waitForPageWithUrl(launched.app, 'agent.html', 30_000)
      await expect(agent.locator('.agent')).toBeVisible()
    } finally {
      await closeAndSaveVideo(launched, 'home-basics')
    }
  })

  test('renders localized UI when GENOFFICE_LANG=zh-CN', async () => {
    const launched = await launchShell({
      onboardingSeen: true,
      lang: 'zh-CN',
      videoDir: 'home-zh-cn',
    })
    const { page } = launched
    try {
      await expect(page.locator('.nav-item .nav-label').first()).toHaveText('最近')
      await page.screenshot({ path: screenshotPath('home-zh-cn') })
    } finally {
      await closeAndSaveVideo(launched, 'home-zh-cn')
    }
  })
})
