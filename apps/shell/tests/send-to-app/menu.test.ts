/**
 * 다른 앱으로 보내기 메뉴: ☰ 메뉴와 탭 오른쪽 클릭 메뉴에서 "공유하기…" 바로 아래에 놓이는
 * 하위 메뉴. 대상은 편집기 이름(기존 메뉴 문구)이고, 끝에 "마크다운으로 먼저 고치기"가 있다.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { MenuItemConstructorOptions } from 'electron'
import { sendToAppMenuItem } from '../../src/main/send-to-app/menu'
import { SEND_LABELS, sendLabel } from '../../src/main/send-to-app/labels'
import { tabMenuTemplate, type TabMenuActions } from '../../src/main/tab-menu'
import { tm } from '../helpers/main-menu-strings'

const TARGET_NAMES = {
  docs: 'AI 워드',
  slides: 'AI 파워포인트',
  hwp: 'AI 한글',
  markdown: 'AI 마크다운',
  mindmap: '마인드맵',
  html: 'AI 웹 문서',
}

const submenu = (item: MenuItemConstructorOptions | null): MenuItemConstructorOptions[] =>
  (item?.submenu ?? []) as MenuItemConstructorOptions[]
const click = (item: MenuItemConstructorOptions | undefined): void =>
  (item!.click as unknown as () => void)()

describe('the send-to-app submenu', () => {
  it('lists the other editors, then the Markdown-first entry', () => {
    const send = vi.fn()
    const item = sendToAppMenuItem({
      kind: 'docs',
      korean: true,
      lang: 'ko',
      targetName: (t) => TARGET_NAMES[t],
      send,
    })
    expect(item?.label).toBe('다른 앱으로 보내기')
    const labels = submenu(item).map((i) => i.label ?? i.type)
    expect(labels).toEqual([
      'AI 파워포인트',
      'AI 한글',
      '마인드맵',
      'AI 웹 문서',
      'separator',
      '마크다운으로 먼저 보고 고치기',
    ])
    click(submenu(item)[0])
    expect(send).toHaveBeenCalledWith('slides')
    click(submenu(item).at(-1))
    expect(send).toHaveBeenLastCalledWith('markdown')
  })

  it('leaves AI 한글 out without the Korean document features', () => {
    const item = sendToAppMenuItem({
      kind: 'sheets',
      korean: false,
      lang: 'en',
      targetName: (t) => TARGET_NAMES[t],
      send: vi.fn(),
    })
    expect(item?.label).toBe('Send to another app')
    expect(submenu(item).map((i) => i.label)).not.toContain('AI 한글')
    expect(submenu(item).map((i) => i.label)).toContain('AI 워드')
  })

  it('from a Markdown tab there is no Markdown-first entry', () => {
    const item = sendToAppMenuItem({
      kind: 'markdown',
      korean: true,
      lang: 'ko',
      targetName: (t) => TARGET_NAMES[t],
      send: vi.fn(),
    })
    expect(submenu(item).some((i) => i.type === 'separator')).toBe(false)
    expect(submenu(item).map((i) => i.label)).not.toContain('AI 마크다운')
  })

  it('is absent for Home, help and picture tabs, and off while disabled', () => {
    for (const kind of ['home', 'help', 'photo'] as const) {
      expect(
        sendToAppMenuItem({ kind, korean: true, lang: 'ko', targetName: () => '', send: vi.fn() }),
      ).toBeNull()
    }
    const off = sendToAppMenuItem({
      kind: 'docs',
      korean: true,
      lang: 'ko',
      targetName: () => 'x',
      send: vi.fn(),
      enabled: false,
    })
    expect(off?.enabled).toBe(false)
  })

  it('has every string in all 21 languages', () => {
    const langs = Object.keys(SEND_LABELS)
    expect(langs).toHaveLength(21)
    const keys = Object.keys(SEND_LABELS.ko!)
    for (const lang of langs)
      expect(Object.keys(SEND_LABELS[lang]!).sort()).toEqual([...keys].sort())
    expect(sendLabel('zh_TW', 'menuSendToApp')).toBe(SEND_LABELS['zh-tw']!.menuSendToApp)
    expect(sendLabel('xx', 'menuSendToApp')).toBe('Send to another app')
  })
})

describe('the tab context menu', () => {
  const actions = Object.fromEntries(
    [
      'save',
      'saveAs',
      'print',
      'openInNewWindow',
      'splitBeside',
      'rename',
      'duplicate',
      'copyText',
      'reveal',
      'openDefault',
      'move',
      'closeTabs',
      'reopenClosed',
      'share',
      'saveMyForm',
    ].map((name) => [name, vi.fn()]),
  ) as unknown as TabMenuActions

  it('puts the submenu right below Share…', () => {
    const tab = { id: 'a', kind: 'docs' as const, title: 'a', closable: true, active: true }
    const sendTo = { id: 'sendToApp', label: 'Send to another app', submenu: [] }
    const raw = tabMenuTemplate({
      tab,
      tabs: [{ ...tab, id: 'home', kind: 'home', closable: false }, tab],
      canDetach: true,
      fileExists: true,
      canReopen: false,
      canShare: true,
      tm,
      actions,
      sendTo,
    })
    const ids = raw.map((i) => i.id)
    expect(ids.indexOf('sendToApp')).toBe(ids.indexOf('share') + 1)
  })

  it('is wired into both shell menus next to Share', () => {
    const source = readFileSync(new URL('../../src/main/index.ts', import.meta.url), 'utf8')
    // the tab menu passes the item, the ☰ menu pushes it after its Share entry
    expect(source).toMatch(/tabMenuTemplate\(\{[\s\S]*?sendTo: sendToAppItemFor\(/)
    expect(source).toMatch(/label: tm\('menuTabShare'\)[\s\S]{0,400}sendToAppItemFor\(front/)
  })
})
