import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import {
  handleTabShortcut,
  tabShortcutOf,
  type TabShortcutHost,
  type TabShortcutInput,
} from '../src/main/tab-shortcuts'

function key(overrides: Partial<TabShortcutInput> = {}): TabShortcutInput {
  return {
    type: 'keyDown',
    key: 'Tab',
    control: false,
    meta: false,
    alt: false,
    shift: false,
    ...overrides,
  }
}

describe('tab keyboard shortcuts', () => {
  it('cycles with Ctrl+Tab on every platform (⌘Tab is the OS app switcher)', () => {
    expect(tabShortcutOf(key({ control: true }), 'win32')).toBe('next')
    expect(tabShortcutOf(key({ control: true }), 'darwin')).toBe('next')
    expect(tabShortcutOf(key({ control: true, shift: true }), 'linux')).toBe('previous')
  })

  it('leaves the window and app switchers alone', () => {
    expect(tabShortcutOf(key({ alt: true }))).toBeNull()
    expect(tabShortcutOf(key({ meta: true }), 'darwin')).toBeNull()
    expect(tabShortcutOf(key({ control: true, meta: true }), 'darwin')).toBeNull()
    expect(tabShortcutOf(key())).toBeNull()
  })

  it('closes with the platform chord only', () => {
    expect(tabShortcutOf(key({ key: 'w', control: true }), 'win32')).toBe('close')
    expect(tabShortcutOf(key({ key: 'w', control: true }), 'linux')).toBe('close')
    expect(tabShortcutOf(key({ key: 'w', meta: true }), 'darwin')).toBe('close')
    // Ctrl+W is delete-word in a macOS text field, not a tab command
    expect(tabShortcutOf(key({ key: 'w', control: true }), 'darwin')).toBeNull()
    expect(tabShortcutOf(key({ key: 'w', meta: true }), 'win32')).toBeNull()
  })

  it('does not take Ctrl+Shift+W (close window) or repeat/up events', () => {
    expect(tabShortcutOf(key({ key: 'w', control: true, shift: true }), 'win32')).toBeNull()
    expect(tabShortcutOf(key({ control: true, type: 'keyUp' }))).toBeNull()
    expect(tabShortcutOf(key({ key: 'a', control: true }))).toBeNull()
  })

  it('is wired into the shell window and every tab view', () => {
    const source = readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')
    expect(source).toContain("contents.on('before-input-event'")
    expect(source).toContain('handleTabShortcut(input')
    expect(source).toContain('manager.cycleTab(direction)')
    // registered before the shell window exists, so its webContents is covered
    expect(source.indexOf('installTabShortcuts()')).toBeLessThan(
      source.indexOf('  createShellWindow()'),
    )
  })
})

function host(overrides: Partial<TabShortcutHost> = {}): TabShortcutHost {
  return {
    isShellContents: () => true,
    hasTab: () => false,
    activeKind: () => 'docs',
    cycle: vi.fn(),
    closeActive: vi.fn(),
    openSettings: vi.fn(),
    ...overrides,
  }
}

describe('handling a tab shortcut', () => {
  it('cycles only for the shell strip or one of its tab views', () => {
    const shell = host()
    expect(handleTabShortcut(key({ control: true }), 1, shell)).toBe(true)
    expect(shell.cycle).toHaveBeenCalledWith(1)

    const tab = host({ isShellContents: () => false, hasTab: (id) => id === 7 })
    expect(handleTabShortcut(key({ control: true, shift: true }), 7, tab)).toBe(true)
    expect(tab.cycle).toHaveBeenCalledWith(-1)

    const detached = host({ isShellContents: () => false, hasTab: () => false })
    expect(handleTabShortcut(key({ control: true }), 9, detached)).toBe(false)
    expect(detached.cycle).not.toHaveBeenCalled()
  })

  it('closes the active document tab but leaves Home to its window-close menu', () => {
    const document = host()
    expect(handleTabShortcut(key({ key: 'w', control: true }), 1, document)).toBe(true)
    expect(document.closeActive).toHaveBeenCalledTimes(1)

    const home = host({ activeKind: () => 'home' })
    expect(handleTabShortcut(key({ key: 'w', control: true }), 1, home)).toBe(false)
    expect(home.closeActive).not.toHaveBeenCalled()
  })

  // 0.17 리뷰 #5: Ctrl+, (macOS ⌘,)로 설정을 연다. 워드는 Ctrl+,를 아래 첨자로 쓰므로
  // 문서 탭 안에서 누른 키는 그 편집기에 남긴다.
  it('opens Settings with Ctrl+, from Home or the tab strip, never from inside an editor', () => {
    expect(tabShortcutOf(key({ key: ',', control: true }), 'win32')).toBe('settings')
    expect(tabShortcutOf(key({ key: ',', meta: true }), 'darwin')).toBe('settings')
    expect(tabShortcutOf(key({ key: ',', control: true, shift: true }), 'win32')).toBeNull()

    const shell = host({ activeKind: () => 'home' })
    expect(handleTabShortcut(key({ key: ',', control: true }), 1, shell)).toBe(true)
    expect(shell.openSettings).toHaveBeenCalledTimes(1)

    const editor = host({ isShellContents: () => false, hasTab: () => true })
    expect(handleTabShortcut(key({ key: ',', control: true }), 7, editor)).toBe(false)
    expect(editor.openSettings).not.toHaveBeenCalled()
  })

  it('reports nothing for a key it does not own', () => {
    const shell = host()
    expect(handleTabShortcut(key({ key: 'a', control: true }), 1, shell)).toBe(false)
    expect(shell.cycle).not.toHaveBeenCalled()
    expect(shell.closeActive).not.toHaveBeenCalled()
  })
})

describe('closing from Home (0.17 review v2 shell #3)', () => {
  it('closes at once when Home is the only tab', async () => {
    const { closeFromHome } = await import('../src/main/tab-shortcuts')
    const ask = vi.fn(async () => true)
    const close = vi.fn()
    await closeFromHome({ openDocuments: 0, ask, close })
    expect(ask).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalled()
  })

  it('asks before closing the window with documents still open, and stays on no', async () => {
    const { closeFromHome } = await import('../src/main/tab-shortcuts')
    const close = vi.fn()
    const ask = vi.fn(async () => false)
    await closeFromHome({ openDocuments: 9, ask, close })
    expect(ask).toHaveBeenCalledWith(9)
    expect(close).not.toHaveBeenCalled()
    ask.mockResolvedValueOnce(true)
    await closeFromHome({ openDocuments: 9, ask, close })
    expect(close).toHaveBeenCalled()
  })
})
