import { test, expect } from '@playwright/test'
import type { ElectronApplication, Frame, Page } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchShell, closeAndSaveVideo, graphicsGpuMissing, waitForPageWithUrl } from './helpers'

/**
 * 0.17 final check: after Ctrl+S in AI Photo the brush drew nothing and the status line said
 * "command `paint.stroke` is not available right now: no active layer". Measured: Hanpan's save,
 * its print preview and the recovery copy's export keep the chosen layer; what clears it is a
 * Move-tool click on the grey pasteboard (the app's own Deselect Layers, as in Photoshop). The
 * brush then has no layer, and the web build (h5) says so in the interface language at the press.
 */
const SITE = join(__dirname, '..', 'apps', 'graphics', 'out', 'renderer', 'web', 'photo')
const WEB = join(SITE, 'index.html')
const SHOTS = process.env.GRAPHICS_E2E_SHOTS
/** h5 and later: a press with no layer chosen asks for one (HANPAN-CHANGES.md says so) */
const ASKS_FOR_LAYER =
  existsSync(join(SITE, 'HANPAN-CHANGES.md')) &&
  readFileSync(join(SITE, 'HANPAN-CHANGES.md'), 'utf8').includes('no layer chosen')

function appFrame(page: Page): Frame {
  const frame = page.frames().find((f) => f.url().includes('/web/photo/index.html'))
  if (!frame) throw new Error('no photo app frame yet')
  return frame
}

async function inApp<T>(page: Page, script: string): Promise<T> {
  return appFrame(page).evaluate(async (body) => {
    const api = (window as unknown as Record<string, unknown>).photocraft
    if (!api) throw new Error('no photocraft API yet')
    return (await new Function('api', `return (async () => { ${body} })()`)(api)) as unknown
  }, script) as Promise<T>
}

interface AppState {
  selected: number[]
  history: number
  tool: string
  status: string
}

const appState = (page: Page) =>
  inApp<AppState>(
    page,
    'const i = await api.inspect(); const d = i.document ?? {}; return { selected: d.selectedLayers ?? [], history: (d.history ?? []).length, tool: String(i.tool ?? ""), status: String(i.status ?? "") }',
  )

async function stubSaveDialog(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = (async () => ({
      canceled: false,
      filePath: p,
    })) as typeof dialog.showSaveDialog
  }, path)
}

async function sizeWindow(app: ElectronApplication) {
  await app.evaluate(({ BrowserWindow }) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.unmaximize()
      win.setContentSize(1366, 768)
    }
  })
}

/** a mouse drag across the canvas, `dy` below the middle of the frame */
async function stroke(page: Page, dy: number) {
  const box = await page.locator('iframe.gx-frame').boundingBox()
  if (!box) throw new Error('no frame box')
  const y = box.y + box.height / 2 + dy
  await page.mouse.move(box.x + box.width * 0.3, y)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width * (0.3 + i * 0.02), y)
  await page.mouse.up()
}

/** a tool by its key; `focus` clicks the canvas first to give the app the keyboard */
async function toolKey(page: Page, key: string, tool: string, focus = true) {
  if (focus) {
    const box = (await page.locator('iframe.gx-frame').boundingBox())!
    await page.mouse.click(box.x + box.width * 0.35, box.y + box.height / 2)
  }
  await page.keyboard.press(key)
  await expect.poll(async () => (await appState(page)).tool).toBe(tool)
}

async function openPhoto(lang: string, videoDir: string) {
  const auth = await mkdtemp(join(tmpdir(), 'genoffice-e2e-auth-'))
  const launched = await launchShell({
    onboardingSeen: true,
    lang,
    videoDir,
    env: { GENOFFICE_AUTH_DIR: auth },
  })
  await sizeWindow(launched.app)
  await launched.page.locator('.quick-card[data-new="photo"]').click()
  const tab = await waitForPageWithUrl(launched.app, '://photo/')
  const noGpu = await graphicsGpuMissing(tab)
  if (noGpu !== null) {
    await closeAndSaveVideo(launched, videoDir)
    test.skip(true, noGpu)
  }
  await expect
    .poll(() => inApp<number>(tab, 'return (await api.commands()).length').catch(() => 0), {
      timeout: 60_000,
    })
    .toBeGreaterThan(100)
  await inApp(tab, "await api.execute('file.new', { width: 1920, height: 1080 }); return 1")
  await tab.waitForTimeout(1500)
  return { launched, tab }
}

test.describe('photo: the chosen layer through save, print and recovery copies', () => {
  test.skip(!existsSync(WEB), 'no photo web build in apps/graphics/out')

  test('photo: Ctrl+S, the print preview and a recovery copy keep the layer, and the brush draws again after the save', async () => {
    test.setTimeout(180_000)
    const { launched, tab } = await openPhoto('ko', 'graphics-photo-layer-kept')
    const { app } = launched
    try {
      await toolKey(tab, 'b', 'Brush')
      const before = await appState(tab)
      expect(before.selected.length).toBe(1)
      await stroke(tab, 0)
      await expect.poll(async () => (await appState(tab)).history).toBe(before.history + 1)
      const chosen = (await appState(tab)).selected

      // Ctrl+S with the keyboard: Hanpan's save dialog writes the PSD
      const dir = await mkdtemp(join(tmpdir(), 'graphics-layer-kept-'))
      const target = join(dir, 'photo-final.psd')
      await stubSaveDialog(app, target)
      await tab.keyboard.press('Control+s')
      await expect
        .poll(() => (existsSync(target) ? statSync(target).size : 0), { timeout: 30_000 })
        .toBeGreaterThan(100)
      await expect.poll(async () => (await appState(tab)).status).toContain('photo-final.psd')
      const saved = await appState(tab)
      expect(saved.selected).toEqual(chosen)

      // drawing again after the save adds a step
      await stroke(tab, 40)
      await expect.poll(async () => (await appState(tab)).history).toBe(saved.history + 1)
      expect((await appState(tab)).status).not.toMatch(/not available|no active layer/)
      if (SHOTS) {
        mkdirSync(SHOTS, { recursive: true })
        await tab.screenshot({ path: join(SHOTS, 'photo-after-save-draw.png') })
      }

      // Ctrl+P: Hanpan's print preview, closed with Esc
      await tab.keyboard.press('Control+p')
      const preview = tab.locator('[data-hanpan="image-print-preview"]')
      await expect(preview).toBeVisible({ timeout: 20_000 })
      await tab.keyboard.press('Escape')
      await expect(preview).toHaveCount(0)
      const printed = await appState(tab)
      expect(printed.selected).toEqual(chosen)
      await stroke(tab, 80)
      await expect.poll(async () => (await appState(tab)).history).toBe(printed.history + 1)

      // the recovery copy's export (the same request the 45-second copy makes)
      await inApp(tab, "await api.request('app.exportImage', { format: 'psd' }); return 1")
      const copied = await appState(tab)
      expect(copied.selected).toEqual(chosen)
      await stroke(tab, 120)
      await expect.poll(async () => (await appState(tab)).history).toBe(copied.history + 1)
    } finally {
      await closeAndSaveVideo(launched, 'graphics-photo-layer-kept')
    }
  })

  test('photo: with no layer chosen, the brush asks for one in Korean, not in the engine words', async () => {
    test.skip(!ASKS_FOR_LAYER, 'the web build predates h5 (no hint for a press with no layer)')
    test.setTimeout(180_000)
    const { launched, tab } = await openPhoto('ko', 'graphics-photo-no-layer')
    try {
      // a Move-tool click on the grey pasteboard below the canvas deselects every layer
      await toolKey(tab, 'v', 'Move')
      const box = (await tab.locator('iframe.gx-frame').boundingBox())!
      await tab.mouse.click(box.x + box.width * 0.4, box.y + box.height - 60)
      await expect.poll(async () => (await appState(tab)).selected).toEqual([])

      // the key only: a click with the Move tool would choose the layer under it again
      await toolKey(tab, 'b', 'Brush', false)
      const before = await appState(tab)
      await stroke(tab, 0)
      await expect
        .poll(async () => (await appState(tab)).status)
        .toBe('레이어를 먼저 고르세요. 레이어 패널에서 그릴 레이어를 누르세요.')
      const after = await appState(tab)
      expect(after.history).toBe(before.history)
      expect(after.status).not.toMatch(/not available|no active layer|paint\.stroke/)
      if (SHOTS) {
        mkdirSync(SHOTS, { recursive: true })
        await tab.screenshot({ path: join(SHOTS, 'photo-no-layer-hint.png') })
      }
    } finally {
      await closeAndSaveVideo(launched, 'graphics-photo-no-layer')
    }
  })
})
