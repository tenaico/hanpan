import { describe, expect, it } from 'vitest'
import { upsertBlockStrings } from '../../../tools/hanpan-add-block-strings.mjs'
import { upsertFileStrings } from '../../../tools/hanpan-add-strings.mjs'

const entries = { hpX: { ko: '가', en: 'Hello there', vi: 'Xin chào' } }

describe('upsertFileStrings', () => {
  it('replaces an English placeholder that prettier wrapped', () => {
    const r = upsertFileStrings(
      "export const vi = {\n  hpX:\n    'Hello there',\n}\n",
      'vi',
      entries,
    )
    expect(r).toMatchObject({ added: 0, replaced: 1 })
    expect(r.text).toContain("hpX: 'Xin chào',")
    expect(r.text.match(/hpX:/g)).toHaveLength(1)
  })

  it('replaces a double-quoted placeholder', () => {
    const r = upsertFileStrings('export const vi = {\n  hpX: "Hello there",\n}\n', 'vi', entries)
    expect(r).toMatchObject({ added: 0, replaced: 1 })
    expect(r.text).toBe("export const vi = {\n  hpX: 'Xin chào',\n}\n")
  })

  it('reads an apostrophe inside a double-quoted placeholder', () => {
    const map = { hpY: { ko: '지도', en: "Map's", vi: 'Bản đồ' } }
    const r = upsertFileStrings('export const vi = {\n  hpY: "Map\'s",\n}\n', 'vi', map)
    expect(r).toMatchObject({ added: 0, replaced: 1 })
    expect(r.text).toContain("hpY: 'Bản đồ',")
  })

  it('keeps a translated value', () => {
    const source = "export const vi = {\n  hpX: 'Chào',\n}\n"
    const r = upsertFileStrings(source, 'vi', entries)
    expect(r).toEqual({ text: source, added: 0, replaced: 0 })
  })

  it('adds a missing key once', () => {
    const first = upsertFileStrings("export const vi = {\n  a: 'A',\n}\n", 'vi', entries)
    expect(first.added).toBe(1)
    expect(first.text).toBe("export const vi = {\n  a: 'A',\n  hpX: 'Xin chào',\n}\n")
    const second = upsertFileStrings(first.text, 'vi', entries)
    expect(second).toEqual({ text: first.text, added: 0, replaced: 0 })
  })
})

describe('upsertBlockStrings', () => {
  it('replaces a placeholder only inside its own language block', () => {
    const src =
      "export const strings = {\n  en: {\n    a: 'A',\n    hpX: 'Hello there',\n  },\n  vi: {\n    a: 'A',\n    hpX: 'Hello there',\n  },\n}\n"
    const r = upsertBlockStrings(src, 'a', entries)
    expect(r.replaced).toBe(1)
    expect(r.text).toContain("  en: {\n    a: 'A',\n    hpX: 'Hello there',")
    expect(r.text).toContain("hpX: 'Xin chào',")
  })

  it('inserts a missing key after afterKey in every block', () => {
    const src =
      "export const strings = {\n  en: {\n    a: 'A',\n  },\n  vi: {\n    a: 'A',\n  },\n}\n"
    const r = upsertBlockStrings(src, 'a', entries)
    expect(r).toMatchObject({ added: 2, replaced: 0 })
    expect(r.text).toBe(
      "export const strings = {\n  en: {\n    a: 'A',\n    hpX: 'Hello there',\n  },\n  vi: {\n    a: 'A',\n    hpX: 'Xin chào',\n  },\n}\n",
    )
  })

  it('reads afterKey as a plain name, not a pattern', () => {
    const src = "export const strings = {\n  en: {\n    axb: other,\n    z: 'Z',\n  },\n}\n"
    const r = upsertBlockStrings(src, 'a.b', entries)
    expect(r.text).toContain("    z: 'Z',\n    hpX: 'Hello there',\n  },")
  })
})
