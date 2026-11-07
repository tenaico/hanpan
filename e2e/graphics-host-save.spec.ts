import { test, expect } from '@playwright/test'
import type { ElectronApplication, Frame, Page } from '@playwright/test'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { launchShell, closeAndSaveVideo, graphicsGpuMissing, waitForPageWithUrl } from './helpers'

/**
 * 0.17 UI/UX review v2 (G1, G2, G3, W1, W4): inside an AI Photo or AI Illustration tab, the web
 * app's own Save, Save As and Print (its menus and its keys) are Hanpan's. The file is written by
 * Hanpan's save dialog, and only then is the tab's unsaved mark cleared; the app's own save dialog
 * never shows, and nothing is "saved" inside the page. Needs a web build (h4 or later) in
 * apps/graphics/out (GRAPHICS_WEB_PHOTO_DIR / GRAPHICS_WEB_ILLUST_DIR when building).
 */
const WEB = (kind: 'photo' | 'illust') =>
  join(__dirname, '..', 'apps', 'graphics', 'out', 'renderer', 'web', kind, 'index.html')
const SHOTS = process.env.GRAPHICS_E2E_SHOTS

function appFrame(page: Page, kind: 'photo' | 'illust'): Frame {
  const frame = page.frames().find((f) => f.url().includes(`/web/${kind}/index.html`))
  if (!frame) throw new Error(`no ${kind} app frame yet`)
  return frame
}

async function inApp<T>(page: Page, kind: 'photo' | 'illust', script: string): Promise<T> {
  const global = kind === 'photo' ? 'photocraft' : 'vectorcraft'
  return appFrame(page, kind).evaluate(
    async ([g, body]) => {
      const api = (window as unknown as Record<string, unknown>)[g]
      if (!api) throw new Error(`no ${g} API yet`)
      return (await new Function('api', `return (async () => { ${body} })()`)(api)) as unknown
    },
    [global, script] as const,
  ) as Promise<T>
}

async function tabDirty(app: ElectronApplication, kind: 'photo' | 'illust'): Promise<boolean> {
  for (const page of app.windows()) {
    const found = await page
      .evaluate(async (k) => {
        const api = (
          window as unknown as {
            aiOfficeTabs?: { list(): Promise<{ kind: string; dirty?: boolean }[]> }
          }
        ).aiOfficeTabs
        if (!api) return null
        const tab = (await api.list()).find((t) => t.kind === k)
        return tab ? Boolean(tab.dirty) : null
      }, kind)
      .catch(() => null)
    if (found !== null) return found
  }
  throw new Error('no tab list')
}

async function stubSaveDialog(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, p) => {
    const scope = globalThis as { saveDialogs?: number }
    scope.saveDialogs = 0
    dialog.showSaveDialog = (async () => {
      scope.saveDialogs = (scope.saveDialogs ?? 0) + 1
      return { canceled: false, filePath: p }
    }) as typeof dialog.showSaveDialog
  }, path)
}

const saveDialogs = (app: ElectronApplication) =>
  app.evaluate(() => (globalThis as { saveDialogs?: number }).saveDialogs ?? 0)

async function sizeWindow(app: ElectronApplication, width: number, height: number) {
  await app.evaluate(
    ({ BrowserWindow }, [w, h]) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.unmaximize()
        win.setContentSize(w, h)
      }
    },
    [width, height] as const,
  )
}

for (const kind of ['illust', 'photo'] as const) {
  test.describe(`${kind}: the app's own save and print are Hanpan's`, () => {
    test.skip(!existsSync(WEB(kind)), `no ${kind} web build in apps/graphics/out`)

    test(`${kind}: the app's Save writes the file through Hanpan's dialog`, async () => {
      const auth = await mkdtemp(join(tmpdir(), 'genoffice-e2e-auth-'))
      const launched = await launchShell({
        onboardingSeen: true,
        lang: 'ko',
        videoDir: `graphics-host-save-${kind}`,
        env: { GENOFFICE_AUTH_DIR: auth },
      })
      const { app, page } = launched
      try {
        await sizeWindow(app, 1366, 768)
        await page.locator(`.quick-card[data-new="${kind}"]`).click()
        const tab = await waitForPageWithUrl(app, `://${kind}/`)
        const noGpu = await graphicsGpuMissing(tab)
        test.skip(noGpu !== null, noGpu ?? '')
        await expect
          .poll(
            () => inApp<number>(tab, kind, 'return (await api.commands()).length').catch(() => 0),
            {
              timeout: 60_000,
            },
          )
          .toBeGreaterThan(100)
        if (SHOTS) {
          mkdirSync(SHOTS, { recursive: true })
          await tab.waitForTimeout(2000)
          await tab.screenshot({ path: join(SHOTS, `${kind}-1366x768-start.png`) })
        }
        // a new document with an edit: the tab is marked changed
        if (kind === 'illust') {
          await inApp(
            tab,
            kind,
            "await api.execute('file.newWithoutDialog', {}); await api.execute('shape.rectangle', { x: 72, y: 72, width: 200, height: 100 }); return 1",
          )
        } else {
          await inApp(
            tab,
            kind,
            "await api.execute('file.new', { width: 640, height: 400 }); await api.execute('edit.fillForeground', {}); return 1",
          )
        }
        await expect.poll(() => tabDirty(app, kind), { timeout: 15_000 }).toBe(true)
        if (SHOTS) await tab.screenshot({ path: join(SHOTS, `${kind}-1366x768-document.png`) })

        const dir = await mkdtemp(join(tmpdir(), 'graphics-host-save-'))
        const target = join(dir, kind === 'illust' ? 'poster.vectorcraft' : 'picture.psd')
        await stubSaveDialog(app, target)
        // the app's own Save: File › Save as the menu runs it (photo), Ctrl+S as the app's key
        // handling sees it (illust)
        if (kind === 'photo') {
          await inApp(
            tab,
            kind,
            "await api.request('ui.menu.invoke', { command: 'file.save' }); return 1",
          )
        } else {
          await inApp(
            tab,
            kind,
            "await api.request('ui.key', { key: 'S', ctrl: true, cmd: true }); return 1",
          )
        }
        await expect
          .poll(() => (existsSync(target) ? statSync(target).size : 0), { timeout: 30_000 })
          .toBeGreaterThan(100)
        expect(await saveDialogs(app)).toBe(1)
        if (kind === 'photo') expect(readFileSync(target).subarray(0, 4).toString()).toBe('8BPS')
        await expect.poll(() => tabDirty(app, kind), { timeout: 15_000 }).toBe(false)
        // nothing of the page's own save: no file written inside it under that name
        const files = await inApp<string[]>(
          tab,
          kind,
          'return (await api.files()).map((f) => f.path)',
        )
        expect(files.filter((f) => /untitled|제목 없음/i.test(f))).toEqual([])

        // Print from inside the app: Hanpan's print preview (nothing is printed)
        if (kind === 'photo') {
          await inApp(
            tab,
            kind,
            "await api.request('ui.menu.invoke', { command: 'file.print' }); return 1",
          )
        } else {
          await inApp(
            tab,
            kind,
            "await api.request('ui.key', { key: 'P', ctrl: true, cmd: true }); return 1",
          )
        }
        await expect(tab.locator('[data-hanpan="image-print-preview"]')).toBeVisible({
          timeout: 20_000,
        })
        if (SHOTS) await tab.screenshot({ path: join(SHOTS, `${kind}-print-preview.png`) })
      } finally {
        await closeAndSaveVideo(launched, `graphics-host-save-${kind}`)
      }
    })
  })
}

/** every file under `dir`, recursively */
function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)],
  )
}

for (const kind of ['illust', 'photo'] as const) {
  test.describe(`${kind}: a recovery copy of unsaved work`, () => {
    test.skip(!existsSync(WEB(kind)), `no ${kind} web build in apps/graphics/out`)

    test(`${kind}: a changed untitled document is copied into the profile's recovery folder`, async () => {
      test.setTimeout(150_000)
      const auth = await mkdtemp(join(tmpdir(), 'genoffice-e2e-auth-'))
      const launched = await launchShell({
        onboardingSeen: true,
        lang: 'ko',
        videoDir: `graphics-recovery-${kind}`,
        env: { GENOFFICE_AUTH_DIR: auth },
      })
      const { app, page, userDataDir } = launched
      let noGpu: string | null = null
      try {
        await page.locator(`.quick-card[data-new="${kind}"]`).click()
        const tab = await waitForPageWithUrl(app, `://${kind}/`)
        noGpu = await graphicsGpuMissing(tab)
        test.skip(noGpu !== null, noGpu ?? '')
        await expect
          .poll(
            () => inApp<number>(tab, kind, 'return (await api.commands()).length').catch(() => 0),
            { timeout: 60_000 },
          )
          .toBeGreaterThan(100)
        await inApp(
          tab,
          kind,
          kind === 'illust'
            ? "await api.execute('file.newWithoutDialog', {}); await api.execute('shape.rectangle', { x: 72, y: 72, width: 200, height: 100 }); return 1"
            : "await api.execute('file.new', { width: 640, height: 400 }); await api.execute('edit.fillForeground', {}); return 1",
        )
        const folder = join(userDataDir, `${kind}-autosave`)
        const ext = kind === 'illust' ? '.vectorcraft' : '.psd'
        await expect
          .poll(() => filesUnder(folder).filter((f) => f.endsWith(ext)).length, {
            timeout: 100_000,
            intervals: [2000],
          })
          .toBeGreaterThan(0)
        const copy = filesUnder(folder).find((f) => f.endsWith(ext))!
        const head = readFileSync(copy).subarray(0, 4).toString()
        if (kind === 'photo') expect(head).toBe('8BPS')
        expect(statSync(copy).size).toBeGreaterThan(100)
      } finally {
        if (noGpu !== null) {
          await closeAndSaveVideo(launched, `graphics-recovery-${kind}`)
        } else {
          // a power cut: the main process, by the PID this test started, with its children
          const pid = app.process().pid!
          const closed = app.waitForEvent('close', { timeout: 30_000 }).catch(() => undefined)
          if (process.platform === 'win32') {
            execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'pipe' })
          } else {
            process.kill(pid, 'SIGKILL')
          }
          await closed
        }
      }
      // the next launch offers the copy, and restoring it brings the drawing back, unsaved
      const second = await launchShell({
        userDataDir,
        lang: 'ko',
        videoDir: `graphics-recovery-${kind}-2`,
        env: { GENOFFICE_AUTH_DIR: auth },
      })
      try {
        const list = second.page.locator('.recovery-list')
        await expect(list).toBeVisible({ timeout: 30_000 })
        await expect(list.locator('.recovery-row')).toHaveCount(1)
        if (SHOTS) await second.page.screenshot({ path: join(SHOTS, `${kind}-recovery-list.png`) })
        await list.locator('.recovery-confirm').click()
        const tab = await waitForPageWithUrl(second.app, `://${kind}/`, 60_000)
        await expect
          .poll(
            () =>
              inApp<boolean>(
                tab,
                kind,
                kind === 'illust'
                  ? 'const i = await api.inspect(); return (i.documents ?? []).length > 0'
                  : 'const i = await api.inspect(); return (i.session?.documents ?? []).length > 0',
              ).catch(() => false),
            { timeout: 60_000 },
          )
          .toBe(true)
        await expect.poll(() => tabDirty(second.app, kind), { timeout: 15_000 }).toBe(true)
      } finally {
        await closeAndSaveVideo(second, `graphics-recovery-${kind}-2`)
      }
    })
  })
}
