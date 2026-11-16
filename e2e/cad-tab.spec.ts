import { readFileSync, rmSync } from 'node:fs'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { makeMesh, openCadFile, writeStl } from '@genoffice/cad-engine'
import {
  closeAndSaveVideo,
  launchShell,
  openFromAllApps,
  screenshotPath,
  waitForPageWithUrl,
} from './helpers'

/**
 * The AI Drawing editor as one more document kind of the shell (stage 2: the
 * tab skeleton). Every file used here is built in this file with the engine.
 */

interface TabSummaryOnWindow {
  id: string
  kind: string
  title: string
  active: boolean
  filePath?: string
}

interface ShellApisOnWindow {
  aiOfficeTabs: {
    list(): Promise<TabSummaryOnWindow[]>
    close(id: string): Promise<void>
  }
  aiOffice: { openPath(path: string): Promise<void> }
}

const cadTabs = async (page: Page): Promise<TabSummaryOnWindow[]> =>
  (await page.evaluate(() => (window as unknown as ShellApisOnWindow).aiOfficeTabs.list())).filter(
    (tab) => tab.kind === 'cad',
  )

const closeTab = (page: Page, id: string): Promise<void> =>
  page.evaluate((tabId) => (window as unknown as ShellApisOnWindow).aiOfficeTabs.close(tabId), id)

const openPath = (page: Page, path: string): Promise<void> =>
  page.evaluate((p) => (window as unknown as ShellApisOnWindow).aiOffice.openPath(p), path)

/** 0 = Save, 1 = Don't Save, 2 = Cancel; counts the questions. */
async function answerClosePrompts(app: ElectronApplication, response: number): Promise<void> {
  await app.evaluate(({ dialog }, answer) => {
    const state = globalThis as unknown as { __prompts?: number }
    state.__prompts ??= 0
    dialog.showMessageBox = (async () => {
      state.__prompts! += 1
      return { response: answer, checkboxChecked: false }
    }) as typeof dialog.showMessageBox
  }, response)
}

const closePrompts = (app: ElectronApplication): Promise<number> =>
  app.evaluate(() => (globalThis as unknown as { __prompts?: number }).__prompts ?? 0)

/** The next save dialogs answer with `target`. */
async function answerSaveDialogs(app: ElectronApplication, target: string): Promise<void> {
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = (async () => ({
      canceled: false,
      filePath: path,
    })) as typeof dialog.showSaveDialog
  }, target)
}

const menuLabels = (app: ElectronApplication, top: string): Promise<string[]> =>
  app.evaluate(({ Menu }, label) => {
    const menu = Menu.getApplicationMenu()?.items.find((item) => item.label === label)
    return (menu?.submenu?.items ?? []).map((item) =>
      item.type === 'separator' ? '-' : item.label,
    )
  }, top)

const clickMenuItem = (app: ElectronApplication, top: string, label: string): Promise<boolean> =>
  app.evaluate(
    ({ Menu }, [topLabel, itemLabel]) => {
      const menu = Menu.getApplicationMenu()?.items.find((item) => item.label === topLabel)
      const item = menu?.submenu?.items.find((candidate) => candidate.label === itemLabel)
      if (!item) return false
      item.click()
      return true
    },
    [top, label] as const,
  )

/** A 20 mm cube as STL bytes. */
function cubeStl(): Uint8Array {
  const p = [0, 0, 0, 20, 0, 0, 20, 20, 0, 0, 20, 0, 0, 0, 20, 20, 0, 20, 20, 20, 20, 0, 20, 20]
  const f = [
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0,
    4, 3, 4, 7,
  ]
  return writeStl(makeMesh(p, f))
}

test.describe('AI Drawing tab (stage 2)', () => {
  test('opens from All apps, saves a .ttukcad that reopens, and asks before closing unsaved work', async () => {
    test.setTimeout(240_000)
    const dir = await mkdtemp(join(tmpdir(), 'genoffice-cad-'))
    const saved = join(dir, 'first.ttukcad')
    const launched = await launchShell({ onboardingSeen: true, videoDir: 'cad-new' })
    const { app, page } = launched
    try {
      await openFromAllApps(page, 'ttukcad')
      const tab = page.locator('.tab-bar .tab-item:not(.tab-home)')
      await expect(tab).toHaveCount(1)
      await expect(tab.locator('.tab-title')).toHaveText('Untitled Drawing')
      const cad = await waitForPageWithUrl(app, '://cad/')
      await expect(cad.locator('[data-cad-ready]')).toBeVisible({ timeout: 30_000 })
      await expect(cad.locator('.cad-viewport canvas, .cad-nowebgl')).toHaveCount(1)
      await cad.screenshot({ path: screenshotPath('cad-new-editor') })

      expect(await menuLabels(app, 'File')).toEqual(
        expect.arrayContaining(['New', 'Open…', 'Back to Home', 'Save', 'Save As…', 'Close']),
      )
      expect(await menuLabels(app, 'File')).not.toContain('Print…')

      // the first save of an untitled drawing asks where, and writes a file that reopens
      await answerSaveDialogs(app, saved)
      expect(await clickMenuItem(app, 'File', 'Save')).toBe(true)
      await expect
        .poll(async () => (await cadTabs(page))[0]?.filePath, { timeout: 30_000 })
        .toBe(saved)
      await expect(tab.locator('.tab-title')).toHaveText('first.ttukcad')
      expect(openCadFile(new Uint8Array(await readFile(saved))).status).toBe('ok')

      // unsaved changes: Cancel keeps the tab, Don't Save closes it
      await cad.evaluate(() =>
        (window as unknown as { cadApi: { setDirty(d: boolean): void } }).cadApi.setDirty(true),
      )
      await answerClosePrompts(app, 2)
      const [first] = await cadTabs(page)
      await closeTab(page, first!.id)
      await expect.poll(() => closePrompts(app)).toBe(1)
      await expect(tab).toHaveCount(1)
      await answerClosePrompts(app, 1)
      await closeTab(page, first!.id)
      await expect(tab).toHaveCount(0)

      // the saved file opens again in a cad tab with its path
      await openPath(page, saved)
      await expect.poll(async () => (await cadTabs(page)).map((t) => t.filePath)).toEqual([saved])
      // opening the same file again goes to the tab already open
      await openPath(page, saved)
      await expect.poll(async () => (await cadTabs(page)).length).toBe(1)
    } finally {
      await closeAndSaveVideo(launched, 'cad-new')
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('an .stl opens as an untitled drawing named after the file and is never written', async () => {
    test.setTimeout(240_000)
    const dir = await mkdtemp(join(tmpdir(), 'genoffice-cad-stl-'))
    const stl = join(dir, 'part.stl')
    const stlBytes = cubeStl()
    await writeFile(stl, stlBytes)
    const target = join(dir, 'part-copy.ttukcad')
    const launched = await launchShell({ onboardingSeen: true, videoDir: 'cad-stl' })
    const { app, page } = launched
    try {
      await openPath(page, stl)
      await expect.poll(async () => (await cadTabs(page)).length, { timeout: 30_000 }).toBe(1)
      const [tab] = await cadTabs(page)
      expect(tab!.title).toBe('part')
      expect(tab!.filePath).toBeUndefined()
      const cad = await waitForPageWithUrl(app, '://cad/')
      await expect(cad.locator('[data-cad-ready]')).toBeVisible({ timeout: 30_000 })

      // Save asks for a new .ttukcad; the STL stays as it was
      await answerSaveDialogs(app, target)
      expect(await clickMenuItem(app, 'File', 'Save')).toBe(true)
      await expect
        .poll(async () => (await cadTabs(page))[0]?.filePath, { timeout: 30_000 })
        .toBe(target)
      const reopened = openCadFile(new Uint8Array(await readFile(target)))
      expect(reopened.status).toBe('ok')
      if (reopened.status === 'ok') expect(reopened.document.parts).toHaveLength(1)
      expect(Buffer.compare(readFileSync(stl), Buffer.from(stlBytes))).toBe(0)
    } finally {
      await closeAndSaveVideo(launched, 'cad-stl')
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
