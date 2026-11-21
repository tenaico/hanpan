import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type ElectronApplication, type Locator, type Page } from '@playwright/test'
import { PNG } from 'pngjs'
import {
  SHAPE_DIMS,
  makeMesh,
  meshVolume,
  openCadFile,
  readDxf,
  readStl,
  writeStl,
  type CadDocument,
  type ShapeKind,
} from '@genoffice/cad-engine'
import {
  closeAndSaveVideo,
  launchShell,
  openFromAllApps,
  screenshotPath,
  stubAiReady,
  waitForPageWithUrl,
  type LaunchedApp,
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
    const launched = await launchCad({ onboardingSeen: true, videoDir: 'cad-new' })
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
    const launched = await launchCad({ onboardingSeen: true, videoDir: 'cad-stl' })
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

// ---- stage 3: editing ----

const ALL_SHAPES = Object.keys(SHAPE_DIMS) as ShapeKind[]

/** Clicks File › Export › <format> in the application menu. */
const clickExportItem = (app: ElectronApplication, label: string): Promise<boolean> =>
  app.evaluate(({ Menu }, itemLabel) => {
    const file = Menu.getApplicationMenu()?.items.find((item) => item.label === 'File')
    const exp = file?.submenu?.items.find((item) => item.label === 'Export')
    const item = exp?.submenu?.items.find((candidate) => candidate.label === itemLabel)
    if (!item) return false
    item.click()
    return true
  }, label)

/**
 * The Linux CI runner has no GPU and the shared launcher passes --disable-gpu, so Chromium starts
 * without WebGL and the editor shows its no-3D screen. The software renderer (SwiftShader) gives
 * the 3D view WebGL there; Windows and macOS already fall back on their own. A test that passes
 * its own args (the no-WebGL test) replaces these.
 */
const WEBGL_ARGS = process.platform === 'linux' ? ['--enable-unsafe-swiftshader'] : []

const launchCad = (options: Parameters<typeof launchShell>[0]): Promise<LaunchedApp> =>
  launchShell({ args: WEBGL_ARGS, ...options })

/** Opens a new drawing from All apps and waits for its editor to be ready. */
async function newDrawing(launched: LaunchedApp): Promise<Page> {
  await openFromAllApps(launched.page, 'ttukcad')
  const cad = await waitForPageWithUrl(launched.app, '://cad/')
  await expect(cad.locator('[data-cad-ready]')).toBeVisible({ timeout: 30_000 })
  await expect(cad.locator('.cad-viewport canvas')).toHaveCount(1)
  return cad
}

/** Shows a ribbon tab of the drawing (file, home, view, help). */
const ribbonTab = (cad: Page, name: string): Promise<void> =>
  cad.locator(`[data-ribbon-tab="${name}"]`).click()

/** Places one shape from the Home tab (the four common ones) or the gallery. */
async function placeShape(cad: Page, kind: ShapeKind): Promise<void> {
  await ribbonTab(cad, 'home')
  const direct = cad.locator(`[data-ribbon-pane="home"] [data-action="shape-${kind}"]`)
  if (await direct.count()) {
    await direct.click()
    return
  }
  await cad.locator('[data-action="more-shapes"]').click()
  await cad.locator(`.cad-gallery-item[data-shape="${kind}"]`).click()
}

/** Types the words of a text shape in the text prompt and places it. */
async function placeText(cad: Page, words: string): Promise<void> {
  await cad.locator('[data-text-input]').fill(words)
  await cad.locator('[data-text-place]').click()
}

/** Saves the drawing (File › Save, the dialog answered with `target`) and reads it back. */
async function savedDocument(
  app: ElectronApplication,
  page: Page,
  target: string,
): Promise<CadDocument> {
  await answerSaveDialogs(app, target)
  expect(await clickMenuItem(app, 'File', 'Save')).toBe(true)
  await expect
    .poll(async () => (await cadTabs(page)).find((t) => t.active)?.filePath, { timeout: 30_000 })
    .toBe(target)
  const opened = openCadFile(new Uint8Array(await readFile(target)))
  if (opened.status !== 'ok') throw new Error(`the saved drawing did not open: ${opened.status}`)
  return opened.document
}

/** The property panel's position of the one selected part, as numbers. */
const panelPosition = (cad: Page): Promise<number[]> =>
  Promise.all(
    ['x', 'y', 'z'].map(async (axis) =>
      Number(await cad.locator(`[data-prop="position.${axis}"]`).inputValue()),
    ),
  )

test.describe('AI Drawing tab (stage 3: editing)', () => {
  test('places all 15 shapes from the gallery', async () => {
    test.setTimeout(240_000)
    const dir = await mkdtemp(join(tmpdir(), 'genoffice-cad-shapes-'))
    const launched = await launchCad({ onboardingSeen: true, videoDir: 'cad-shapes' })
    const { app, page } = launched
    try {
      const cad = await newDrawing(launched)
      await ribbonTab(cad, 'home')
      await cad.locator('[data-action="more-shapes"]').click()
      const items = cad.locator('.cad-gallery-item')
      await expect(items).toHaveCount(15)
      expect(
        await items.evaluateAll((els) => els.map((el) => el.getAttribute('data-shape'))),
      ).toEqual(ALL_SHAPES)
      await cad.keyboard.press('Escape')

      const info = cad.locator('[data-cad-status-info]')
      for (const kind of ALL_SHAPES) {
        await cad.locator('[data-action="more-shapes"]').click()
        const item = cad.locator(`.cad-gallery-item[data-shape="${kind}"]`)
        const label = (await item.innerText()).trim()
        await item.click()
        if (kind === 'text') await placeText(cad, 'AB')
        // the new part is the one selected: its name leads the status line
        await expect(info).toContainText(kind === 'text' ? 'AB' : label, { timeout: 15_000 })
        await expect(cad.locator('[data-cad-message]')).toHaveText('')
      }
      await cad.screenshot({ path: screenshotPath('cad-all-shapes') })

      const doc = await savedDocument(app, page, join(dir, 'shapes.ttukcad'))
      expect(doc.parts).toHaveLength(15)
      expect(
        doc.parts.map((part) => (part.type === 'shape' ? part.shape : part.type)).sort(),
      ).toEqual([...ALL_SHAPES].sort())
    } finally {
      await closeAndSaveVideo(launched, 'cad-shapes')
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('a box with a cylinder hole exports an STL that reopens in a new cad tab with a smaller volume', async () => {
    test.setTimeout(240_000)
    const dir = realpathSync(await mkdtemp(join(tmpdir(), 'genoffice-cad-hole-')))
    const stl = join(dir, 'holed.stl')
    const launched = await launchCad({ onboardingSeen: true, videoDir: 'cad-hole' })
    const { app, page } = launched
    try {
      const cad = await newDrawing(launched)
      await placeShape(cad, 'box')
      await placeShape(cad, 'cylinder')
      // a thinner cylinder, so the hole has walls all round
      const diameter = cad.locator('[data-prop="dims.diameter"]')
      await diameter.fill('10')
      await diameter.press('Enter')
      await expect(diameter).toHaveValue('10')
      // H turns the selected cylinder into a hole (the key goes to the page, not the box)
      await cad.locator('.cad-viewport canvas').hover()
      await diameter.blur()
      await cad.keyboard.press('h')
      await expect(cad.locator('[data-prop="role.hole"]')).toHaveClass(/active/)
      await cad.keyboard.press('ControlOrMeta+a')
      await cad.keyboard.press('ControlOrMeta+g')
      await expect(cad.locator('[data-cad-status-info]')).toContainText('20 × 20 × 20')
      await cad.screenshot({ path: screenshotPath('cad-box-with-hole') })

      await answerSaveDialogs(app, stl)
      expect(await clickExportItem(app, 'STL (3D Printing)…')).toBe(true)
      await expect
        .poll(
          () =>
            readFile(stl).then(
              () => true,
              () => false,
            ),
          { timeout: 30_000 },
        )
        .toBe(true)
      const read = readStl(new Uint8Array(await readFile(stl)))
      expect(read.status).toBe('ok')
      if (read.status !== 'ok') return
      expect(read.closed).toBe(true)
      const volume = meshVolume(read.mesh)
      const solidBox = 20 * 20 * 20
      const hole = Math.PI * 5 * 5 * 20
      expect(volume).toBeLessThan(solidBox - hole * 0.9)
      expect(volume).toBeGreaterThan(solidBox - hole * 1.1)

      // a picture of several shapes beside the holed box, nothing selected, the view framed
      for (const [kind, x] of [
        ['sphere', -30],
        ['cone', 30],
      ] as const) {
        await placeShape(cad, kind)
        const field = cad.locator('[data-prop="position.x"]')
        await field.fill(String(x))
        await field.press('Enter')
        await expect(field).toHaveValue(String(x))
      }
      const canvas = cad.locator('.cad-viewport canvas')
      await canvas.click({ position: { x: 8, y: 8 } })
      await expect(cad.locator('[data-cad-properties] [data-prop]')).toHaveCount(0)
      await ribbonTab(cad, 'view')
      await cad.locator('[data-action="view-fit"]').click()
      await cad.screenshot({ path: screenshotPath('cad-shapes-and-hole') })

      // the STL opens in a second cad tab, named after the file
      await openPath(page, stl)
      await expect.poll(async () => (await cadTabs(page)).length, { timeout: 30_000 }).toBe(2)
      expect((await cadTabs(page)).map((tab) => tab.title)).toContain('holed')
    } finally {
      await closeAndSaveVideo(launched, 'cad-hole')
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('handles move a part and one undo puts it back', async () => {
    test.setTimeout(240_000)
    const launched = await launchCad({ onboardingSeen: true, videoDir: 'cad-handles' })
    try {
      const cad = await newDrawing(launched)
      await placeShape(cad, 'box')
      const before = await panelPosition(cad)
      // looking straight down, the box (and the move handle on it) sits in the middle
      await ribbonTab(cad, 'view')
      await cad.locator('[data-action="view-top"]').click()
      await cad.locator('[data-action="handle-move"]').click()
      const canvas = cad.locator('.cad-viewport canvas')
      const box = (await canvas.boundingBox())!
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      // the red X arrow points right from the middle; grab it a little way out
      const grab = cx + box.height * 0.07
      await cad.mouse.move(grab, cy)
      await cad.mouse.down()
      for (let step = 1; step <= 10; step += 1) {
        await cad.mouse.move(grab + step * 12, cy)
      }
      await cad.mouse.up()
      await cad.screenshot({ path: screenshotPath('cad-handle-moved') })
      const moved = await panelPosition(cad)
      expect(moved[0]).toBeGreaterThan(before[0]! + 1)
      expect(moved[1]).toBeCloseTo(before[1]!, 3)
      expect(moved[2]).toBeCloseTo(before[2]!, 3)

      await cad.keyboard.press('ControlOrMeta+z')
      await expect.poll(() => panelPosition(cad)).toEqual(before)
    } finally {
      await closeAndSaveVideo(launched, 'cad-handles')
    }
  })

  test('the text button and the sketch tool each add a part', async () => {
    test.setTimeout(240_000)
    const dir = await mkdtemp(join(tmpdir(), 'genoffice-cad-text-'))
    const launched = await launchCad({ onboardingSeen: true, videoDir: 'cad-text-sketch' })
    const { app, page } = launched
    try {
      const cad = await newDrawing(launched)
      await ribbonTab(cad, 'home')
      await cad.locator('[data-action="text"]').click()
      await placeText(cad, '한판')
      await expect(cad.locator('[data-cad-status-info]')).toContainText('한판', {
        timeout: 15_000,
      })
      await expect(cad.locator('[data-cad-message]')).toHaveText('')

      await cad.locator('[data-action="sketch"]').click()
      await expect(cad.locator('[data-cad-sketch]')).toBeVisible()
      const canvas = cad.locator('.cad-viewport canvas')
      const box = (await canvas.boundingBox())!
      // three points on the plate in front of the text
      for (const [fx, fy] of [
        [0.3, 0.75],
        [0.45, 0.75],
        [0.38, 0.62],
      ] as const) {
        await cad.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
      }
      await expect(cad.locator('.cad-sketch-count')).toHaveText('3')
      await cad.screenshot({ path: screenshotPath('cad-sketching') })
      await cad.locator('.cad-sketch-bar button').first().click()
      await expect(cad.locator('[data-cad-sketch]')).toHaveCount(0)
      // the new solid is selected, and its position is the middle of what was drawn
      const [sx, sy] = await panelPosition(cad)
      expect(Math.abs(sx!) + Math.abs(sy!)).toBeGreaterThan(1)
      await cad.screenshot({ path: screenshotPath('cad-sketch-made') })
      await canvas.click({ position: { x: 8, y: 8 } })
      await ribbonTab(cad, 'view')
      await cad.locator('[data-action="view-fit"]').click()
      await cad.screenshot({ path: screenshotPath('cad-text-and-sketch') })
      await cad.locator('[data-action="view-top"]').click()
      await cad.screenshot({ path: screenshotPath('cad-text-and-sketch-top') })

      const doc = await savedDocument(app, page, join(dir, 'text.ttukcad'))
      expect(doc.parts.map((part) => part.type)).toEqual(['shape', 'extrude'])
      expect(doc.parts[1]!.position).toEqual([sx, sy, 0])
      const text = doc.parts[0]!
      expect(text.type === 'shape' && text.text?.value).toBe('한판')
      expect(text.type === 'shape' && text.text!.outlines.length).toBeGreaterThan(0)
    } finally {
      await closeAndSaveVideo(launched, 'cad-text-sketch')
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('a crashed cad tab offers its recovery copy', async () => {
    test.setTimeout(480_000)
    const first = await launchCad({
      onboardingSeen: true,
      recordVideo: false,
      videoDir: 'cad-recovery-first',
    })
    const userDataDir = first.userDataDir
    let title: string | undefined
    try {
      const cad = await newDrawing(first)
      await placeShape(cad, 'box')
      await placeShape(cad, 'sphere')
      await expect(cad.locator('.cad-state')).toHaveAttribute('data-dirty', '')
      title = (await cadTabs(first.page))[0]!.title
      // copies are made about every 30 s
      await expect
        .poll(() => cadCopyMetas(userDataDir), { timeout: 150_000, intervals: [2_000] })
        .toEqual([expect.objectContaining({ kind: 'cad', filePath: null, state: 'undecided' })])
    } finally {
      await hardKill(first)
    }

    const second = await launchCad({
      userDataDir,
      recordVideo: false,
      videoDir: 'cad-recovery-second',
    })
    const dir = await mkdtemp(join(tmpdir(), 'genoffice-cad-recovered-'))
    try {
      const { app, page } = second
      const list = page.locator('.recovery-list')
      await expect(list).toBeVisible({ timeout: 30_000 })
      await expect(list.locator('.recovery-row-name')).toHaveText([title!])
      expect((await cadTabs(page)).map((tab) => tab.filePath ?? null)).toEqual([null])
      await list.locator('.recovery-confirm').click()
      await expect(list).toBeHidden()

      // the drawing comes back with both parts, unsaved and still untitled
      const cad = await waitForPageWithUrl(app, '://cad/', 60_000)
      await expect(cad.locator('[data-cad-ready]')).toBeVisible({ timeout: 30_000 })
      await expect(cad.locator('.cad-state')).toHaveAttribute('data-dirty', '')
      expect((await cadTabs(page))[0]?.filePath).toBeUndefined()
      const doc = await savedDocument(app, page, join(dir, 'recovered.ttukcad'))
      expect(doc.parts.map((part) => (part.type === 'shape' ? part.shape : part.type))).toEqual([
        'box',
        'sphere',
      ])
    } finally {
      await closeAndSaveVideo(second, 'cad-recovery-second')
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

interface CopyMeta {
  kind: string
  filePath: string | null
  title: string
  state: string
}

/** The cad recovery copies' metadata under a data folder (file and untitled copies). */
async function cadCopyMetas(userDataDir: string): Promise<CopyMeta[]> {
  const metas: CopyMeta[] = []
  const root = join(userDataDir, 'cad-autosave')
  for (const folder of [root, join(root, 'untitled')]) {
    const names = await readdir(folder).catch(() => [] as string[])
    for (const name of names.filter((n) => n.endsWith('.meta.json'))) {
      try {
        metas.push(JSON.parse(await readFile(join(folder, name), 'utf8')) as CopyMeta)
      } catch {
        // a meta file mid-write: the next poll reads it
      }
    }
  }
  return metas
}

/**
 * Ends the app like a power cut (as e2e/crash-recovery.spec.ts does): the main
 * process by the PID this test started, with its children. No quit path runs.
 */
async function hardKill(launched: LaunchedApp): Promise<void> {
  const child = launched.app.process()
  const pid = child.pid
  if (pid === undefined) throw new Error('the app has no process id')
  const closed = launched.app.waitForEvent('close', { timeout: 30_000 }).catch(() => undefined)
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'pipe' })
    } catch (error) {
      // a child that ended on its own makes /T report a failure; the main process must be gone
      if (child.exitCode === null && child.signalCode === null) throw error
    }
  } else {
    process.kill(pid, 'SIGKILL')
  }
  await closed
  await expect.poll(() => child.exitCode !== null || child.signalCode !== null).toBe(true)
}

// ---- stage 4: measuring, the dimension sheet and sending it to a document ----

/** Types one value into a property panel field and waits for the part to take it. */
async function setProp(cad: Page, prop: string, value: string): Promise<void> {
  const field = cad.locator(`[data-prop="${prop}"]`)
  await field.fill(value)
  await field.press('Enter')
  await expect(field).toHaveValue(value)
}

/**
 * Walks the pointer from the middle of the 3D view towards one of its corners
 * until the measuring tool shows its snap marker: the first corner it sticks
 * to coming from inside the top face. Gives where the pointer was then.
 */
async function hoverToSnap(cad: Page, dx: -1 | 1, dy: -1 | 1): Promise<{ x: number; y: number }> {
  const canvas = (await cad.locator('.cad-viewport canvas').boundingBox())!
  const cx = canvas.x + canvas.width / 2
  const cy = canvas.y + canvas.height / 2
  const marker = cad.locator('[data-cad-measure-snap]')
  const reach = Math.min(canvas.width, canvas.height) / 2 - 4
  for (let step = 4; step < reach; step += 3) {
    const at = { x: cx + dx * step, y: cy + dy * step }
    await cad.mouse.move(at.x, at.y)
    // the view looks once per frame; give it two
    await cad.waitForTimeout(40)
    if (await marker.isVisible()) return at
  }
  throw new Error('no corner to stick to on that diagonal')
}

interface SentTab {
  kind: string
  title: string
}

/** Chromium switches that leave a page without any WebGL context (stage 6). */
const NO_WEBGL_ARGS = ['--disable-gpu', '--disable-software-rasterizer']

const listTabs = (page: Page): Promise<SentTab[]> =>
  page.evaluate(() => (window as unknown as ShellApisOnWindow).aiOfficeTabs.list())

test.describe('AI Drawing tab: DWG and Edit lines (decision 0102)', () => {
  test('a .dwg opens, Edit lines deletes the clicked line, and the save keeps the circle', async () => {
    test.setTimeout(240_000)
    const dir = await mkdtemp(join(tmpdir(), 'genoffice-cad-dwg-'))
    const dwg = join(dir, 'Floor Plan.dwg')
    // acad-ts is ESM-only: a small node script writes the test DWG
    execFileSync(process.execPath, [join(__dirname, 'make-dwg.mjs'), dwg])
    const dwgBytes = readFileSync(dwg)
    const target = join(dir, 'plan-edited.ttukcad')
    const launched = await launchCad({ onboardingSeen: true, videoDir: 'cad-dwg' })
    const { app, page } = launched
    try {
      await openPath(page, dwg)
      await expect.poll(async () => (await cadTabs(page)).length, { timeout: 30_000 }).toBe(1)
      const cad = await waitForPageWithUrl(app, '://cad/')
      await expect(cad.locator('[data-cad-ready]')).toBeVisible({ timeout: 30_000 })
      await expect(cad.locator('.cad-guide')).toHaveCount(0)
      await ribbonTab(cad, 'view')
      await cad.locator('[data-action="view-top"]').click()
      await cad.locator('[data-action="view-fit"]').click()

      await ribbonTab(cad, 'dims')
      await cad.locator('[data-ribbon-pane="dims"] [data-action="edit-lines"]').click()
      await expect(cad.locator('[data-cad-lines]')).toBeVisible()
      const canvas = (await cad.locator('.cad-viewport canvas').boundingBox())!
      await cad.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2)
      await expect(cad.locator('[data-cad-lines-count]')).toContainText('1')
      await cad.screenshot({ path: screenshotPath('cad-dwg-edit-lines') })
      await cad.locator('[data-cad-lines-delete]').click()
      await expect(cad.locator('[data-cad-lines-count]')).toHaveCount(0)

      await answerSaveDialogs(app, target)
      expect(await clickMenuItem(app, 'File', 'Save')).toBe(true)
      await expect
        .poll(async () => (await cadTabs(page))[0]?.filePath, { timeout: 30_000 })
        .toBe(target)
      const reopened = openCadFile(new Uint8Array(await readFile(target)))
      expect(reopened.status).toBe('ok')
      if (reopened.status === 'ok') {
        const part = reopened.document.parts[0]
        expect(part?.type).toBe('drawing')
        if (part?.type === 'drawing') expect(part.entities.map((e) => e.kind)).toEqual(['circle'])
      }
      // 0.22.3: the edited drawing goes out as a new DXF and a new DWG
      const dxfOut = join(dir, 'plan-edited.dxf')
      await answerSaveDialogs(app, dxfOut)
      await ribbonTab(cad, 'file')
      await cad.locator('[data-action="export-dxf"]').click()
      await expect.poll(() => existsSync(dxfOut), { timeout: 30_000 }).toBe(true)
      const exported = readDxf(new Uint8Array(readFileSync(dxfOut)))
      expect(exported.status).toBe('ok')
      if (exported.status === 'ok') expect(exported.entities.map((e) => e.kind)).toEqual(['circle'])
      const dwgOut = join(dir, 'plan-edited.dwg')
      await answerSaveDialogs(app, dwgOut)
      await cad.locator('[data-action="export-dwg"]').click()
      await expect.poll(() => existsSync(dwgOut), { timeout: 30_000 }).toBe(true)
      expect(readFileSync(dwgOut).subarray(0, 6).toString('latin1')).toBe('AC1032')
      // the DWG itself is never written
      expect(Buffer.compare(readFileSync(dwg), Buffer.from(dwgBytes))).toBe(0)
    } finally {
      await closeAndSaveVideo(launched, 'cad-dwg')
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

test.describe('AI Drawing tab (stage 4: measure, sheet, send)', () => {
  test('measure reads 80 mm on an 80 mm box', async () => {
    test.setTimeout(240_000)
    const launched = await launchCad({ onboardingSeen: true, videoDir: 'cad-measure' })
    try {
      const cad = await newDrawing(launched)
      await placeShape(cad, 'box')
      for (const dim of ['width', 'depth', 'height']) await setProp(cad, `dims.${dim}`, '80')
      await expect(cad.locator('[data-cad-status-info]')).toContainText('80 × 80 × 80')
      await ribbonTab(cad, 'view')
      await cad.locator('[data-action="view-top"]').click()

      await ribbonTab(cad, 'dims')
      await cad.locator('[data-ribbon-pane="dims"] [data-action="measure"]').click()
      await expect(cad.locator('[data-cad-measure]')).toBeVisible()
      // two corners of the top face, one edge apart
      const left = await hoverToSnap(cad, -1, -1)
      const right = await hoverToSnap(cad, 1, -1)
      await cad.mouse.click(left.x, left.y)
      await cad.mouse.click(right.x, right.y)
      await expect(cad.locator('[data-cad-measure-reading]')).toHaveText('80 mm')
      await expect(cad.locator('[data-cad-measure-label]')).toHaveText('80 mm')
      await cad.screenshot({ path: screenshotPath('cad-measure-80') })

      // a change to the drawing takes the reading away; Esc twice leaves the tool
      await cad.keyboard.press('ControlOrMeta+z')
      await expect(cad.locator('[data-cad-measure-reading]')).toHaveText('')
      await cad.keyboard.press('Escape')
      await expect(cad.locator('[data-cad-measure]')).toHaveCount(0)
    } finally {
      await closeAndSaveVideo(launched, 'cad-measure')
    }
  })

  test('send to Hangul opens a new hwp tab', async () => {
    test.setTimeout(240_000)
    // the helpers start with the Korean document features on
    const launched = await launchCad({ onboardingSeen: true, videoDir: 'cad-send-hwp' })
    const { app, page } = launched
    try {
      const cad = await newDrawing(launched)
      await placeShape(cad, 'box')
      await setProp(cad, 'dims.width', '60')
      await placeShape(cad, 'cylinder')
      await setProp(cad, 'position.x', '70')
      await ribbonTab(cad, 'dims')
      const send = cad.locator('[data-ribbon-pane="dims"] [data-action="send"]')
      await expect(send).toHaveText('Send to Hangul')

      await cad.locator('[data-ribbon-pane="dims"] [data-action="sheet"]').click()
      const dialog = cad.locator('.cad-sheet-dialog')
      await expect(dialog.locator('[data-sheet-preview]')).toBeVisible()
      await dialog.locator('[data-sheet-field="name"]').fill('Pencil holder')
      await dialog.locator('[data-sheet-field="date"]').fill('2026-11-16')
      await expect(dialog.locator('[data-sheet-send]')).toHaveText('Send to Hangul')
      await cad.screenshot({ path: screenshotPath('cad-sheet-dialog') })

      await dialog.locator('[data-sheet-send]').click()
      await expect
        .poll(
          async () => (await listTabs(page)).filter((t) => t.kind === 'hwp').map((t) => t.title),
          {
            timeout: 60_000,
          },
        )
        .toEqual(['Pencil holder'])
      await expect(dialog).toHaveCount(0)
      // the title block edit is one undo step of the drawing
      await expect(cad.locator('.cad-state')).toHaveAttribute('data-dirty', '')

      const hwp = await waitForPageWithUrl(app, '://hwp/')
      await hwp.waitForTimeout(8000)
      await hwp.screenshot({ path: screenshotPath('cad-sent-hwp-tab') })
    } finally {
      await closeAndSaveVideo(launched, 'cad-send-hwp')
    }
  })

  test('send to Word when Korean document features are off opens a docs tab', async () => {
    test.setTimeout(240_000)
    const launched = await launchCad({
      onboardingSeen: true,
      settings: { koreanDocFeatures: false },
      videoDir: 'cad-send-docx',
    })
    const { app, page } = launched
    try {
      const cad = await newDrawing(launched)
      await placeShape(cad, 'box')
      const title = (await cadTabs(page))[0]!.title
      await ribbonTab(cad, 'dims')
      const send = cad.locator('[data-ribbon-pane="dims"] [data-action="send"]')
      await expect(send).toHaveText('Send to Word')
      await send.click()
      await expect
        .poll(
          async () => (await listTabs(page)).filter((t) => t.kind === 'docs').map((t) => t.title),
          {
            timeout: 60_000,
          },
        )
        .toEqual([title])
      await expect(cad.locator('[data-cad-message]')).toHaveText('Opened in a new tab.')
      expect((await listTabs(page)).some((t) => t.kind === 'hwp')).toBe(false)
      const docs = await waitForPageWithUrl(app, '://docs/')
      await docs.waitForTimeout(4000)
      await docs.screenshot({ path: screenshotPath('cad-sent-docx-tab') })
    } finally {
      await closeAndSaveVideo(launched, 'cad-send-docx')
    }
  })
})

test.describe('AI Drawing tab, the AI assistant (stage 5)', () => {
  test('an AI request adds shapes and one undo removes them all', async () => {
    test.setTimeout(240_000)
    const launched = await launchCad({ onboardingSeen: true, videoDir: 'cad-ai' })
    const { app } = launched
    try {
      const cad = await newDrawing(launched)
      // the model is scripted: three boxes in one call, then a short answer (no provider is reached)
      const box = (name: string, x: number) => ({
        kind: 'box',
        name,
        dims: { width: 40, depth: 40, height: 40 },
        position: [x, 0, 0],
      })
      await stubAiReady(app, [
        [
          {
            type: 'tool-call',
            toolCall: {
              id: 'c1',
              name: 'add_shapes',
              input: { shapes: [box('Box A', -60), box('Box B', 0), box('Box C', 60)] },
            },
          },
          { type: 'done' },
        ],
        [{ type: 'delta', text: 'Placed three boxes in a row.' }, { type: 'done' }],
      ])
      const pane = cad.locator('.cad-side .copilot')
      await expect(pane).toBeVisible()
      await expect(cad.locator('[data-ai-quick="sheet"]')).toBeDisabled()

      await pane.locator('.ai-input-box textarea').fill('Three 40 mm boxes in a row')
      await pane.locator('.ai-send-btn').click()
      await expect(pane.locator('.ai-msg-assistant').last()).toContainText(
        'Placed three boxes in a row.',
      )
      await expect(pane.locator('.ai-stop-btn')).toHaveCount(0)
      await expect(cad.locator('[data-ai-quick="sheet"]')).toBeEnabled()
      await pane.locator('.ai-work-group-summary').click()
      await expect(pane.locator('.ai-step-title')).toHaveText(['Place shapes · 3'])
      await cad.screenshot({ path: screenshotPath('cad-ai-pane') })

      // the three parts are there: select them all from the 3D view
      await cad.locator('.cad-viewport canvas').click({ position: { x: 10, y: 10 } })
      await cad.keyboard.press('ControlOrMeta+a')
      await expect(cad.locator('[data-cad-status-info]')).toContainText('3 parts selected')

      // one undo takes the whole request back, and it was the only step
      const undo = cad.locator('.ribbon-tabs [data-action="undo"]')
      await undo.click()
      await expect(cad.locator('[data-ai-quick="sheet"]')).toBeDisabled()
      await expect(undo).toBeDisabled()
      await expect(cad.locator('.cad-state')).toHaveAttribute('data-dirty', '')
    } finally {
      await closeAndSaveVideo(launched, 'cad-ai')
    }
  })
})

// ---- attachments in the AI pane (design 2026-11-18) ----

test.describe('AI pane attachments', () => {
  test('an attached text file is read by the AI, and the picture and the file show as chips', async () => {
    test.setTimeout(240_000)
    const launched = await launchCad({ onboardingSeen: true, videoDir: 'cad-attach' })
    const { app } = launched
    const dir = await mkdtemp(join(tmpdir(), 'hanpan-cad-attach-'))
    try {
      const spec = join(dir, 'spec.txt')
      await writeFile(spec, 'Box: 80 x 60 x 40 mm.')
      const cad = await newDrawing(launched)
      // the attach button's file dialog answers with the spec (no dialog is shown)
      await app.evaluate(({ dialog }, path) => {
        dialog.showOpenDialog = (async () => ({
          canceled: false,
          filePaths: [path],
        })) as typeof dialog.showOpenDialog
      }, spec)
      await stubAiReady(app, [
        [
          {
            type: 'tool-call',
            toolCall: { id: 'r1', name: 'read_attachment', input: { index: 0 } },
          },
          { type: 'done' },
        ],
        [{ type: 'delta', text: 'The spec asks for an 80 mm box.' }, { type: 'done' }],
      ])
      const pane = cad.locator('.cad-side .copilot')
      await expect(pane).toBeVisible()
      await pane.locator('.ai-attach-btn:not(.ai-doc-attach-btn)').click()
      await expect(pane.locator('.ai-attachments .ai-attachment-card-name')).toHaveText('spec.txt')

      // a pasted screenshot (no file of its own) goes through main to a temporary file
      await pane.locator('.ai-input-box textarea').focus()
      await cad.evaluate(() => {
        const bytes = Uint8Array.from(
          atob(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
          ),
          (c) => c.charCodeAt(0),
        )
        const data = new DataTransfer()
        data.items.add(new File([bytes], 'shot.png', { type: 'image/png' }))
        document
          .querySelector('.ai-input-box textarea')!
          .dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }))
      })
      await expect(pane.locator('.ai-attachments .ai-attachment-thumb img')).toHaveCount(1)
      await cad.screenshot({ path: screenshotPath('cad-ai-attachments') })

      await pane.locator('.ai-input-box textarea').fill('Make the box in the spec')
      await pane.locator('.ai-send-btn').click()
      await expect(pane.locator('.ai-msg-assistant').last()).toContainText(
        'The spec asks for an 80 mm box.',
      )
      await expect(pane.locator('.ai-stop-btn')).toHaveCount(0)
      // the message shows what it took; the composer is empty again
      await expect(pane.locator('.ai-msg-user .ai-attachment-card-name')).toHaveText('spec.txt')
      await expect(pane.locator('.ai-attachments')).toHaveCount(0)
      await pane.locator('.ai-work-group-summary').click()
      await expect(pane.locator('.ai-step-title')).toHaveText(['Read attachment spec.txt'])
      // reading a file changed nothing in the drawing
      await expect(cad.locator('.ribbon-tabs [data-action="undo"]')).toBeDisabled()
    } finally {
      await closeAndSaveVideo(launched, 'cad-attach')
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

// ---- stage 6: the dark theme and a PC without WebGL ----

const setAppTheme = (page: Page, theme: 'light' | 'dark'): Promise<void> =>
  page.evaluate(
    (t) =>
      (window as unknown as { aiOffice: { setTheme(v: string): Promise<void> } }).aiOffice.setTheme(
        t,
      ),
    theme,
  )

/** Relative luminance (0 dark .. 1 light) of an 8-bit RGB colour. */
function luminance(r: number, g: number, b: number): number {
  const lin = (c: number): number => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** The luminance of one pixel of what `target` shows on screen, `x`/`y` from its top left. */
async function pixelLuminance(target: Locator, x: number, y: number): Promise<number> {
  const png = PNG.sync.read(await target.screenshot())
  const at = (Math.min(y, png.height - 1) * png.width + Math.min(x, png.width - 1)) * 4
  return luminance(png.data[at]!, png.data[at + 1]!, png.data[at + 2]!)
}

/**
 * Frame problems on the page: a light box (an opaque background lighter than
 * `maxBackground`) and text whose colour is too close to the background it sits on
 * (contrast under 3:1). Canvases and pictures are document content and are skipped,
 * and so is everything inside `skip`.
 */
async function frameProblems(cad: Page, maxBackground: number, skip = ''): Promise<string[]> {
  return cad.evaluate(
    ({ maxBg, skipSel }) => {
      const parse = (c: string): [number, number, number, number] | null => {
        const m = c.match(/rgba?\(([^)]+)\)/)
        if (!m) return null
        const [r, g, b, a = '1'] = m[1]!.split(/[ ,/]+/).filter(Boolean)
        return [Number(r), Number(g), Number(b), Number(a)]
      }
      const lum = (r: number, g: number, b: number): number => {
        const lin = (c: number): number => {
          const v = c / 255
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
        }
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
      }
      const backgroundOf = (el: Element | null): number => {
        for (let at = el; at; at = at.parentElement) {
          const c = parse(getComputedStyle(at).backgroundColor)
          if (c && c[3] > 0.5) return lum(c[0], c[1], c[2])
        }
        return 1
      }
      const name = (el: Element): string =>
        `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`
      const problems: string[] = []
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('canvas, img, svg')) continue
        if (skipSel && el.closest(skipSel)) continue
        const box = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        if (box.width < 2 || box.height < 2 || style.visibility === 'hidden') continue
        if (style.opacity === '0') continue
        const bg = parse(style.backgroundColor)
        // the primary button is light in the dark theme by design (--color-btn-primary)
        const lightByDesign = el.matches('.cad-button-primary')
        if (bg && bg[3] > 0.5 && lum(bg[0], bg[1], bg[2]) > maxBg && !lightByDesign) {
          problems.push(`light box ${name(el)} ${style.backgroundColor}`)
        }
        const ownText = [...el.childNodes].some(
          (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '',
        )
        if (!ownText) continue
        const fg = parse(style.color)
        if (!fg || fg[3] === 0) continue
        const a = lum(fg[0], fg[1], fg[2])
        const b = backgroundOf(el)
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        // disabled controls are dimmed on purpose
        if (ratio < 3 && !el.closest(':disabled, [aria-disabled="true"]')) {
          const words = (el.textContent ?? '').trim().slice(0, 20)
          problems.push(`faint text ${name(el)} "${words}" ${ratio.toFixed(2)}`)
        }
      }
      return problems
    },
    { maxBg: maxBackground, skipSel: skip },
  )
}

test.describe('AI Drawing tab (stage 6: themes, no WebGL)', () => {
  test('the frame and the 3D view follow the light and the dark theme; the sheet stays light', async () => {
    test.setTimeout(240_000)
    const launched = await launchCad({ onboardingSeen: true, videoDir: 'cad-themes' })
    const { page } = launched
    try {
      // light on purpose, not "system": the OS of the PC running the suite does not decide
      await setAppTheme(page, 'light')
      const cad = await newDrawing(launched)
      await placeShape(cad, 'box')
      await placeShape(cad, 'cylinder')
      await setProp(cad, 'position.x', '50')
      await placeShape(cad, 'sphere')
      await setProp(cad, 'position.x', '-50')
      await expect(cad.locator('.cad-side .copilot')).toBeVisible()
      const canvas = cad.locator('.cad-viewport canvas')
      const html = cad.locator('html')

      await expect(html).toHaveAttribute('data-theme', 'light')
      // the corner of the view is the space around the workplane (or the plane)
      await expect.poll(() => pixelLuminance(canvas, 4, 4)).toBeGreaterThan(0.7)
      expect(await frameProblems(cad, 1.01)).toEqual([])
      await cad.screenshot({ path: screenshotPath('cad-theme-light') })

      await setAppTheme(page, 'dark')
      await expect(html).toHaveAttribute('data-theme', 'dark')
      await expect.poll(() => pixelLuminance(canvas, 4, 4)).toBeLessThan(0.05)
      for (const part of ['.ribbon', '.cad-side', '[data-cad-status-info]']) {
        const target = cad.locator(part).first()
        await expect(target).toBeVisible()
        const box = (await target.boundingBox())!
        expect(
          await pixelLuminance(target, Math.floor(box.width - 3), Math.floor(box.height / 2)),
          part,
        ).toBeLessThan(0.1)
      }
      expect(await frameProblems(cad, 0.3)).toEqual([])
      await cad.screenshot({ path: screenshotPath('cad-theme-dark') })

      // the dimension sheet is paper: light in the dark theme too, on a dark dialog
      await ribbonTab(cad, 'dims')
      await cad.locator('[data-ribbon-pane="dims"] [data-action="sheet"]').click()
      const dialog = cad.locator('.cad-sheet-dialog')
      const preview = dialog.locator('[data-sheet-preview]')
      await expect(preview).toBeVisible()
      await expect.poll(() => pixelLuminance(preview, 6, 6)).toBeGreaterThan(0.85)
      expect(await frameProblems(cad, 0.3, '.cad-sheet-paper')).toEqual([])
      await cad.screenshot({ path: screenshotPath('cad-theme-dark-sheet') })
    } finally {
      await closeAndSaveVideo(launched, 'cad-themes')
    }
  })

  test('without WebGL the 3D view gives way to the screen with both remedies', async () => {
    test.setTimeout(180_000)
    const launched = await launchCad({
      onboardingSeen: true,
      videoDir: 'cad-nowebgl',
      args: NO_WEBGL_ARGS,
    })
    const { app, page } = launched
    try {
      await openFromAllApps(page, 'ttukcad')
      const cad = await waitForPageWithUrl(app, '://cad/')
      // the switches really took WebGL away in this page
      expect(
        await cad.evaluate(() => {
          const c = document.createElement('canvas')
          return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
        }),
      ).toBe(false)
      await expect(cad.locator('[data-cad-ready]')).toBeVisible({ timeout: 30_000 })
      const screen = cad.locator('.cad-nowebgl')
      await expect(screen).toBeVisible()
      await expect(screen.locator('.cad-nowebgl-title')).not.toBeEmpty()
      await expect(screen.locator('.cad-nowebgl-remedies li')).toHaveCount(2)
      for (const item of await screen.locator('.cad-nowebgl-remedies li').all()) {
        await expect(item).not.toBeEmpty()
      }
      await expect(cad.locator('.cad-viewport canvas')).toHaveCount(0)
      await cad.screenshot({ path: screenshotPath('cad-nowebgl') })

      // nothing hangs: the ribbon still answers and the drawing still takes a part
      await placeShape(cad, 'box')
      await expect(cad.locator('[data-cad-status-info]')).toContainText('Box', { timeout: 15_000 })
      await expect(cad.locator('.cad-state')).toHaveAttribute('data-dirty', '')
      expect(await menuLabels(app, 'File')).toContain('Save')
    } finally {
      await closeAndSaveVideo(launched, 'cad-nowebgl')
    }
  })
})
