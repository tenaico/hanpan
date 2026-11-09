import { mkdirSync } from 'node:fs'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { createXmindDocumentFromOutline } from '@genoffice/xmind-engine'
import { closeAndSaveVideo, launchShell, startTrendServer, waitForPageWithUrl } from './helpers'

/**
 * Hanpan's user manual pictures, taken from the real app in Korean: the same
 * tour the manual (docs/manual/한판-사용설명서.md) walks through. Each picture is
 * the whole window (tab strip and editor), saved to docs/manual/images.
 */

const IMAGES = resolve(__dirname, '../docs/manual/images')

interface Tab {
  id: string
  kind: string
  title: string
}
const listTabs = (page: Page): Promise<Tab[]> =>
  page.evaluate(() =>
    (window as unknown as { aiOfficeTabs: { list(): Promise<Tab[]> } }).aiOfficeTabs.list(),
  )
const activate = (page: Page, id: string) =>
  page.evaluate(
    (tab) =>
      (
        window as unknown as { aiOfficeTabs: { activate(id: string): Promise<void> } }
      ).aiOfficeTabs.activate(tab),
    id,
  )

/** One page (Home, an editor tab, the design window) as the person sees it. */
async function shot(target: Page, name: string): Promise<void> {
  await target.screenshot({ path: join(IMAGES, `${name}.png`) })
}

/** The page of the help tab: the one that shows the manual's topic list. */
async function helpPage(app: ElectronApplication): Promise<Page> {
  for (let i = 0; i < 40; i++) {
    for (const candidate of app.windows()) {
      if (
        await candidate
          .locator('.help-topic')
          .count()
          .catch(() => 0)
      )
        return candidate
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('no help page')
}

/**
 * The sidebar's account row reads the Claude and Codex programs of the machine
 * taking the pictures, so a signed-in developer's plan would end up in the
 * committed figures. Answer "not installed" for both, stop the real checker's
 * pushes, and tell the window, so the row reads the same on every machine.
 */
async function hideAiAccount(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ ipcMain, webContents }) => {
    const proto = Object.getPrototypeOf(webContents.getAllWebContents()[0]) as {
      send: (channel: string, ...args: unknown[]) => void
    }
    const realSend = proto.send
    proto.send = function (this: unknown, channel: string, ...args: unknown[]) {
      if (channel === 'ai:subscription-changed') return
      return realSend.call(this, channel, ...args)
    }
    const statuses = {
      'claude-code': { provider: 'claude-code', state: 'not-installed', meteredAccepted: false },
      codex: { provider: 'codex', state: 'not-installed', meteredAccepted: false },
    }
    for (const channel of ['ai:subscription-statuses', 'ai:subscription-recheck']) {
      ipcMain.removeHandler(channel)
      ipcMain.handle(channel, () => statuses)
    }
    for (const wc of webContents.getAllWebContents()) {
      if (!wc.isDestroyed()) realSend.call(wc, 'ai:subscription-changed', statuses)
    }
  })
}

const OUTLINE =
  '# 보고\n\n- 2026년 AI 연수 계획\n  - 추진 배경\n    - 교원 AI 활용 수요 증가\n    - 업무 경감 필요\n  - 추진 내용\n    - 기초 연수 (3월)\n    - 심화 연수 (5월)\n  - 기대 효과\n'

test('the manual tour, in Korean', async () => {
  test.setTimeout(300_000)
  mkdirSync(IMAGES, { recursive: true })
  // a fixed forecast, so the trend card in the pictures does not change from day to day
  const server = await startTrendServer(
    await readFile(resolve(__dirname, 'assets/trend-forecast.json'), 'utf8'),
  )
  try {
    await tour(server.url)
  } finally {
    await server.close()
  }
})

async function tour(trendUrl: string): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-tour-'))
  const mapPath = join(dir, 'AI 연수 계획.xmind')
  await writeFile(
    mapPath,
    await (await createXmindDocumentFromOutline(OUTLINE, { untitled: '제목 없음' })).save(),
  )

  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'hanpan-tour',
    lang: 'ko',
    env: { HANPAN_TREND_URL: trendUrl },
  })
  const { app, page } = launched
  try {
    await hideAiAccount(app)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(1440, 900))
    // the app asks for the forecast 3 seconds after it starts
    await expect(page.locator('[data-trend-field]')).toHaveCount(10, { timeout: 30_000 })
    await page.waitForTimeout(1500)
    await shot(page, '01-home')

    // the map and its send menu
    await page.evaluate(
      (path) =>
        (
          window as unknown as { aiOffice: { openPath(p: string): Promise<void> } }
        ).aiOffice.openPath(path),
      mapPath,
    )
    const map = await waitForPageWithUrl(app, '://mindmap/')
    await expect(map.locator('[data-action="send-to"]')).toBeVisible({ timeout: 30_000 })
    await map.waitForTimeout(1500)
    await map.locator('[data-action="send-to"]').click()
    await shot(map, '02-send-menu')
    await map.locator('[data-send="hwp"]').click()
    await map.locator('[data-dialog="hanpan-send"] input').nth(1).fill('교육연구부')
    await shot(map, '03-send-dialog')
    await map.locator('[data-action="send-go"]').click()
    await expect.poll(async () => (await listTabs(page)).some((t) => t.kind === 'hwp')).toBe(true)
    const hwp = await waitForPageWithUrl(app, '://hwp/')
    await hwp.waitForTimeout(6000)
    await shot(hwp, '04-hwp-report')

    // a change on the map, synced into the report
    const mapTab = (await listTabs(page)).find((t) => t.kind === 'mindmap')!
    await activate(page, mapTab.id)
    await map
      .locator('.mm-sheet-host:not([hidden]) me-tpc', { hasText: '업무 경감 필요' })
      .dblclick({ delay: 50 })
    await map.waitForSelector('#input-box')
    await map.keyboard.press('Control+A')
    await map.keyboard.type('교원 업무 경감 필요')
    await map.keyboard.press('Enter')
    await map.locator('[data-action="send-to"]').click()
    await map.locator('[data-send="sync"]').click()
    await expect(map.locator('.hp-sync-link').first()).toContainText('교원 업무 경감 필요', {
      timeout: 30_000,
    })
    await shot(map, '05-sync')
    await map.locator('[data-action="sync-apply"]').first().click()
    await expect(map.locator('.hp-sync-link [role="status"]').first()).toBeVisible({
      timeout: 30_000,
    })
    await map.locator('[data-action="sync-close"]').click()

    // the tools on the report
    const hwpTab = (await listTabs(page)).find((t) => t.kind === 'hwp')!
    await activate(page, hwpTab.id)
    await hwp.waitForTimeout(3000)
    await hwp.locator('[data-action="hanpan-tools"]').click()
    await hwp.locator('[data-tool="review"]').click()
    await expect(hwp.locator('.hp-tools-result')).toBeVisible({ timeout: 30_000 })
    await hwp.waitForTimeout(2500)
    await shot(hwp, '06-hwp-tools')
    await hwp.locator('[data-action="hanpan-tools"]').click()

    // templates from Home
    const home = (await listTabs(page)).find((t) => t.kind === 'home')!
    await activate(page, home.id)
    await page.locator('[data-hanpan="templates"]').click()
    await expect(page.locator('.hp-tpl-card')).toHaveCount(22)
    await shot(page, '07-templates')
    await page.locator('.hp-tpl-close').click()

    // the design board
    await page.locator('[data-hanpan="design"]').click()
    const board = await waitForPageWithUrl(app, 'design.html')
    await expect(board.locator('.dz-stage .dz-page')).toBeVisible({ timeout: 30_000 })
    await board.locator('[data-tab="templates"]').click()
    await board.locator('[data-template="seminar-invite"]').click()
    // a title picked: its handles on the page and its settings on the right
    await board.locator('.dz-stage [data-element="text"]').nth(1).click()
    await board.waitForTimeout(800)
    await shot(board, '08-design')
    await board.close()

    // the manual itself: Help › User guide (F1)
    await app.evaluate(({ Menu }) => {
      const find = (items: Electron.MenuItem[]): Electron.MenuItem | undefined => {
        for (const item of items) {
          if (item.accelerator === 'F1') return item
          const inner = item.submenu ? find(item.submenu.items) : undefined
          if (inner) return inner
        }
        return undefined
      }
      const item = find(Menu.getApplicationMenu()?.items ?? [])
      item?.click()
    })
    await expect.poll(async () => (await listTabs(page)).some((t) => t.kind === 'help')).toBe(true)
    const help = await helpPage(app)
    await help.waitForTimeout(1500)
    await shot(help, '09-help')
  } finally {
    await closeAndSaveVideo(launched, 'hanpan-tour')
  }
}
