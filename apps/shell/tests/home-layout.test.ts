import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HOME_LAYOUT,
  HOME_MEMO_MAX,
  HOME_WIDGET_MAX,
  arrangeKeys,
  normalizeHomeLayout,
  validLinkUrl,
  type HomeWidget,
} from '../src/shared/home-layout'

/**
 * 0.17 위젯 및 인터페이스 사용자화: the home layout (widget instances, app
 * cards) lives in userData/app-settings.json under `homeLayout`. A corrupt or
 * missing value falls back to the defaults piece by piece.
 */

const types = (widgets: readonly HomeWidget[]) => widgets.map((w) => w.type)

describe('normalizeHomeLayout', () => {
  it.each([undefined, null, 'x', 3, [], { widgets: 'nope' }])(
    'gives the defaults for %j',
    (raw) => {
      expect(normalizeHomeLayout(raw)).toEqual(DEFAULT_HOME_LAYOUT)
    },
  )

  it('starts with recent documents, favorites and a quick memo', () => {
    expect(types(DEFAULT_HOME_LAYOUT.widgets).sort()).toEqual(['favorites', 'memo', 'recent'])
  })

  it('keeps an empty widget list (everything removed on purpose)', () => {
    expect(normalizeHomeLayout({ widgets: [] }).widgets).toEqual([])
  })

  it('drops broken widgets and repeated ids, and caps text and count', () => {
    const layout = normalizeHomeLayout({
      widgets: [
        { id: 'a', type: 'memo', title: 't'.repeat(200), text: 'm'.repeat(HOME_MEMO_MAX + 9) },
        { id: 'a', type: 'clock' },
        { id: 'b', type: 'weather' },
        { type: 'clock' },
        { id: 'BAD ID', type: 'clock' },
        { id: 'c', type: 'clock', size: 'huge' },
        null,
      ],
    })
    expect(layout.widgets.map((w) => w.id)).toEqual(['a', 'c'])
    const memo = layout.widgets[0]!
    expect(memo.type === 'memo' && memo.text.length).toBe(HOME_MEMO_MAX)
    expect(memo.title.length).toBeLessThanOrEqual(60)
    expect(layout.widgets[1]!.size).toBe('small')
    const many = Array.from({ length: HOME_WIDGET_MAX + 5 }, (_, k) => ({
      id: `w${k}`,
      type: 'clock',
    }))
    expect(normalizeHomeLayout({ widgets: many }).widgets).toHaveLength(HOME_WIDGET_MAX)
  })

  it('keeps a shortcut but clears a target that is not safe to open', () => {
    const layout = normalizeHomeLayout({
      widgets: [
        { id: 's1', type: 'shortcut', target: { kind: 'link', value: 'https://example.com/a' } },
        { id: 's2', type: 'shortcut', target: { kind: 'link', value: 'javascript:alert(1)' } },
        { id: 's3', type: 'shortcut', target: { kind: 'file', value: 'relative\\x.docx' } },
        { id: 's4', type: 'shortcut', target: { kind: 'file', value: 'C:\\docs\\x.docx' } },
        { id: 's5', type: 'shortcut', target: { kind: 'app', value: 'xmind' } },
        { id: 's6', type: 'shortcut', target: { kind: 'folder', value: '/home/me/docs' } },
      ],
    })
    const targets = layout.widgets.map((w) => (w.type === 'shortcut' ? w.target : undefined))
    expect(targets).toEqual([
      { kind: 'link', value: 'https://example.com/a' },
      null,
      null,
      { kind: 'file', value: 'C:\\docs\\x.docx' },
      { kind: 'app', value: 'xmind' },
      { kind: 'folder', value: '/home/me/docs' },
    ])
  })

  it('keeps only an absolute folder for the folder view', () => {
    const layout = normalizeHomeLayout({
      widgets: [
        { id: 'f1', type: 'folder', path: 'D:\\work' },
        { id: 'f2', type: 'folder', path: '..\\up' },
      ],
    })
    expect(layout.widgets.map((w) => (w.type === 'folder' ? w.path : null))).toEqual([
      'D:\\work',
      '',
    ])
  })

  it('reads the earlier single-memo layout', () => {
    const layout = normalizeHomeLayout({
      widgetOrder: ['memo', 'favorites', 'recent'],
      hiddenWidgets: ['recent'],
      memo: '예전 메모',
      hiddenCards: ['pdf'],
    })
    expect(types(layout.widgets)).toEqual(['memo', 'favorites'])
    const memo = layout.widgets[0]!
    expect(memo.type === 'memo' && memo.text).toBe('예전 메모')
    expect(layout.hiddenCards).toEqual(['pdf'])
  })

  it('drops bad card keys', () => {
    const layout = normalizeHomeLayout({
      hiddenCards: ['pdf', '', 'pdf', 42, '../x', 'a'.repeat(80)],
      cardOrder: ['html', 'docx', 'html'],
      pinnedApps: ['xmind', null],
    })
    expect(layout.hiddenCards).toEqual(['pdf'])
    expect(layout.cardOrder).toEqual(['html', 'docx'])
    expect(layout.pinnedApps).toEqual(['xmind'])
  })
})

describe('validLinkUrl', () => {
  it.each([
    ['https://example.com', 'https://example.com/'],
    ['http://intra.local:8080/x?y=1', 'http://intra.local:8080/x?y=1'],
    ['example.com', null],
    ['file:///C:/x', null],
    ['javascript:alert(1)', null],
    ['', null],
  ])('%s -> %s', (raw, out) => {
    expect(validLinkUrl(raw)).toBe(out)
  })
})

describe('ordering helpers', () => {
  const keys = ['a', 'b', 'c', 'd']

  it('arranges keys by a stored order, unknown keys keeping their place after', () => {
    expect(arrangeKeys(keys, ['c', 'zz', 'a'])).toEqual(['c', 'a', 'b', 'd'])
    expect(arrangeKeys(keys, [])).toEqual(keys)
  })
})
