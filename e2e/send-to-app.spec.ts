/**
 * 다른 앱으로 보내기(결정 0096): 실제 파일을 열고 탭 오른쪽 클릭 메뉴의 "다른 앱으로 보내기"로
 * 워드 → 파워포인트, 마인드맵 → 워드, 엑셀 → 워드를 보낸다. 새 탭이 대상 편집기의 제목 없는
 * 문서로 열리고 내용이 옮겨 오는지, 원본 파일이 그대로인지 본다. AI는 부르지 않는다.
 */
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { copyFile, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'
import type { TabsApi, TabSummary } from '../apps/shell/src/shared/tabs-api'

const ASSETS = resolve(__dirname, 'assets/send-to-app')

type MenuGlobal = typeof globalThis & { __sendMenu?: Electron.Menu }

async function tabs(home: Page): Promise<TabSummary[]> {
  return home.evaluate(() => (window as unknown as { aiOfficeTabs: TabsApi }).aiOfficeTabs.list())
}

/** the tab's right-click menu, caught instead of shown; returns the submenu's labels */
async function openTabMenu(app: ElectronApplication, home: Page, tabId: string): Promise<string[]> {
  await app.evaluate(({ Menu }) => {
    Menu.prototype.popup = function () {
      ;(globalThis as MenuGlobal).__sendMenu = this
    }
  })
  await home.evaluate(
    (id) => (window as unknown as { aiOfficeTabs: TabsApi }).aiOfficeTabs.showTabMenu(id, 20, 20),
    tabId,
  )
  return app.evaluate(() => {
    const item = (globalThis as MenuGlobal).__sendMenu!.getMenuItemById('sendToApp')
    return (item?.submenu?.items ?? []).map((i) => (i.type === 'separator' ? '—' : i.label))
  })
}

async function clickMenuItem(app: ElectronApplication, id: string): Promise<void> {
  await app.evaluate(({ BrowserWindow }, itemId) => {
    const item = (globalThis as MenuGlobal).__sendMenu!.getMenuItemById(itemId)!
    item.click(undefined as never, BrowserWindow.getAllWindows()[0]!, undefined as never)
  }, id)
}

/** a page of `urlPart` that was not open before */
async function newPage(app: ElectronApplication, urlPart: string, before: Page[]): Promise<Page> {
  const deadline = Date.now() + 30_000
  for (;;) {
    for (const candidate of app.windows()) {
      if (before.includes(candidate)) continue
      const href = await candidate.evaluate(() => window.location.href).catch(() => '')
      if (href.includes(urlPart)) return candidate
    }
    if (Date.now() > deadline) throw new Error(`no new ${urlPart} page`)
    await app.waitForEvent('window', { timeout: 1_000 }).catch(() => {})
  }
}

test('다른 앱으로 보내기: 워드 → 파워포인트, 마인드맵 → 워드, 엑셀 → 워드, 워드 → 마크다운', async () => {
  test.setTimeout(240_000)
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-send-'))
  const docx = join(dir, '사업계획 보고서.docx')
  const xlsx = join(dir, '지점 실적.xlsx')
  const xmind = join(dir, '서비스 기획.xmind')
  await copyFile(join(ASSETS, 'report.docx'), docx)
  await copyFile(join(ASSETS, 'sales.xlsx'), xlsx)
  await copyFile(join(ASSETS, 'plan.xmind'), xmind)
  const originals = await Promise.all([docx, xlsx, xmind].map((p) => readFile(p)))

  const launched = await launchShell({
    lang: 'ko',
    onboardingSeen: true,
    openFiles: [docx, xlsx, xmind],
    videoDir: 'send-to-app',
    recordVideo: false,
  })
  const { app } = launched
  try {
    const home = await waitForPageWithUrl(app, 'shell/out')
    await waitForPageWithUrl(app, '://docs/', 60_000)
    await expect.poll(async () => (await tabs(home)).length, { timeout: 60_000 }).toBe(4)
    const byKind = async (kind: string) => (await tabs(home)).find((t) => t.kind === kind)!

    // 1. 워드 → 파워포인트
    const word = await byKind('docs')
    const labels = await openTabMenu(app, home, word.id)
    expect(labels).toEqual([
      'AI 파워포인트',
      'AI 한글',
      '마인드맵',
      'AI 웹 문서',
      '—',
      '마크다운으로 먼저 보고 고치기',
    ])
    let before = app.windows()
    await clickMenuItem(app, 'sendToApp:slides')
    const deck = await newPage(app, '://slides/', before)
    // the slides are drawn on a canvas: the deck has the title slide and one per section
    await expect(deck.locator('body')).toContainText('1/4', { timeout: 30_000 })
    await expect
      .poll(async () => (await tabs(home)).filter((t) => t.kind === 'slides').map((t) => t.title))
      .toContain('사업계획 보고서')
    await deck.screenshot({ path: screenshotPath('send-to-app-word-to-slides') })
    await deck.keyboard.press('PageDown')
    await expect(deck.locator('body')).toContainText('2/4')
    await deck.screenshot({ path: screenshotPath('send-to-app-word-to-slides-2') })

    // 2. 마인드맵 → 워드
    const map = await byKind('mindmap')
    await openTabMenu(app, home, map.id)
    before = app.windows()
    await clickMenuItem(app, 'sendToApp:docs')
    const mapDoc = await newPage(app, '://docs/', before)
    await expect(mapDoc.locator('body')).toContainText('재방문율 40%', { timeout: 30_000 })
    await expect(mapDoc.locator('body')).toContainText('지자체 담당자')
    await mapDoc.screenshot({ path: screenshotPath('send-to-app-map-to-word') })

    // 3. 엑셀 → 워드: 보고 있던 시트(지점별 실적)가 표로
    const sheet = await byKind('sheets')
    await openTabMenu(app, home, sheet.id)
    before = app.windows()
    await clickMenuItem(app, 'sendToApp:docs')
    const sheetDoc = await newPage(app, '://docs/', before)
    await expect(sheetDoc.locator('body')).toContainText('이지은', { timeout: 30_000 })
    await expect(sheetDoc.locator('table').first()).toContainText('지점')
    await sheetDoc.screenshot({ path: screenshotPath('send-to-app-sheet-to-word') })

    // 4. 마크다운으로 먼저 보고 고치기: the intermediate text in AI 마크다운
    await openTabMenu(app, home, word.id)
    before = app.windows()
    await clickMenuItem(app, 'sendToApp:markdown')
    const md = await newPage(app, '://markdown/', before)
    await expect(md.locator('.doc-editor h1')).toHaveText('2027 사업 계획 보고', {
      timeout: 30_000,
    })
    await expect(md.locator('.doc-editor table')).toContainText('인건비')
    await md.screenshot({ path: screenshotPath('send-to-app-word-to-markdown') })

    // the sources were only read
    const after = await Promise.all([docx, xlsx, xmind].map((p) => readFile(p)))
    after.forEach((bytes, i) => expect(bytes.equals(originals[i]!)).toBe(true))
  } finally {
    await closeAndSaveVideo(launched, 'send-to-app')
  }
})
