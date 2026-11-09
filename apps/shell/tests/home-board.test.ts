import { describe, expect, it } from 'vitest'
import { APP_KEYS, defaultPins, isAppKey } from '../src/shared/home-apps'
import {
  boardHasTrend,
  defaultCardTypes,
  defaultHomeBoard,
  migrateHomeLayout,
  normalizeHomeBoard,
  parseSizeKey,
  resolveHomeBoard,
  sizeKey,
  type BoardContext,
  type HomeBoard,
} from '../src/shared/home-board'
import { normalizeHomeLayout } from '../src/shared/home-layout'

/**
 * The home board as stored (spec 7.10): the default layout per screen
 * language and forecast address, the field-by-field cleanup of a stored board,
 * the one-time default cards of a later version and the move from 0.18's
 * `homeLayout`.
 */

const KO: BoardContext = { korean: true, koreanDocs: true, trend: true }
const EN: BoardContext = { korean: false, koreanDocs: false, trend: true }
const KO_NO_URL: BoardContext = { korean: true, koreanDocs: true, trend: false }
const types = (b: HomeBoard) => b.cards.map((c) => c.type)
const sizes = (b: HomeBoard) => b.cards.map((c) => `${c.w}x${c.h}`)

const card = (id: string, type: string, w: number, h: number, extra: object = {}) => ({
  id,
  type,
  w,
  h,
  title: '',
  ...extra,
})

describe('app keys', () => {
  it('lists the fifteen apps and recognizes only them', () => {
    expect(APP_KEYS).toHaveLength(15)
    expect(isAppKey('xmind')).toBe(true)
    expect(isAppKey('calc')).toBe(false)
    expect(isAppKey(3)).toBe(false)
  })

  it('pins different apps with the Korean document features on and off', () => {
    expect(defaultPins(true)).toContain('hwp')
    expect(defaultPins(false)).not.toContain('hwp')
  })
})

describe('card sizes', () => {
  it('writes and reads a size key', () => {
    expect(sizeKey({ w: 7, h: 2 })).toBe('7x2')
    expect(parseSizeKey('12x3')).toEqual({ w: 12, h: 3 })
    expect(parseSizeKey('7by2')).toBeNull()
    expect(parseSizeKey('0x2')).toBeNull()
  })
})

describe('defaultHomeBoard', () => {
  it('lays out six cards on a Korean screen (7.1)', () => {
    const b = defaultHomeBoard(KO)
    expect(types(b)).toEqual(['start', 'trend', 'apps', 'recent', 'memo', 'favorites'])
    expect(sizes(b)).toEqual(['7x2', '5x2', '5x3', '7x3', '6x2', '6x2'])
    expect(b.cards.map((c) => c.id)).toEqual(types(b))
    expect(b.pinned).toEqual([
      'xmind',
      'hwp',
      'pptx',
      'docx',
      'xlsx',
      'pdf',
      'templates',
      'photo',
      'illust',
      'design',
      'html',
    ])
    expect(b.seenApps).toEqual([...APP_KEYS])
    expect(b.recentApps).toEqual([])
    expect(b.introduced).toEqual(types(b))
  })

  it('has no trend card off a Korean screen or without a forecast address', () => {
    const en = defaultHomeBoard(EN)
    expect(types(en)).not.toContain('trend')
    expect(en.pinned).toEqual([
      'xmind',
      'pptx',
      'docx',
      'xlsx',
      'pdf',
      'photo',
      'illust',
      'html',
      'md',
      'pdf-tools',
      'md-convert',
    ])
    const noUrl = defaultHomeBoard(KO_NO_URL)
    expect(types(noUrl)).not.toContain('trend')
    expect(noUrl.introduced).not.toContain('trend')
    expect(defaultCardTypes(KO_NO_URL)).toEqual(['start', 'apps', 'recent', 'memo', 'favorites'])
  })
})

describe('normalizeHomeBoard', () => {
  it.each([undefined, null, 'x', 3, [], {}, { v: 2, cards: [] }])(
    'gives the default board for %j',
    (raw) => {
      expect(normalizeHomeBoard(raw, KO)).toEqual(defaultHomeBoard(KO))
    },
  )

  it('puts a size the card type does not allow back to its default', () => {
    const b = normalizeHomeBoard(
      {
        v: 1,
        cards: [
          card('start', 'start', 7, 2),
          card('apps', 'apps', 5, 3),
          card('m1', 'memo', 5, 2, { text: '' }),
          card('c1', 'clock', 6, 2),
          card('trend', 'trend', 7, 2),
        ],
        introduced: defaultCardTypes(KO),
      },
      KO,
    )
    expect(sizes(b)).toEqual(['7x2', '5x3', '6x2', '3x2', '5x2'])
  })

  it('keeps the first of the one-of-a-kind cards', () => {
    const b = normalizeHomeBoard(
      {
        v: 1,
        cards: [
          card('start', 'start', 7, 2),
          card('apps', 'apps', 5, 3),
          card('t1', 'trend', 5, 2),
          card('t2', 'trend', 5, 3),
          card('f1', 'favorites', 6, 2),
          card('f2', 'favorites', 3, 2),
        ],
        introduced: defaultCardTypes(KO),
      },
      KO,
    )
    expect(b.cards.map((c) => c.id)).toEqual(['start', 'apps', 't1', 'f1'])
  })

  it('drops cards with a bad type or id and repeated ids', () => {
    const b = normalizeHomeBoard(
      {
        v: 1,
        cards: [
          card('start', 'start', 7, 2),
          card('apps', 'apps', 5, 3),
          card('x', 'weather', 3, 2),
          card('Bad Id', 'clock', 3, 2),
          card('c1', 'clock', 3, 2),
          card('c1', 'clock', 3, 2),
          'card',
        ],
        introduced: defaultCardTypes(KO),
      },
      KO,
    )
    expect(b.cards.map((c) => c.id)).toEqual(['start', 'apps', 'c1'])
  })

  it('puts the start and new cards back in their default places', () => {
    const b = normalizeHomeBoard(
      { v: 1, cards: [card('m1', 'memo', 6, 2, { text: '' })], introduced: defaultCardTypes(KO) },
      KO,
    )
    expect(types(b)).toEqual(['start', 'apps', 'memo'])
    expect(b.cards.slice(0, 2).map((c) => c.id)).toEqual(['start', 'apps'])
    expect(sizes(b).slice(0, 2)).toEqual(['7x2', '5x3'])
  })

  it('gives a fresh id when a default id is taken', () => {
    const b = normalizeHomeBoard(
      {
        v: 1,
        cards: [card('start', 'memo', 6, 2, { text: '' })],
        introduced: defaultCardTypes(KO),
      },
      KO,
    )
    expect(types(b)).toEqual(['start', 'apps', 'memo'])
    const start = b.cards[0]!
    expect(start.id).not.toBe('start')
    expect(start.id).toMatch(/^start-[a-z0-9]+$/)
  })

  it('cleans up the app key lists field by field', () => {
    const b = normalizeHomeBoard(
      {
        v: 1,
        cards: defaultHomeBoard(KO).cards,
        pinned: ['xmind', 'calc', 'docx', 'xmind'],
        seenApps: ['pdf', 'pdf', 7, 'zzz'],
        recentApps: ['xmind', 'hwp', 'pptx', 'docx', 'xlsx', 'md', 'html', 'pdf', 'photo', 'xmind'],
        introduced: ['start', 'apps', 'weather', 'trend', 'recent', 'memo', 'favorites'],
      },
      KO,
    )
    expect(b.pinned).toEqual(['xmind', 'docx'])
    expect(b.seenApps).toEqual(['pdf'])
    expect(b.recentApps).toEqual(['xmind', 'hwp', 'pptx', 'docx', 'xlsx', 'md', 'html', 'pdf'])
    expect(b.introduced).toEqual(['start', 'apps', 'trend', 'recent', 'memo', 'favorites'])
  })

  it('fills a missing list with its default but keeps an empty pin list', () => {
    const missing = normalizeHomeBoard({ v: 1, cards: defaultHomeBoard(KO).cards }, KO)
    expect(missing.pinned).toEqual(defaultPins(true))
    expect(missing.seenApps).toEqual([...APP_KEYS])
    expect(missing.recentApps).toEqual([])
    expect(missing.introduced).toEqual(defaultCardTypes(KO))
    const empty = normalizeHomeBoard({ ...defaultHomeBoard(KO), pinned: [] }, KO)
    expect(empty.pinned).toEqual([])
  })

  it('gives the default cards when cards is not a list', () => {
    const b = normalizeHomeBoard({ v: 1, cards: 'x', pinned: ['md'] }, KO)
    expect(types(b)).toEqual(types(defaultHomeBoard(KO)))
    expect(b.pinned).toEqual(['md'])
  })

  it('cuts a note at 2,000 characters and a title at 60', () => {
    const b = normalizeHomeBoard(
      {
        v: 1,
        cards: [
          card('start', 'start', 7, 2),
          card('apps', 'apps', 5, 3),
          card('m1', 'memo', 6, 2, { text: 'a'.repeat(2001), title: 'b'.repeat(61) }),
        ],
        introduced: defaultCardTypes(KO),
      },
      KO,
    )
    const memo = b.cards[2]!
    expect(memo.type === 'memo' && memo.text.length).toBe(2000)
    expect(memo.title).toHaveLength(60)
  })

  it('keeps a shortcut target and an absolute folder path, drops the rest', () => {
    const b = normalizeHomeBoard(
      {
        v: 1,
        cards: [
          card('start', 'start', 7, 2),
          card('apps', 'apps', 5, 3),
          card('s1', 'shortcut', 3, 2, { target: { kind: 'link', value: 'https://example.com' } }),
          card('s2', 'shortcut', 3, 2, { target: { kind: 'link', value: 'javascript:1' } }),
          card('f1', 'folder', 3, 2, { path: 'C:\\docs' }),
          card('f2', 'folder', 3, 2, { path: 'docs' }),
        ],
        introduced: defaultCardTypes(KO),
      },
      KO,
    )
    const [, , s1, s2, f1, f2] = b.cards
    expect(s1!.type === 'shortcut' && s1!.target).toEqual({
      kind: 'link',
      value: 'https://example.com/',
    })
    expect(s2!.type === 'shortcut' && s2!.target).toBeNull()
    expect(f1!.type === 'folder' && f1!.path).toBe('C:\\docs')
    expect(f2!.type === 'folder' && f2!.path).toBe('')
  })

  it('holds at most 24 cards, keeping the start and new cards', () => {
    const memos = Array.from({ length: 25 }, (_, k) => card(`m${k}`, 'memo', 6, 2, { text: '' }))
    const b = normalizeHomeBoard({ v: 1, cards: memos, introduced: defaultCardTypes(KO) }, KO)
    expect(b.cards).toHaveLength(24)
    expect(types(b).slice(0, 2)).toEqual(['start', 'apps'])
    expect(b.cards.at(-1)!.id).toBe('m21')
  })

  it('cuts 25 stored cards to 24', () => {
    const b = defaultHomeBoard(KO)
    const extra = Array.from({ length: 19 }, (_, k) => card(`c${k}`, 'clock', 3, 2))
    const out = normalizeHomeBoard({ ...b, cards: [...b.cards, ...extra] }, KO)
    expect(out.cards).toHaveLength(24)
    expect(out.cards.at(-1)!.id).toBe('c17')
  })
})

describe('default cards of a later version (7.10)', () => {
  const withoutTrend = {
    v: 1,
    cards: [
      card('start', 'start', 7, 2),
      card('apps', 'apps', 5, 3),
      card('recent', 'recent', 7, 3),
    ],
    introduced: ['start', 'apps', 'recent', 'memo', 'favorites'],
  }

  it('puts the trend card in once, right after the start card', () => {
    const b = normalizeHomeBoard(withoutTrend, KO)
    expect(types(b)).toEqual(['start', 'trend', 'apps', 'recent'])
    expect(b.cards[1]).toMatchObject({ id: 'trend', w: 5, h: 2 })
    expect(b.introduced).toContain('trend')
  })

  it('leaves out a trend card the person removed', () => {
    const b = normalizeHomeBoard({ ...withoutTrend, introduced: defaultCardTypes(KO) }, KO)
    expect(types(b)).toEqual(['start', 'apps', 'recent'])
  })

  it('adds no trend card off a Korean screen or without a forecast address', () => {
    expect(types(normalizeHomeBoard(withoutTrend, EN))).not.toContain('trend')
    const noUrl = normalizeHomeBoard(withoutTrend, KO_NO_URL)
    expect(types(noUrl)).not.toContain('trend')
    expect(noUrl.introduced).not.toContain('trend')
  })

  it('keeps a hidden app pinned when the Korean document features are off', () => {
    const b = normalizeHomeBoard(defaultHomeBoard(KO), { ...KO, koreanDocs: false })
    expect(b.pinned).toContain('hwp')
  })

  it('tells whether a stored board has a trend card', () => {
    expect(boardHasTrend(defaultHomeBoard(KO))).toBe(true)
    expect(boardHasTrend(defaultHomeBoard(EN))).toBe(false)
    expect(boardHasTrend('x')).toBe(false)
    expect(boardHasTrend({ v: 1, cards: 'x' })).toBe(false)
  })
})

describe('migrateHomeLayout (0.18 homeLayout)', () => {
  it('moves the default 0.18 widgets after the start, trend and new cards', () => {
    const b = migrateHomeLayout(normalizeHomeLayout(undefined), KO)
    expect(types(b)).toEqual(['start', 'trend', 'apps', 'recent', 'favorites', 'memo'])
    expect(sizes(b)).toEqual(['7x2', '5x2', '5x3', '7x3', '3x2', '3x2'])
    expect(b.seenApps).toEqual([...APP_KEYS])
    expect(b.recentApps).toEqual([])
    expect(b.introduced).toEqual(defaultCardTypes(KO))
  })

  it('reads the 0.18 card order into the default pins and drops hidden apps', () => {
    const b = migrateHomeLayout(
      normalizeHomeLayout({
        cardOrder: ['pptx', 'xmind', 'hwp', 'templates'],
        hiddenCards: ['photo'],
      }),
      KO,
    )
    expect(b.pinned).toEqual([
      'pptx',
      'xmind',
      'hwp',
      'templates',
      'docx',
      'xlsx',
      'design',
      'html',
      'pdf',
      'illust',
    ])
  })

  it('keeps the mind map first when only the other documents were reordered', () => {
    const b = migrateHomeLayout(
      normalizeHomeLayout({
        cardOrder: [
          'docx',
          'xlsx',
          'design',
          'md',
          'pdf',
          'html',
          'photo',
          'illust',
          'open',
          'xmind',
          'hwp',
          'pptx',
          'templates',
        ],
      }),
      KO,
    )
    expect(b.pinned[0]).toBe('xmind')
    expect(b.pinned.indexOf('pdf')).toBeLessThan(b.pinned.indexOf('html'))
    expect(b.pinned).toHaveLength(11)
  })

  it('carries notes, titles, folders and shortcuts over', () => {
    const b = migrateHomeLayout(
      normalizeHomeLayout({
        widgets: [
          { id: 'memo-1', type: 'memo', size: 'wide', title: '마감', text: '분기 보고 마감 11/14' },
          { id: 'folder-1', type: 'folder', size: 'small', title: '', path: 'C:\\work' },
          {
            id: 'shortcut-1',
            type: 'shortcut',
            size: 'wide',
            title: '',
            target: { kind: 'file', value: 'C:\\work\\plan.docx' },
          },
          { id: 'clock-1', type: 'clock', size: 'wide', title: '' },
        ],
      }),
      KO,
    )
    const byId = Object.fromEntries(b.cards.map((c) => [c.id, c]))
    expect(byId['memo-1']).toEqual({
      id: 'memo-1',
      type: 'memo',
      w: 6,
      h: 2,
      title: '마감',
      text: '분기 보고 마감 11/14',
    })
    expect(byId['folder-1']).toMatchObject({ w: 3, h: 2, path: 'C:\\work' })
    expect(byId['shortcut-1']).toMatchObject({
      w: 6,
      h: 2,
      target: { kind: 'file', value: 'C:\\work\\plan.docx' },
    })
    expect(byId['clock-1']).toMatchObject({ w: 3, h: 2 })
  })

  it('pins the apps pinned to 0.18 favorites after the home pins', () => {
    const b = migrateHomeLayout(normalizeHomeLayout({ pinnedApps: ['md', 'xmind'] }), KO)
    expect(b.pinned.at(-1)).toBe('md')
    expect(b.pinned.filter((k) => k === 'xmind')).toHaveLength(1)
  })

  it('starts from the other default pins and adds no trend card off a Korean screen', () => {
    const b = migrateHomeLayout(normalizeHomeLayout(undefined), EN)
    expect(types(b)).not.toContain('trend')
    expect(b.pinned).toEqual(defaultPins(false))
    expect(b.introduced).toEqual(defaultCardTypes(EN))
  })

  it('keeps a 0.18 widget whose id a default card takes', () => {
    const b = migrateHomeLayout(
      normalizeHomeLayout({
        widgets: [{ id: 'apps', type: 'memo', size: 'small', title: '', text: 'keep me' }],
      }),
      KO,
    )
    const memo = b.cards.find((c) => c.type === 'memo')
    expect(memo && memo.type === 'memo' && memo.text).toBe('keep me')
    expect(new Set(b.cards.map((c) => c.id)).size).toBe(b.cards.length)
  })
})

describe('resolveHomeBoard', () => {
  const legacy = { widgets: [{ id: 'memo-1', type: 'memo', size: 'wide', title: '', text: 'old' }] }
  const memoText = (b: HomeBoard) => b.cards.flatMap((c) => (c.type === 'memo' ? [c.text] : []))

  it('uses a version 1 board and ignores homeLayout', () => {
    const b = resolveHomeBoard(defaultHomeBoard(KO), legacy, KO)
    expect(b).toEqual(defaultHomeBoard(KO))
  })

  it('moves homeLayout over when there is no board', () => {
    expect(memoText(resolveHomeBoard(undefined, legacy, KO))).toEqual(['old'])
  })

  it.each(['x', { v: 2 }])('moves homeLayout over when the board is damaged (%j)', (stored) => {
    expect(memoText(resolveHomeBoard(stored, legacy, KO))).toEqual(['old'])
  })

  it.each([
    [undefined, undefined],
    [undefined, 'x'],
    [null, ['x']],
  ])('gives the default board for %j and %j', (stored, old) => {
    expect(resolveHomeBoard(stored, old, KO)).toEqual(defaultHomeBoard(KO))
  })
})
