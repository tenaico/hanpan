import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan 0.17 item 10, the design board: Ctrl+S asks where only for a design
 * never saved and then writes over the same file (Save as still asks), and the
 * font list offers the fonts installed on the PC, which a saved picture draws.
 */

test('the design board saves over its file with Ctrl+S and uses fonts installed on the PC', async () => {
  test.skip(process.platform !== 'win32', 'the installed fonts named here are the Windows ones')
  test.setTimeout(240_000)
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-design-save-'))
  const launched = await launchShell({ onboardingSeen: true, videoDir: 'hanpan-design-save-fonts' })
  const { app, page } = launched
  // every save dialog answers with the next path; the count says how often one was shown
  const answerSaveWith = (path: string) =>
    app.evaluate(({ dialog, shell }, p) => {
      const g = globalThis as { saveDialogs?: number }
      g.saveDialogs ??= 0
      dialog.showSaveDialog = (async () => {
        g.saveDialogs! += 1
        return { canceled: false, filePath: p }
      }) as typeof dialog.showSaveDialog
      shell.openPath = (async () => '') as typeof shell.openPath
    }, path)
  const dialogs = () =>
    app.evaluate(() => (globalThis as { saveDialogs?: number }).saveDialogs ?? 0)
  try {
    await page.locator('[data-hanpan="design"]').click()
    const board = await waitForPageWithUrl(app, 'design.html')
    const pageEl = board.locator('.dz-stage .dz-page')
    await expect(pageEl).toBeVisible({ timeout: 30_000 })
    await board.locator('[data-tab="templates"]').click()
    await board.locator('.dz-templates button').first().click()
    await board.locator('[data-tab="text"]').click()
    await board.locator('[data-add="title"]').click()
    const text = board.locator('[data-props="text"] textarea')
    await text.fill('first words')

    const first = join(dir, 'poster.hpdesign')
    await answerSaveWith(first)
    await board.keyboard.press('Control+s')
    await expect
      .poll(() => existsSync(first) && readFileSync(first, 'utf8'))
      .toContain('first words')
    expect(await dialogs()).toBe(1)

    // the second Ctrl+S, from inside the text being typed: no dialog, the same file
    await text.fill('second words')
    await answerSaveWith(join(dir, 'must-not-be-used.hpdesign'))
    await text.press('Control+s')
    await expect.poll(() => readFileSync(first, 'utf8')).toContain('second words')
    expect(await dialogs()).toBe(1)
    expect(existsSync(join(dir, 'must-not-be-used.hpdesign'))).toBe(false)

    // Save as asks again, and the new file is where later saves go
    const copy = join(dir, 'copy.hpdesign')
    await answerSaveWith(copy)
    await board.locator('.dz-top button', { hasText: /^Save as$/ }).click()
    await expect.poll(() => existsSync(copy)).toBe(true)
    expect(await dialogs()).toBe(2)

    // the fonts on this PC: more than the fixed seven, and each one reaches a saved picture
    const select = board.locator('[data-hanpan="font-select"]')
    await select.click()
    await board.keyboard.press('Escape')
    const pcGroup = select.locator('optgroup').nth(2)
    await expect.poll(() => pcGroup.locator('option').count()).toBeGreaterThan(7)
    const pictures: string[] = []
    for (const family of ['Consolas', 'Impact']) {
      await expect(pcGroup.locator(`option[value="${family}"]`)).toHaveCount(1)
      await select.selectOption(family)
      await expect(pageEl.locator('.dz-text').first()).toHaveCSS('font-family', new RegExp(family))
      const target = join(dir, `${family}.png`)
      await answerSaveWith(target)
      await board.locator('[data-action="design-png"]').click()
      await expect.poll(() => existsSync(target) && statSync(target).size > 1000).toBe(true)
      pictures.push(createHash('sha256').update(readFileSync(target)).digest('hex'))
    }
    await board.screenshot({ path: screenshotPath('hanpan-design-pc-fonts') })
    // a face that fell back would draw like the other one
    expect(new Set(pictures).size).toBe(2)
  } finally {
    await closeAndSaveVideo(launched)
  }
})
