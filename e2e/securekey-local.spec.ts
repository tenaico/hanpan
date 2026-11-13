import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath } from './helpers'

/**
 * The first run asks for the terms before any window (decision 0099). The key
 * step is off in e2e builds (HANPAN_REQUIRE_KEY), so the home opens right
 * after the consent; the key itself is covered by unit tests and the
 * hands-on USB test.
 */

test('first run asks for consent, then the home opens', async () => {
  test.setTimeout(120_000)
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'securekey-local',
    lang: 'ko',
    consent: false,
  })
  const { app, page, userDataDir } = launched
  try {
    expect(page.url()).toContain('securekey.html')
    const agree = page.locator('#terms-agree')
    const submit = page.locator('#submit')
    await expect(page.locator('#terms-list li')).toHaveCount(4)
    await expect(page.locator('#terms-list')).toContainText('TEN AI의 고의로 생긴 손해는 예외')
    await expect(page.locator('#terms-full')).toHaveText('전체 사용권 보기')
    await expect(submit).toBeDisabled()
    await page.screenshot({ path: screenshotPath('securekey-local-terms') })
    expect(existsSync(join(userDataDir, 'consent.json'))).toBe(false)

    await agree.check()
    await expect(submit).toBeEnabled()
    await submit.click()

    let home: Page | undefined
    await expect
      .poll(
        async () => {
          for (const w of app.windows()) {
            if (w.isClosed() || w === page) continue
            if (await w.locator('[data-hanpan="start-board"]').count()) home = w
          }
          return home !== undefined
        },
        { timeout: 60_000 },
      )
      .toBe(true)

    const consent = JSON.parse(readFileSync(join(userDataDir, 'consent.json'), 'utf8')) as {
      v: number
      termsVersion: string
      acceptedAt: string
    }
    expect(consent.v).toBe(1)
    expect(consent.termsVersion).toBe('2026-11-20')
    expect(Number.isNaN(Date.parse(consent.acceptedAt))).toBe(false)
  } finally {
    await closeAndSaveVideo(launched)
  }
})
