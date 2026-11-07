/** @vitest-environment jsdom */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import {
  GonguPicker,
  gonguCreditListPlan,
  gonguInsertWarnings,
  gonguPickerText,
  type GonguPickerApi,
} from '../src/gongu-picker'
import { GONGU_PICKER_STRINGS } from '../src/strings-gongu-picker'

/**
 * Hanpan: the Gongu picture picker the Word and PowerPoint editors open from
 * Insert (docs/plans/gongu-images.md 4.5). The search runs in main; the picker
 * shows the hits and hands the picked picture over with the credit line the
 * app writes, the same line the design board and the HWP editor write.
 */

describe('Gongu picker strings', () => {
  it('fills every key in every language', () => {
    expect(LANGS).toHaveLength(21)
    for (const lang of LANGS) {
      const words = GONGU_PICKER_STRINGS[lang]
      for (const [key, value] of Object.entries(words))
        expect(value.trim().length, `${lang}.${key}`).toBeGreaterThan(0)
    }
  })

  it('reads like the design board panel', () => {
    expect(gonguPickerText('ko', 'title')).toBe('공유마당 그림')
    expect(gonguPickerText('ko', 'total', { count: 86 })).toBe('86건')
    expect(gonguPickerText('en', 'insert')).toBe(GONGU_PICKER_STRINGS.en.insert)
  })
})

describe('gonguInsertWarnings', () => {
  it('says nothing for a free work and names each condition otherwise', () => {
    expect(gonguInsertWarnings({ kind: 'expired' }, 'ko')).toEqual([])
    expect(gonguInsertWarnings({ kind: 'kogl', type: 1 }, 'ko')).toEqual([])
    expect(gonguInsertWarnings({ kind: 'kogl', type: 4 }, 'ko')).toEqual([
      GONGU_PICKER_STRINGS.ko.warnNc,
      GONGU_PICKER_STRINGS.ko.warnNd,
    ])
    expect(gonguInsertWarnings({ kind: 'ccl', nc: false, nd: false, sa: true }, 'ko')).toEqual([
      GONGU_PICKER_STRINGS.ko.warnSa,
    ])
  })
})

describe('gonguCreditListPlan', () => {
  const A = '「호작도」, 김홍도 / 출처: 공유마당(한국저작권위원회), 만료저작물'
  const B = '「씨름」 / 출처: 공유마당(한국저작권위원회), 만료저작물'
  it('starts a list, adds under the last heading, and lists a line once', () => {
    expect(gonguCreditListPlan(['본문'], '그림 출처', A)).toEqual({ kind: 'new' })
    expect(gonguCreditListPlan(['본문', '그림 출처', A], '그림 출처', B)).toEqual({
      kind: 'add',
      after: 1,
    })
    expect(gonguCreditListPlan(['그림 출처', '본문', ' 그림 출처 ', B, A], '그림 출처', A)).toEqual(
      {
        kind: 'listed',
      },
    )
    // a line elsewhere in the text is not the list
    expect(gonguCreditListPlan([A, '그림 출처'], '그림 출처', A)).toEqual({ kind: 'add', after: 1 })
  })
})

const THUMB = 'data:image/jpeg;base64,AAAA'
const PICTURE = 'data:image/jpeg;base64,BBBB'

function fakeApi(over: Partial<GonguPickerApi> = {}): GonguPickerApi {
  return {
    gonguSearch: vi.fn(async () => ({
      ok: true as const,
      total: 2,
      works: [
        { workId: '4534', title: '호작도', author: '김홍도', thumb: THUMB },
        { workId: '77', title: '씨름', thumb: null },
      ],
    })),
    gonguPicture: vi.fn(async (workId: string) => ({
      ok: true as const,
      dataUrl: PICTURE,
      width: 1120,
      height: 552,
      work: { workId, title: '호작도', author: '김홍도', year: '18세기' },
    })),
    ...over,
  }
}

/** Types into a React-controlled input. */
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('GonguPicker', () => {
  let host: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const search = async (words: string) => {
    typeInto(document.querySelector<HTMLInputElement>('[data-hanpan="gongu-query"]')!, words)
    await act(async () => {
      document
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
  }

  it('searches, shows the hits and inserts the picked one with its credit line', async () => {
    const api = fakeApi()
    const onInsert = vi.fn(async () => true)
    const onClose = vi.fn()
    await act(async () => {
      root.render(createElement(GonguPicker, { lang: 'ko', api, onInsert, onClose }))
    })
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.getAttribute('aria-label')).toBe('공유마당 그림')

    await search('호랑이')
    expect(api.gonguSearch).toHaveBeenCalledWith('호랑이', 1)
    const cells = document.querySelectorAll<HTMLButtonElement>('[data-gongu-work]')
    expect(cells).toHaveLength(2)
    expect(cells[0]!.querySelector('img')!.getAttribute('src')).toBe(THUMB)
    expect(document.body.textContent).toContain('2건')

    act(() => cells[0]!.click())
    const insert = document.querySelector<HTMLButtonElement>('[data-action="gongu-insert"]')!
    await act(async () => insert.click())
    expect(api.gonguPicture).toHaveBeenCalledWith('4534')
    expect(onInsert).toHaveBeenCalledWith({
      dataUrl: PICTURE,
      width: 1120,
      height: 552,
      title: '호작도',
      credit: {
        collection: 'gongu',
        workId: '4534',
        title: '호작도',
        author: '김홍도',
        year: '18세기',
        license: { kind: 'expired' },
      },
      creditLine: '「호작도」, 김홍도, 18세기 / 출처: 공유마당(한국저작권위원회), 만료저작물',
      creditListTitle: '그림 출처',
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stays open when the editor could not insert', async () => {
    const onClose = vi.fn()
    await act(async () => {
      root.render(
        createElement(GonguPicker, {
          lang: 'ko',
          api: fakeApi(),
          onInsert: async () => false,
          onClose,
        }),
      )
    })
    await search('호랑이')
    act(() => document.querySelector<HTMLButtonElement>('[data-gongu-work]')!.click())
    await act(async () =>
      document.querySelector<HTMLButtonElement>('[data-action="gongu-insert"]')!.click(),
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows the key guidance as soon as it opens, with a button to Settings', async () => {
    const api = fakeApi({
      gonguSearch: vi.fn(async () => ({ ok: false as const, error: 'no-key' as const })),
    })
    const onOpenSettings = vi.fn()
    const onClose = vi.fn()
    await act(async () => {
      root.render(
        createElement(GonguPicker, { lang: 'ko', api, onInsert: vi.fn(), onClose, onOpenSettings }),
      )
    })
    // the probe sends no words: nothing the person typed leaves the PC
    expect(api.gonguSearch).toHaveBeenCalledWith('', 1)
    const note = document.querySelector('[data-hanpan="gongu-no-key"]')!
    expect(note.textContent).toContain(GONGU_PICKER_STRINGS.ko.noKey)
    expect(note.textContent).toContain(GONGU_PICKER_STRINGS.ko.noKeyHint)
    const open = note.querySelector<HTMLButtonElement>('[data-action="gongu-open-settings"]')!
    expect(open.textContent).toBe(GONGU_PICKER_STRINGS.ko.openSettings)
    act(() => open.click())
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows no guidance (and no empty-result line) when a key is set', async () => {
    const api = fakeApi({
      gonguSearch: vi.fn(async () => ({ ok: true as const, works: [], total: null })),
    })
    await act(async () => {
      root.render(
        createElement(GonguPicker, { lang: 'ko', api, onInsert: vi.fn(), onClose: vi.fn() }),
      )
    })
    expect(document.querySelector('[data-hanpan="gongu-no-key"]')).toBeNull()
    expect(document.body.textContent).not.toContain(GONGU_PICKER_STRINGS.ko.noResults)
  })

  it('tells where to put the key when there is none', async () => {
    const api = fakeApi({
      gonguSearch: vi.fn(async () => ({ ok: false as const, error: 'no-key' as const })),
    })
    await act(async () => {
      root.render(
        createElement(GonguPicker, { lang: 'ko', api, onInsert: vi.fn(), onClose: vi.fn() }),
      )
    })
    await search('호랑이')
    expect(document.body.textContent).toContain(GONGU_PICKER_STRINGS.ko.noKey)
    expect(document.querySelectorAll('[data-gongu-work]')).toHaveLength(0)
  })

  it('asks before inserting a work with conditions, and inserts nothing on no', async () => {
    const api = fakeApi({
      gonguPicture: vi.fn(async () => ({
        ok: true as const,
        dataUrl: PICTURE,
        width: 10,
        height: 10,
        work: { workId: '9', title: 'x' },
        license: { kind: 'kogl' as const, type: 2 as const },
      })),
    })
    const onInsert = vi.fn(async () => true)
    const confirm = vi.fn(() => false)
    await act(async () => {
      root.render(
        createElement(GonguPicker, { lang: 'ko', api, onInsert, onClose: vi.fn(), confirm }),
      )
    })
    await search('x')
    act(() => document.querySelector<HTMLButtonElement>('[data-gongu-work]')!.click())
    await act(async () =>
      document.querySelector<HTMLButtonElement>('[data-action="gongu-insert"]')!.click(),
    )
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining(GONGU_PICKER_STRINGS.ko.warnNc))
    expect(onInsert).not.toHaveBeenCalled()
  })

  it('closes on its close button', async () => {
    const onClose = vi.fn()
    await act(async () => {
      root.render(
        createElement(GonguPicker, { lang: 'en', api: fakeApi(), onInsert: vi.fn(), onClose }),
      )
    })
    act(() => document.querySelector<HTMLButtonElement>('[data-action="gongu-close"]')!.click())
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
