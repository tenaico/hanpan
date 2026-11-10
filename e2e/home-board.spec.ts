import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import {
  closeAndSaveVideo,
  launchShell,
  screenshotPath,
  startTrendServer,
  stubAiReady,
  waitForPageWithUrl,
} from './helpers'

/**
 * The 0.19 home board (spec 8, new e2e 1-9): the first-run cards and the
 * offline trend card, a fixed forecast and its link, pinning an app back,
 * moving a card from the keyboard, the 0.18 layout coming over, a 1366×728
 * window, the manual's button and F1, and the head search.
 */

const FORECAST = resolve(__dirname, 'assets/trend-forecast.json')
/** nothing listens on the discard port, so the forecast never arrives */
const DEAD_URL = 'http://127.0.0.1:9/api/forecast'

interface Tab {
  id: string
  kind: string
  title?: string
}
interface TabsOnWindow {
  aiOfficeTabs: {
    list(): Promise<Tab[]>
    activate(id: string): Promise<void>
    close(id: string): Promise<void>
  }
}
const listTabs = (page: Page): Promise<Tab[]> =>
  page.evaluate(() => (window as unknown as TabsOnWindow).aiOfficeTabs.list())

const cardTypes = (page: Page) =>
  page
    .locator('[data-home-board] [data-card]')
    .evaluateAll((cards) => cards.map((c) => c.getAttribute('data-card-type')))

const tileKeys = (page: Page) =>
  page
    .locator('[data-home-board] .quick-card')
    .evaluateAll((tiles) => tiles.map((t) => t.getAttribute('data-new')))

const readSettings = (userDataDir: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(userDataDir, 'app-settings.json'), 'utf8'))

const setWindowSize = (app: ElectronApplication, width: number, height: number) =>
  app.evaluate(
    ({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0]?.setSize(size.width, size.height),
    { width, height },
  )

/** true while the content area scrolls sideways */
const scrollsSideways = (page: Page) =>
  page
    .locator('main.content')
    .evaluate((el) => el.scrollWidth > el.clientWidth || document.body.scrollWidth > innerWidth)

/** all ten fields of the default 5×2 trend card are in sight, none behind a scroll */
const trendFits = (page: Page) =>
  page.locator('.hb-trend-fields').evaluate((el) => el.scrollHeight <= el.clientHeight + 1)

/** no field name and no line of the trend card is cut short with an ellipsis */
const trendWordsWhole = (page: Page) =>
  page.locator('.hb-trend').evaluate((card) => {
    const over = (el: HTMLElement) =>
      el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
    return [...card.querySelectorAll<HTMLElement>('.hb-trend-name, .hb-trend-line')]
      .filter(over)
      .map((el) => (el.classList.contains('hb-trend-line') ? 'line' : el.textContent))
  })

/** the live service's line is about this long; the fixture's is shorter */
const LONG_LINE =
  '반도체·AI 트렌드 Big 5는 맑은 편이고, AI 보안·윤리·주식은 궂은 편입니다. 부동산은 상승 흐름입니다.'

/** the start card's chalkboard fits its two rows: nothing of it is cut off at the bottom */
const startFits = (page: Page) =>
  page
    .locator('[data-card-type="start"] .hb-card-body')
    .evaluate((el) => el.scrollHeight <= el.clientHeight + 1)

const boxesMeet = (a: DOMRectLike, b: DOMRectLike) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
interface DOMRectLike {
  x: number
  y: number
  width: number
  height: number
}

/** while customizing, the start card's tools stay clear of its guide button */
async function expectStartToolsClear(page: Page): Promise<void> {
  await page.locator('[data-home-custom="open"]').click()
  await expect(page.locator('[data-customize-bar]')).toBeVisible()
  const tools = await page.locator('[data-card-type="start"] .hb-card-tools').boundingBox()
  const guide = await page.locator('[data-hanpan="start-guide"]').boundingBox()
  expect(boxesMeet(tools!, guide!)).toBe(false)
  await page.locator('[data-customize="done"]').click()
  // on hover the handle shows over the card: still clear of the button
  await page.locator('[data-card-type="start"] .hp-board-title').hover()
  const handle = await page.locator('[data-card-type="start"] [data-card-handle]').boundingBox()
  expect(
    boxesMeet(handle!, (await page.locator('[data-hanpan="start-guide"]').boundingBox())!),
  ).toBe(false)
}

test('first run shows six cards in order and an offline trend card', async () => {
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'home-board-first-run',
    lang: 'ko',
    env: { HANPAN_TREND_URL: DEAD_URL },
  })
  const { page } = launched
  try {
    await expect(page.locator('[data-home-board]')).toBeVisible()
    await expect
      .poll(() => cardTypes(page))
      .toEqual(['start', 'trend', 'apps', 'recent', 'memo', 'favorites'])
    const offline = page.locator('[data-trend-offline]')
    await expect(offline).toHaveText('인터넷에 연결되면 오늘의 트렌드가 나옵니다')
    // past the first ask (3 s after start) and its 5 s limit: still the board, still the line
    await page.waitForTimeout(9_000)
    await expect(page.locator('[data-home-board]')).toBeVisible()
    await expect(offline).toHaveText('인터넷에 연결되면 오늘의 트렌드가 나옵니다')
    await expect(page.locator('[data-trend-field]')).toHaveCount(0)
  } finally {
    await closeAndSaveVideo(launched, 'home-board-first-run')
  }
})

test('a fixed forecast shows ten fields and opens Trend Radar with UTM', async () => {
  const server = await startTrendServer(await readFile(FORECAST, 'utf8'))
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'home-board-trend',
    lang: 'ko',
    env: { HANPAN_TREND_URL: server.url },
  })
  const { app, page } = launched
  try {
    // the link goes to a recorder, never to the browser
    await app.evaluate(({ shell }) => {
      const g = globalThis as unknown as { openedLinks: string[] }
      g.openedLinks = []
      shell.openExternal = (async (url: string) => {
        g.openedLinks.push(url)
      }) as typeof shell.openExternal
    })
    await setWindowSize(app, 1440, 900)
    // the app asks for the forecast 3 seconds after it starts
    await expect(page.locator('[data-trend-field]')).toHaveCount(10, { timeout: 30_000 })
    await expect(page.locator('[data-trend-nodata]')).toHaveCount(1)
    await expect(page.locator('[data-home-board]')).toHaveAttribute('data-cols', '12')
    await expect(page.locator('[data-card-type="trend"]')).toHaveAttribute('data-size', '5x2')
    expect(await trendFits(page)).toBe(true)
    await page.screenshot({ path: screenshotPath('home-board-1440') })
    await page
      .locator('[data-card-type="trend"]')
      .screenshot({ path: screenshotPath('home-board-trend-card') })

    await page.locator('[data-trend-field="stocks"]').click()
    await expect
      .poll(() =>
        app.evaluate(() => (globalThis as unknown as { openedLinks: string[] }).openedLinks),
      )
      .toEqual([
        'https://trend.tenai.kr/stocks?utm_source=hanpan&utm_medium=home&utm_campaign=forecast',
      ])

    // what the app sends: its version and nothing that names the person
    const version = await app.evaluate(({ app: electronApp }) => electronApp.getVersion())
    const first = server.requests[0]!
    expect(first.url).toBe(`/api/forecast?client=hanpan&v=${version}`)
    expect(first.headers['user-agent']).toBe(`Hanpan/${version}`)
    expect(first.headers.cookie).toBeUndefined()
    expect(first.headers.authorization).toBeUndefined()
    // compare with "보내는 것" in docs/security.md
    console.log(`[home-board] forecast request headers: ${Object.keys(first.headers).join(', ')}`)
  } finally {
    await closeAndSaveVideo(launched, 'home-board-trend')
    await server.close()
  }
})

/** what the stubbed AI answers for the briefing: the JSON the prompt asks for */
const BRIEF_HEADLINE = 'AI와 반도체는 맑고 암호화폐는 비가 옵니다'
const BRIEF_ANSWER = JSON.stringify({
  headline: BRIEF_HEADLINE,
  summary: ['AI 트렌드가 맑습니다', '암호화폐에 비가 옵니다'],
  outlook: ['맑은 흐름이 이어질 수 있습니다'],
  watch: ['환율'],
})

test('the AI briefing writes the forecast into a new Word document (0.19.1)', async () => {
  test.setTimeout(150_000)
  const server = await startTrendServer(await readFile(FORECAST, 'utf8'))
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'home-board-briefing',
    lang: 'ko',
    env: { HANPAN_TREND_URL: server.url },
  })
  const { app, page } = launched
  try {
    await expect(page.locator('[data-trend-field]')).toHaveCount(10, { timeout: 30_000 })
    // a connected AI that never reaches a real program; its one reply is the briefing
    await stubAiReady(app)
    const asked = await app.evaluate(({ ipcMain, webContents }, answer) => {
      const proto = Object.getPrototypeOf(webContents.getAllWebContents()[0]) as {
        send: (channel: string, ...args: unknown[]) => void
      }
      const g = globalThis as unknown as { briefPrompts: unknown[] }
      g.briefPrompts = []
      ipcMain.removeHandler('ai:stream')
      ipcMain.handle('ai:stream', (event, request: { requestId: string }) => {
        g.briefPrompts.push(request)
        const send = (chunk: Record<string, unknown>) =>
          proto.send.call(event.sender, 'ai:stream-chunk', {
            requestId: request.requestId,
            ...chunk,
          })
        send({ type: 'delta', text: answer })
        send({ type: 'done' })
      })
      return true
    }, BRIEF_ANSWER)
    expect(asked).toBe(true)

    const button = page.locator('[data-trend-brief]')
    await expect(button).toHaveText('AI 브리핑')
    await button.click()
    const doc = await waitForPageWithUrl(app, '://docs/')
    await expect
      .poll(async () => (await listTabs(page)).find((t) => t.kind === 'docs')?.title ?? '', {
        timeout: 30_000,
      })
      .toContain('트렌드 브리핑')
    await expect(doc.locator('body')).toContainText(BRIEF_HEADLINE, { timeout: 30_000 })
    await expect(doc.locator('body')).toContainText('투자 권유가 아닙니다')
    // the forecast went to the AI once; nothing new was fetched for it
    const prompts = await app.evaluate(
      () => (globalThis as unknown as { briefPrompts: unknown[] }).briefPrompts.length,
    )
    expect(prompts).toBe(1)
    await doc.screenshot({ path: screenshotPath('home-board-briefing') })

    // the format menu (0.19.2): the briefing as a PDF and as a mind map, each in a tab of its own
    const home = (await listTabs(page)).find((t) => t.kind === 'home')!
    for (const [format, url, kind] of [
      ['pdf', '://pdf/', 'pdf'],
      ['mindmap', '://mindmap/', 'mindmap'],
    ] as const) {
      await page.evaluate(
        (id) => (window as unknown as TabsOnWindow).aiOfficeTabs.activate(id),
        home.id,
      )
      await page.locator('[data-trend-brief-menu]').click()
      await expect(page.locator('[data-trend-brief-format]')).toHaveCount(5)
      if (format === 'pdf') {
        await page
          .locator('[data-card-type="trend"]')
          .screenshot({ path: screenshotPath('home-board-briefing-menu') })
      }
      await page.locator(`[data-trend-brief-format="${format}"]`).click()
      const tab = await waitForPageWithUrl(app, url)
      await expect
        .poll(async () => (await listTabs(page)).find((t) => t.kind === kind)?.title ?? '', {
          timeout: 30_000,
        })
        .toContain('트렌드 브리핑')
      // drawn, not still opening
      await expect(tab.getByText('여는 중')).toHaveCount(0, { timeout: 30_000 })
      await expect(tab.locator('body')).toContainText('트렌드 브리핑', { timeout: 30_000 })
      await tab.screenshot({ path: screenshotPath(`home-board-briefing-${format}`) })
    }
    // the last pick is what a plain click makes next
    await page.evaluate(
      (id) => (window as unknown as TabsOnWindow).aiOfficeTabs.activate(id),
      home.id,
    )
    await expect(page.locator('[data-trend-brief]')).toHaveAttribute('data-tip', /마인드맵/)
  } finally {
    await closeAndSaveVideo(launched, 'home-board-briefing')
    await server.close()
  }
})

test('unpinning AI Photo and pinning it back keeps the order after a restart', async () => {
  const first = await launchShell({ onboardingSeen: true, videoDir: 'home-board-pin', lang: 'ko' })
  const { page, userDataDir } = first
  let order: (string | null)[]
  try {
    await page.locator('[data-home-custom="open"]').click()
    await expect(page.locator('[data-customize-bar]')).toBeVisible()
    await page.screenshot({ path: screenshotPath('home-board-customizing') })
    await page.locator('[data-app-unpin="photo"]').click()
    await expect(page.locator('.quick-card[data-new="photo"]')).toHaveCount(0)
    await page.locator('[data-customize="done"]').click()
    await expect(page.locator('[data-customize-bar]')).toHaveCount(0)

    await page.locator('[data-all-apps-open]').first().click()
    const pin = page.locator('[data-all-apps] [data-app-pin="photo"]')
    await expect(pin).toHaveAttribute('aria-pressed', 'false')
    await pin.click()
    await expect(pin).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-all-apps]')).toHaveCount(0)
    await expect(page.locator('.quick-card').last()).toHaveAttribute('data-new', 'photo')
    order = await tileKeys(page)
    expect(order.filter((key) => key === 'photo')).toHaveLength(1)
  } finally {
    await closeAndSaveVideo(first, 'home-board-pin')
  }

  const second = await launchShell({ userDataDir, videoDir: 'home-board-pin-2', lang: 'ko' })
  try {
    await expect(second.page.locator('[data-home-board]')).toBeVisible()
    await expect.poll(() => tileKeys(second.page)).toEqual(order)
  } finally {
    await closeAndSaveVideo(second, 'home-board-pin-2')
  }
})

test('the list view moves a card with the keyboard', async () => {
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'home-board-list',
    lang: 'ko',
  })
  const { page, userDataDir } = launched
  try {
    await expect
      .poll(() => cardTypes(page))
      .toEqual(['start', 'apps', 'recent', 'memo', 'favorites'])
    await page.locator('[data-home-custom="open"]').click()
    await page.locator('[data-customize="list"]').click()
    const panel = page.locator('[data-home-custom="panel"]')
    await expect(panel).toBeVisible()
    await panel.locator('[data-custom-board="start"] [data-move="down"]').focus()
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await cardTypes(page))[0]).not.toBe('start')

    // Tab stays inside the dialog
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(
        () => !!document.activeElement?.closest('[data-home-custom="panel"]'),
      )
      expect(inside, `focus after Tab #${i + 1}`).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)

    const shown = await page
      .locator('[data-home-board] [data-card]')
      .evaluateAll((cards) => cards.map((c) => c.getAttribute('data-card')))
    await expect
      .poll(() => {
        const board = readSettings(userDataDir).homeBoard as { cards?: { id: string }[] }
        return (board?.cards ?? []).map((c) => c.id)
      })
      .toEqual(shown)
  } finally {
    await closeAndSaveVideo(launched, 'home-board-list')
  }
})

test('a 0.18 homeLayout comes over with its widgets and memo', async () => {
  const LEGACY = {
    widgets: [
      { id: 'memo', type: 'memo', size: 'wide', title: '', text: '분기 보고 마감 11/14' },
      { id: 'recent', type: 'recent', size: 'small', title: '' },
      { id: 'clock-a1', type: 'clock', size: 'small', title: '' },
      { id: 'favorites', type: 'favorites', size: 'small', title: '' },
    ],
    cardOrder: ['pptx', 'xmind', 'hwp', 'templates'],
    hiddenCards: ['html'],
    pinnedApps: ['md'],
  }
  const launched = await launchShell({
    onboardingSeen: true,
    settings: { homeLayout: LEGACY },
    videoDir: 'home-board-legacy',
    lang: 'ko',
  })
  const { page, userDataDir } = launched
  try {
    await expect
      .poll(() => cardTypes(page))
      .toEqual(['start', 'apps', 'memo', 'recent', 'clock', 'favorites'])
    const memo = page.locator('[data-card-type="memo"]')
    await expect(memo).toHaveAttribute('data-size', '6x2')
    await expect(memo.locator('textarea')).toHaveValue('분기 보고 마감 11/14')
    expect(await tileKeys(page)).toEqual([
      'pptx',
      'xmind',
      'hwp',
      'templates',
      'docx',
      'xlsx',
      'design',
      'pdf',
      'photo',
      'illust',
      'md',
    ])
    await expect.poll(() => readSettings(userDataDir).homeBoard !== undefined).toBe(true)
  } finally {
    await closeAndSaveVideo(launched, 'home-board-legacy')
  }
  // the 0.18 layout stays as it was, for a step back to 0.18
  const settings = readSettings(userDataDir)
  expect(settings.homeLayout).toEqual(LEGACY)
  expect(settings.homeBoard).toBeTruthy()
})

test('fits a 1366×728 window without horizontal scrolling', async () => {
  test.setTimeout(150_000)
  const docs = realpathSync(mkdtempSync(join(tmpdir(), 'hanpan-e2e-board-')))
  const report = join(docs, '주간 업무 보고.md')
  writeFileSync(report, '# 주간 업무 보고\n\n- 시설 점검\n')
  const forecast = JSON.parse(await readFile(FORECAST, 'utf8')) as { line: string }
  const server = await startTrendServer(JSON.stringify({ ...forecast, line: LONG_LINE }))
  try {
    const launched = await launchShell({
      onboardingSeen: true,
      videoDir: 'home-board-1366',
      lang: 'ko',
      env: { HANPAN_TREND_URL: server.url },
    })
    const { app, page } = launched
    try {
      // one recent document, so the Continue card has a first row
      await page.evaluate(
        (path) =>
          (
            window as unknown as { aiOffice: { openPath(p: string): Promise<void> } }
          ).aiOffice.openPath(path),
        report,
      )
      await waitForPageWithUrl(app, '://markdown/')
      await expect
        .poll(async () => (await listTabs(page)).some((t) => t.kind === 'markdown'))
        .toBe(true)
      const home = (await listTabs(page)).find((t) => t.kind === 'home')!
      await page.evaluate(
        (id) => (window as unknown as TabsOnWindow).aiOfficeTabs.activate(id),
        home.id,
      )
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await expect(page.locator('[data-recent-file]').first()).toBeVisible({ timeout: 15_000 })
      await expect(page.locator('[data-trend-field]')).toHaveCount(10, { timeout: 30_000 })

      await setWindowSize(app, 1366, 728)
      const board = page.locator('[data-home-board]')
      await expect(board).toHaveAttribute('data-cols', '12')
      await page.waitForTimeout(300)
      const start = await page.locator('[data-card-type="start"]').boundingBox()
      const trend = await page.locator('[data-card-type="trend"]').boundingBox()
      expect(Math.abs(start!.y - trend!.y)).toBeLessThanOrEqual(1)
      const firstRow = await page.locator('[data-recent-file]').first().boundingBox()
      const innerHeight = await page.evaluate(() => window.innerHeight)
      expect(firstRow!.y + firstRow!.height).toBeLessThanOrEqual(innerHeight)
      expect(await scrollsSideways(page)).toBe(false)
      const widths = await page
        .locator('[data-home-board] .quick-card')
        .evaluateAll((tiles) => tiles.map((t) => t.getBoundingClientRect().width))
      expect(widths.length).toBeGreaterThan(0)
      for (const width of widths) expect(width).toBeLessThanOrEqual(160)
      expect(await startFits(page)).toBe(true)
      expect(await trendFits(page)).toBe(true)
      expect(await trendWordsWhole(page)).toEqual([])
      await page.screenshot({ path: screenshotPath('home-board-1366') })
      await expectStartToolsClear(page)

      // a 1280 window keeps twelve columns: the trend card is narrower but still two columns
      await setWindowSize(app, 1280, 728)
      await expect(board).toHaveAttribute('data-cols', '12')
      await page.waitForTimeout(300)
      expect(await trendFits(page)).toBe(true)
      expect(await trendWordsWhole(page)).toEqual([])
      await page.screenshot({ path: screenshotPath('home-board-1280') })

      await setWindowSize(app, 900, 700)
      await expect(board).not.toHaveAttribute('data-cols', '12')
      await page.waitForTimeout(300)
      expect(await scrollsSideways(page)).toBe(false)
      expect(await startFits(page)).toBe(true)
      // narrowed, the apps come before the trend card so they stay near the top
      const apps = await page.locator('[data-card-type="apps"]').boundingBox()
      const narrowTrend = await page.locator('[data-card-type="trend"]').boundingBox()
      expect(apps!.y).toBeLessThan(narrowTrend!.y)
      await page.screenshot({ path: screenshotPath('home-board-900') })
    } finally {
      await closeAndSaveVideo(launched, 'home-board-1366')
    }

    // a longer button label (Vietnamese) still keeps the start box and its button on one line
    const vi = await launchShell({
      onboardingSeen: true,
      videoDir: 'home-board-1366-vi',
      lang: 'vi',
    })
    try {
      await setWindowSize(vi.app, 1366, 728)
      await expect(vi.page.locator('[data-home-board]')).toHaveAttribute('data-cols', '12')
      await vi.page.waitForTimeout(300)
      const topic = await vi.page.locator('[data-hanpan="start-topic"]').boundingBox()
      const go = await vi.page.locator('[data-hanpan="start-go"]').boundingBox()
      expect(Math.abs(topic!.y - go!.y)).toBeLessThanOrEqual(1)
      expect(await scrollsSideways(vi.page)).toBe(false)
      expect(await startFits(vi.page)).toBe(true)
      await expectStartToolsClear(vi.page)
      await vi.page.screenshot({ path: screenshotPath('home-board-1366-vi') })
    } finally {
      await closeAndSaveVideo(vi, 'home-board-1366-vi')
    }
  } finally {
    await server.close()
    rmSync(docs, { recursive: true, force: true })
  }
})

test('the guide button and F1 open the manual', async () => {
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'home-board-guide',
    lang: 'ko',
  })
  const { app, page } = launched
  const helpTab = async () => (await listTabs(page)).find((t) => t.kind === 'help')
  try {
    const guide = page.locator('[data-hanpan="start-guide"]')
    await expect(guide.locator('kbd')).toHaveText('F1')
    await guide.click()
    await expect.poll(async () => !!(await helpTab())).toBe(true)
    const opened = (await helpTab())!
    await page.evaluate(
      (id) => (window as unknown as TabsOnWindow).aiOfficeTabs.close(id),
      opened.id,
    )
    await expect.poll(async () => !!(await helpTab())).toBe(false)

    // F1 is a menu accelerator: a key sent through CDP never reaches the menu,
    // so press the menu item itself (as the manual tour does)
    await app.evaluate(({ Menu }) => {
      const find = (items: Electron.MenuItem[]): Electron.MenuItem | undefined => {
        for (const item of items) {
          if (item.accelerator === 'F1') return item
          const inner = item.submenu ? find(item.submenu.items) : undefined
          if (inner) return inner
        }
        return undefined
      }
      find(Menu.getApplicationMenu()?.items ?? [])?.click()
    })
    await expect.poll(async () => !!(await helpTab())).toBe(true)
  } finally {
    await closeAndSaveVideo(launched, 'home-board-guide')
  }
})

test('the head search replaces the board and Esc brings it back', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hanpan-e2e-board-search-')))
  writeFileSync(join(root, 'meeting-notes.md'), '# Notes\n\nDiscussed the annual budget review.\n')
  const launched = await launchShell({
    onboardingSeen: true,
    settings: { defaultSaveDir: root },
    videoDir: 'home-board-search',
    lang: 'ko',
  })
  const { page } = launched
  try {
    await expect(page.locator('[data-home-board]')).toBeVisible()
    const box = page.locator('[data-board-head] .file-search input')
    await box.fill('meeting')
    await expect(page.locator('.search-row')).toHaveCount(1, { timeout: 30_000 })
    await expect(page.locator('[data-home-board]')).toHaveCount(0)
    await box.press('Escape')
    await expect(page.locator('[data-home-board]')).toBeVisible()
    await expect(page.locator('.search-results')).toHaveCount(0)
  } finally {
    await closeAndSaveVideo(launched, 'home-board-search')
    rmSync(root, { recursive: true, force: true })
  }
})
