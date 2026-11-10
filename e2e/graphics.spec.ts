import { test, expect } from '@playwright/test'
import type { ElectronApplication, Frame, Page } from '@playwright/test'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { graphicsGpuMissing, launchShell, closeAndSaveVideo, waitForPageWithUrl } from './helpers'

/**
 * AI Illustration (decision 0093) with the web build the graphics package was
 * built with (GRAPHICS_WEB_ILLUST_DIR or the pinned release): the Home card
 * opens a tab whose app answers its page API, Hanpan's save writes the file
 * the dialog chose, a changed tab asks before closing, and a hidden tab still
 * answers. The AI panel docks beside the app.
 */
const ILLUST_WEB = join(
  __dirname,
  '..',
  'apps',
  'graphics',
  'out',
  'renderer',
  'web',
  'illust',
  'index.html',
)

interface TabsApi {
  list(): Promise<{ id: string; kind: string }[]>
  close(id: string): Promise<void>
  activate(id: string): Promise<void>
}

async function tabsView(app: ElectronApplication): Promise<Page> {
  for (const candidate of app.windows()) {
    const has = await candidate
      .evaluate(() => typeof (window as { aiOfficeTabs?: unknown }).aiOfficeTabs === 'object')
      .catch(() => false)
    if (has) return candidate
  }
  throw new Error('no view with the tab bar API')
}

/** Runs `script` against `window.vectorcraft` in the tab's frame; returns its result. */
/** The web app's own frame: on its own origin, so it is driven from inside, not from the host page. */
function appFrame(page: Page, kind: 'photo' | 'illust'): Frame {
  const frame = page.frames().find((f) => f.url().includes(`/web/${kind}/index.html`))
  if (!frame) throw new Error(`no ${kind} app frame yet`)
  return frame
}

async function inApp<T>(page: Page, script: string): Promise<T> {
  return appFrame(page, 'illust').evaluate(async (body) => {
    const vc = (window as unknown as { vectorcraft?: unknown }).vectorcraft
    if (!vc) throw new Error('no vectorcraft API yet')
    return (await new Function('vc', `return (async () => { ${body} })()`)(vc)) as T
  }, script)
}

test.describe('AI Illustration tab', () => {
  test.skip(!existsSync(ILLUST_WEB), 'no illustration web build in apps/graphics/out')

  test('opens from Home, saves, asks before closing and answers while hidden', async () => {
    const launched = await launchShell({ onboardingSeen: true, videoDir: 'graphics-illust' })
    const { app, page } = launched
    try {
      await page.locator('.quick-card[data-new="illust"]').click()
      const tab = await waitForPageWithUrl(app, '://illust/')
      const noGpu = await graphicsGpuMissing(tab)
      test.skip(noGpu !== null, noGpu ?? '')
      await expect
        .poll(() => inApp<number>(tab, 'return (await vc.commands()).length').catch(() => 0), {
          timeout: 60_000,
        })
        .toBeGreaterThan(1000)
      // the app in the frame cannot reach the host's bridge: none on the window, and the
      // one-time hand-over was already taken by the host page (docs/security.md)
      // the app runs on its own origin (option B): nothing of the host page is reachable from it,
      // and the frame gets no bridge of its own
      const reach = await appFrame(tab, 'illust').evaluate(() => {
        const origin = location.origin
        let parentReadable = true
        try {
          void (window.parent as unknown as { document: Document }).document.title
        } catch {
          parentReadable = false
        }
        const own = window as unknown as Record<string, unknown>
        return {
          origin,
          parentReadable,
          bridges: ['graphicsBridge', 'graphicsApi', 'aiOfficeOutbound'].filter((k) => k in own),
        }
      })
      expect(reach).toEqual({
        origin: 'genoffice-app://illust-app',
        parentReadable: false,
        bridges: [],
      })
      expect(await tab.evaluate(() => location.origin)).toBe('genoffice-app://illust')
      // and the host origin does not serve the web app (it would share the host's origin)
      expect(await tab.evaluate(async () => (await fetch('./web/illust/index.html')).status)).toBe(
        404,
      )
      // the AI panel docks beside the app (its composer is there; nothing is sent)
      await expect(tab.locator('.ai-dock .ai-composer textarea')).toBeVisible({ timeout: 10_000 })

      // a document with a shape: the tab turns changed
      await inApp(
        tab,
        "await vc.execute('file.newWithoutDialog', {}); await vc.execute('shape.rectangle', { x: 72, y: 72, width: 200, height: 100 }); return 1",
      )

      // Ctrl+S: Hanpan's save dialog (stubbed) and the file it chose
      const dir = await mkdtemp(join(tmpdir(), 'graphics-e2e-'))
      const target = join(dir, 'poster.vectorcraft')
      await app.evaluate(({ dialog }, p) => {
        dialog.showSaveDialog = (async () => ({
          canceled: false,
          filePath: p,
        })) as typeof dialog.showSaveDialog
      }, target)
      // a real key press, as the person makes it (the page never sees it: main takes it)
      await app.evaluate(({ webContents }) => {
        const wc = webContents.getAllWebContents().find((w) => w.getURL().includes('://illust/'))
        wc?.focus()
        wc?.sendInputEvent({ type: 'keyDown', keyCode: 'S', modifiers: ['control'] })
        wc?.sendInputEvent({ type: 'keyUp', keyCode: 'S', modifiers: ['control'] })
      })
      await expect
        .poll(() => (existsSync(target) ? statSync(target).size : 0), { timeout: 30_000 })
        .toBeGreaterThan(1000)

      // changed again: closing asks first (answered Cancel, the tab stays)
      await inApp(
        tab,
        "await vc.execute('shape.rectangle', { x: 300, y: 72, width: 50, height: 50 }); return 1",
      )
      await app.evaluate(({ dialog }) => {
        const scope = globalThis as { closePrompts?: number }
        scope.closePrompts = 0
        dialog.showMessageBox = (async () => {
          scope.closePrompts = (scope.closePrompts ?? 0) + 1
          return { response: 2, checkboxChecked: false }
        }) as typeof dialog.showMessageBox
      })
      await page.waitForTimeout(2500) // the host's state poll reports the change
      const view = await tabsView(app)
      await view.evaluate(async () => {
        const api = (window as unknown as { aiOfficeTabs: TabsApi }).aiOfficeTabs
        const t = (await api.list()).find((x) => x.kind === 'illust')
        if (t) await api.close(t.id)
      })
      await expect
        .poll(() => app.evaluate(() => (globalThis as { closePrompts?: number }).closePrompts ?? 0))
        .toBe(1)

      // hidden behind Home, the app still answers its page API
      await view.evaluate(async () => {
        await (window as unknown as { aiOfficeTabs: TabsApi }).aiOfficeTabs.activate('home')
      })
      const started = Date.now()
      await inApp(tab, "await vc.execute('select.all', {}); return 1")
      expect(Date.now() - started).toBeLessThan(3000)
    } finally {
      await closeAndSaveVideo(launched, 'graphics-illust')
    }
  })

  test('the quick actions center a shape and trace a placed picture', async () => {
    const launched = await launchShell({ onboardingSeen: true, videoDir: 'graphics-quick' })
    const { app, page } = launched
    try {
      await page.locator('.quick-card[data-new="illust"]').click()
      const tab = await waitForPageWithUrl(app, '://illust/')
      const noGpu = await graphicsGpuMissing(tab)
      test.skip(noGpu !== null, noGpu ?? '')
      await expect
        .poll(() => inApp<number>(tab, 'return (await vc.commands()).length').catch(() => 0), {
          timeout: 60_000,
        })
        .toBeGreaterThan(1000)
      await inApp(
        tab,
        "await vc.execute('file.newWithoutDialog', {}); await vc.execute('shape.rectangle', { x: 10, y: 10, width: 40, height: 20 }); await vc.execute('select.none', {}).catch(() => {}); return 1",
      )
      const history = () =>
        inApp<number>(
          tab,
          "return (await vc.execute('document.inspect', { ids: [] })).history.length",
        )

      // Center on artboard: nothing selected, so everything is, then centred
      const beforeCenter = await history()
      await tab.locator('[data-quick="centerOnArtboard"]').click()
      await expect.poll(history, { timeout: 10_000 }).toBeGreaterThan(beforeCenter)
      await expect(tab.locator('.gx-notice')).not.toContainText('could not')

      // Trace image: a picture placed and selected is traced without a file dialog
      await inApp(
        tab,
        `const c = new OffscreenCanvas(32, 32); const g = c.getContext('2d');
         g.fillStyle = '#000'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#fff'; g.fillRect(8, 8, 16, 16);
         const b = new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer());
         let s = ''; for (const x of b) s += String.fromCharCode(x);
         await vc.execute('file.place', { name: 'dot.png', dataBase64: btoa(s), link: false });
         return 1`,
      )
      const kind = await inApp<string>(
        tab,
        "const d = await vc.execute('document.inspect', { ids: [] }); return (await vc.execute('document.node', { id: d.selection[0] })).kind.type",
      )
      expect(kind).toBe('image')
      const beforeTrace = await history()
      await tab.locator('[data-quick="traceImage"]').click()
      await expect.poll(history, { timeout: 20_000 }).toBeGreaterThan(beforeTrace)
      await expect(tab.locator('.gx-notice')).not.toContainText('could not')
    } finally {
      await closeAndSaveVideo(launched, 'graphics-quick')
    }
  })
})

const PHOTO_WEB = join(
  __dirname,
  '..',
  'apps',
  'graphics',
  'out',
  'renderer',
  'web',
  'photo',
  'index.html',
)

/** Runs `script` against `window.photocraft` in the tab's frame; returns its result. */
async function inPhoto<T>(page: Page, script: string): Promise<T> {
  return appFrame(page, 'photo').evaluate(async (body) => {
    const pc = (window as unknown as { photocraft?: unknown }).photocraft
    if (!pc) throw new Error('no photocraft API yet')
    return (await new Function('pc', `return (async () => { ${body} })()`)(pc)) as T
  }, script)
}

/** a 64 × 48 PNG with a red square, written by the page's own canvas */
async function writeSamplePng(page: Page, path: string): Promise<void> {
  const b64 = await page.evaluate(async () => {
    const c = new OffscreenCanvas(64, 48)
    const g = c.getContext('2d')!
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, 64, 48)
    g.fillStyle = '#c0304a'
    g.fillRect(16, 12, 32, 24)
    const bytes = new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())
    let s = ''
    for (const x of bytes) s += String.fromCharCode(x)
    return btoa(s)
  })
  writeFileSync(path, Buffer.from(b64, 'base64'))
}

test.describe('AI Photo tab', () => {
  test.skip(!existsSync(PHOTO_WEB), 'no photo web build in apps/graphics/out')

  test('opens a PNG, keeps the app own open and close off, saves in place and closes clean', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'graphics-photo-e2e-'))
    const png = join(dir, 'sample.png')
    // a first launch only to draw the sample with a canvas
    {
      const first = await launchShell({ onboardingSeen: true, videoDir: 'graphics-photo-sample' })
      await writeSamplePng(first.page, png)
      await closeAndSaveVideo(first, 'graphics-photo-sample')
    }
    const before = readFileSync(png)
    // pictures have no OS file association: they open from inside Hanpan (Home's open path)
    const launched = await launchShell({ onboardingSeen: true, videoDir: 'graphics-photo' })
    const { app, page } = launched
    try {
      await page.evaluate(
        (p) =>
          (
            window as unknown as { aiOffice: { openPath(p: string): Promise<void> } }
          ).aiOffice.openPath(p),
        png,
      )
      const tab = await waitForPageWithUrl(app, '://photo/')
      const noGpu = await graphicsGpuMissing(tab)
      test.skip(noGpu !== null, noGpu ?? '')
      await expect
        .poll(
          () =>
            inPhoto<number>(tab, 'return (await pc.inspect()).session.documents.length').catch(
              () => 0,
            ),
          { timeout: 60_000 },
        )
        .toBe(1)
      // embedded: the app's own Open and Close are off; Hanpan opens and closes
      const enabled = await inPhoto<Record<string, boolean>>(
        tab,
        "const c = await pc.commands(); return Object.fromEntries(['file.openAs', 'file.close', 'file.closeAll'].map((id) => [id, c.find((x) => x.id === id)?.enabled]))",
      )
      // PhotoCraft's File › Open is UI-only (not in commands()); plan A's smoke checks the menu
      expect(enabled).toEqual({ 'file.openAs': false, 'file.close': false, 'file.closeAll': false })
      await expect(tab.locator('.ai-dock .ai-composer textarea')).toBeVisible({ timeout: 10_000 })

      // an edit, then Ctrl+S: written in place as PNG (one pixel layer)
      await inPhoto(
        tab,
        "await pc.execute('image.adjustments.hueSaturation', { hue: 120 }); return 1",
      )
      await page.waitForTimeout(1500) // the host's state poll sees the change
      await app.evaluate(({ webContents }) => {
        const wc = webContents.getAllWebContents().find((w) => w.getURL().includes('://photo/'))
        wc?.focus()
        wc?.sendInputEvent({ type: 'keyDown', keyCode: 'S', modifiers: ['control'] })
        wc?.sendInputEvent({ type: 'keyUp', keyCode: 'S', modifiers: ['control'] })
      })
      await expect.poll(() => !readFileSync(png).equals(before), { timeout: 30_000 }).toBe(true)
      expect(readFileSync(png).subarray(0, 4).toString('hex')).toBe('89504e47')

      // Export at size: the dialog, then the save dialog; the copy comes from app.exportImage,
      // so no file is written inside the app and the document is left as it is
      const copy = join(dir, 'copy.png')
      await app.evaluate(({ dialog }, p) => {
        dialog.showSaveDialog = (async () => ({
          canceled: false,
          filePath: p,
        })) as typeof dialog.showSaveDialog
      }, copy)
      await tab.locator('[data-quick="exportAtSize"]').click()
      await tab.locator('[data-action="export-ok"]').click()
      await expect
        .poll(() => (existsSync(copy) ? statSync(copy).size : 0), { timeout: 20_000 })
        .toBeGreaterThan(100)
      expect(readFileSync(copy).subarray(0, 4).toString('hex')).toBe('89504e47')
      expect(
        await inPhoto<string[]>(tab, 'return (await pc.files()).map((f) => f.path)'),
      ).not.toContainEqual(expect.stringContaining('.hanpan-export'))

      // the PNG save leaves PhotoCraft's own mark on; the tab still reads clean: no close question
      await page.waitForTimeout(2500)
      await app.evaluate(({ dialog }) => {
        const scope = globalThis as { closePrompts?: number }
        scope.closePrompts = 0
        dialog.showMessageBox = (async () => {
          scope.closePrompts = (scope.closePrompts ?? 0) + 1
          return { response: 2, checkboxChecked: false }
        }) as typeof dialog.showMessageBox
      })
      const view = await tabsView(app)
      await view.evaluate(async () => {
        const api = (window as unknown as { aiOfficeTabs: TabsApi }).aiOfficeTabs
        const t = (await api.list()).find((x) => x.kind === 'photo')
        if (t) await api.close(t.id)
      })
      await expect
        .poll(() =>
          view.evaluate(async () =>
            (await (window as unknown as { aiOfficeTabs: TabsApi }).aiOfficeTabs.list()).some(
              (x) => x.kind === 'photo',
            ),
          ),
        )
        .toBe(false)
      expect(
        await app.evaluate(() => (globalThis as { closePrompts?: number }).closePrompts ?? 0),
      ).toBe(0)
    } finally {
      await closeAndSaveVideo(launched, 'graphics-photo')
    }
  })
})

test.describe('a PC that cannot draw for the graphics apps', () => {
  test.skip(!existsSync(ILLUST_WEB), 'no illustration web build in apps/graphics/out')

  // CI's runner is such a PC; with a GPU the tab opens as usual and shows no notice
  test('the tab says so in plain words and offers no AI panel', async () => {
    const launched = await launchShell({ onboardingSeen: true, videoDir: 'graphics-no-gpu' })
    const { app, page } = launched
    try {
      await page.locator('.quick-card[data-new="illust"]').click()
      const tab = await waitForPageWithUrl(app, '://illust/')
      const noGpu = await graphicsGpuMissing(tab)
      if (noGpu !== null) {
        await expect(tab.locator('[data-no-gpu]')).toContainText('graphics acceleration', {
          timeout: 30_000,
        })
        await expect(tab.locator('.ai-dock')).toHaveCount(0)
        await expect(tab.locator('iframe')).toHaveCount(0)
      } else {
        await expect(tab.locator('iframe')).toHaveCount(1, { timeout: 30_000 })
        await expect(tab.locator('[data-no-gpu]')).toHaveCount(0)
      }
    } finally {
      await closeAndSaveVideo(launched, 'graphics-no-gpu')
    }
  })
})
