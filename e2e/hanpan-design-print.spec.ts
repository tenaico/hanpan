import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * 디자인 보드 인쇄(0.17): Ctrl+P와 [인쇄] 단추가 미리보기를 열고, [인쇄]가 시스템
 * 인쇄로 넘기는 페이지는 PDF 내보내기와 같은 용지·같은 쪽 수다. 프린터로는 보내지
 * 않는다: 인쇄 창의 print()를 printToPDF로 바꿔 그 PDF를 비교한다.
 */
test('the design board prints what it exports, through a preview', async () => {
  test.setTimeout(240_000)
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-design-print-'))
  const exportPath = join(dir, 'poster.pdf')
  const printedPath = join(dir, 'printed.pdf')
  const launched = await launchShell({ onboardingSeen: true, videoDir: 'hanpan-design-print' })
  const { app, page } = launched
  try {
    await app.evaluate(({ app: electronApp, dialog, shell }, path) => {
      dialog.showSaveDialog = (async () => ({
        canceled: false,
        filePath: path,
      })) as typeof dialog.showSaveDialog
      shell.openPath = (async () => '') as typeof shell.openPath
      // every print window: the page as a PDF instead of the system dialog
      electronApp.on('browser-window-created', (_event, win) => {
        win.webContents.print = ((
          options: Electron.WebContentsPrintOptions,
          callback: (ok: boolean, reason: string) => void,
        ) => {
          void win.webContents
            .printToPDF({
              printBackground: true,
              preferCSSPageSize: true,
              landscape: options.landscape,
              margins: { marginType: 'none' },
            })
            .then((pdf) => {
              ;(globalThis as { __printed?: unknown }).__printed = {
                pdf: pdf.toString('base64'),
                options,
              }
              callback(true, '')
            })
        }) as typeof win.webContents.print
      })
    }, exportPath)

    await page.locator('[data-hanpan="design"]').click()
    const board = await waitForPageWithUrl(app, 'design.html')
    await expect(board.locator('.dz-stage .dz-page')).toBeVisible({ timeout: 30_000 })
    await board.locator('[data-tab="templates"]').click()
    await board.locator('[data-template="event-poster"]').click()

    // the PDF export, for comparison
    await board.locator('[data-action="design-pdf"]').click()
    await expect.poll(() => existsSync(exportPath)).toBe(true)

    // Ctrl+P opens the preview; Esc closes it
    await board.locator('.dz-stage').click({ position: { x: 5, y: 5 } })
    await board.keyboard.press('Control+P')
    const preview = board.locator('[data-hanpan="image-print-preview"]')
    await expect(preview).toBeVisible({ timeout: 30_000 })
    await board.keyboard.press('Escape')
    await expect(board.locator('[data-hanpan="image-print"]')).toHaveCount(0)

    // the button opens it too, and Print hands the pages on
    await board.locator('[data-action="design-print"]').click()
    await expect(preview).toBeVisible({ timeout: 30_000 })
    await expect(board.locator('[data-hanpan="design-print-paper"]')).toContainText('210×297mm')
    await board.screenshot({ path: screenshotPath('hanpan-design-print-preview') })
    await board.locator('[data-action="image-print-go"]').click()
    await expect(board.locator('[data-hanpan="image-print"]')).toHaveCount(0, { timeout: 30_000 })

    const printed = await app.evaluate(
      () => (globalThis as { __printed?: { pdf: string; options: unknown } }).__printed,
    )
    expect(printed).toBeTruthy()
    expect(printed!.options).toMatchObject({ pageSize: 'A4', landscape: false })
    await writeFile(printedPath, Buffer.from(printed!.pdf, 'base64'))

    const exported = await PDFDocument.load(await readFile(exportPath))
    const sent = await PDFDocument.load(await readFile(printedPath))
    expect(sent.getPageCount()).toBe(exported.getPageCount())
    for (const [i, exportedPage] of exported.getPages().entries()) {
      const a = exportedPage.getSize()
      const b = sent.getPage(i).getSize()
      expect(Math.abs(a.width - b.width)).toBeLessThan(1)
      expect(Math.abs(a.height - b.height)).toBeLessThan(1)
    }
    console.log(`[design print] exported ${exportPath}, printed ${printedPath}`)
  } finally {
    await closeAndSaveVideo(launched, 'hanpan-design-print')
  }
})
