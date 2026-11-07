import { describe, expect, it, vi } from 'vitest'
import { openWidgetTarget, type WidgetTargetDeps } from '../src/main/home-widget-targets'

/**
 * A shortcut widget's target is opened in main, after checking it again: the
 * renderer's value is never trusted to be a safe URL or an existing path.
 */
function deps(kinds: Record<string, 'file' | 'dir'>): WidgetTargetDeps & {
  [K in 'openDocument' | 'openFolder' | 'openExternal']: ReturnType<typeof vi.fn>
} {
  return {
    kindOf: (path: string) => kinds[path] ?? null,
    openDocument: vi.fn(),
    openFolder: vi.fn(),
    openExternal: vi.fn(),
  }
}

describe('openWidgetTarget', () => {
  it('opens an http(s) link in the browser and nothing else', async () => {
    const d = deps({})
    expect(await openWidgetTarget({ kind: 'link', value: 'https://example.com' }, d)).toBe(true)
    expect(d.openExternal).toHaveBeenCalledWith('https://example.com/')
    expect(await openWidgetTarget({ kind: 'link', value: 'file:///C:/x.exe' }, d)).toBe(false)
    expect(await openWidgetTarget({ kind: 'link', value: 'javascript:1' }, d)).toBe(false)
    expect(d.openExternal).toHaveBeenCalledTimes(1)
  })

  it('opens an existing file as a document and an existing folder in the file manager', async () => {
    const d = deps({ 'C:\\a.docx': 'file', 'C:\\work': 'dir' })
    expect(await openWidgetTarget({ kind: 'file', value: 'C:\\a.docx' }, d)).toBe(true)
    expect(d.openDocument).toHaveBeenCalledWith('C:\\a.docx')
    expect(await openWidgetTarget({ kind: 'folder', value: 'C:\\work' }, d)).toBe(true)
    expect(d.openFolder).toHaveBeenCalledWith('C:\\work')
  })

  it('refuses a missing path, a kind mismatch and anything malformed', async () => {
    const d = deps({ 'C:\\a.docx': 'file', 'C:\\work': 'dir' })
    expect(await openWidgetTarget({ kind: 'file', value: 'C:\\gone.docx' }, d)).toBe(false)
    expect(await openWidgetTarget({ kind: 'folder', value: 'C:\\a.docx' }, d)).toBe(false)
    expect(await openWidgetTarget({ kind: 'file', value: 'C:\\work' }, d)).toBe(false)
    expect(await openWidgetTarget({ kind: 'file', value: 'a.docx' }, d)).toBe(false)
    expect(await openWidgetTarget(null, d)).toBe(false)
    expect(await openWidgetTarget({ kind: 'app', value: 'xmind' }, d)).toBe(false)
    expect(d.openDocument).not.toHaveBeenCalled()
    expect(d.openFolder).not.toHaveBeenCalled()
  })
})
