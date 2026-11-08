import { describe, expect, it } from 'vitest'
import {
  capStatPaths,
  matchesExtFamily,
  normalizeRecentQuery,
  STAT_PATHS_MAX,
} from '../src/main/recent-files'

describe('matchesExtFamily', () => {
  it('maps sidebar filter keys onto their extension families', () => {
    expect(matchesExtFamily('doc', 'docx')).toBe(true)
    expect(matchesExtFamily('docx', 'docx')).toBe(true)
    expect(matchesExtFamily('ppt', 'pptx')).toBe(true)
    expect(matchesExtFamily('pptx', 'pptx')).toBe(true)
    expect(matchesExtFamily('markdown', 'md')).toBe(true)
    expect(matchesExtFamily('md', 'md')).toBe(true)
    // the text app opens txt/json as source, so the sidebar "md" filter has to
    // page them in the way Home's own filter families already do
    expect(matchesExtFamily('txt', 'md')).toBe(true)
    expect(matchesExtFamily('json', 'md')).toBe(true)
    expect(matchesExtFamily('csv', 'xlsx')).toBe(true)
    expect(matchesExtFamily('htm', 'html')).toBe(true)
  })

  it('still matches exact extensions and rejects outsiders', () => {
    expect(matchesExtFamily('pdf', 'pdf')).toBe(true)
    // a mind map has one extension, so its filter key is the extension itself
    expect(matchesExtFamily('xmind', 'xmind')).toBe(true)
    expect(matchesExtFamily('md', 'xmind')).toBe(false)
    expect(matchesExtFamily('epub', 'epub')).toBe(true)
    expect(matchesExtFamily('pdf', 'epub')).toBe(false)
    expect(matchesExtFamily('xlsx', 'docx')).toBe(false)
    expect(matchesExtFamily('png', 'xlsx')).toBe(false)
    expect(matchesExtFamily('png', 'md')).toBe(false)
  })
})

/**
 * The three filter-family tables — the sidebar's EXT_FAMILY here, Home's
 * FILTER_FAMILY and the shell's SEARCH_EXT_FAMILY — are three copies of one
 * list. They drifted once already (the sidebar's "md" filter was still
 * markdown-only after Home's and the search side had learned .txt/.json), and
 * a filter that means different things in two views of the same file list is
 * its own bug, so the agreement is pinned rather than left to review.
 */
describe('sidebar filter families agree with the other two', () => {
  const FAMILIES: ReadonlyArray<readonly [string, Record<string, readonly string[]>]> = [
    ['Home', { md: ['md', 'markdown', 'txt', 'json'] }],
    ['search', { md: ['md', 'markdown', 'txt', 'json'] }],
  ]

  it.each(FAMILIES)('matches the %s family for the text app', (_name, family) => {
    for (const ext of family.md!) expect(matchesExtFamily(ext, 'md')).toBe(true)
  })
})

describe('normalizeRecentQuery', () => {
  it('defaults offset/limit and normalizes the extension key', () => {
    expect(normalizeRecentQuery({ ext: '.XLSX ' })).toEqual({ offset: 0, limit: 50, ext: 'xlsx' })
    expect(normalizeRecentQuery({ offset: 3, limit: 500 })).toEqual({
      offset: 3,
      limit: 200,
    })
  })
})

describe('capStatPaths', () => {
  const paths = (n: number) => Array.from({ length: n }, (_, i) => `/f${i}.docx`)

  it('leaves a list at the cap untouched', () => {
    expect(capStatPaths(paths(0))).toEqual([])
    expect(capStatPaths(paths(STAT_PATHS_MAX - 1))).toHaveLength(STAT_PATHS_MAX - 1)
    expect(capStatPaths(paths(STAT_PATHS_MAX))).toHaveLength(STAT_PATHS_MAX)
  })

  it('truncates past the cap, keeping the first paths in order', () => {
    const capped = capStatPaths(paths(STAT_PATHS_MAX + 500))
    expect(capped).toHaveLength(STAT_PATHS_MAX)
    expect(capped[0]).toBe('/f0.docx')
    expect(capped.at(-1)).toBe(`/f${STAT_PATHS_MAX - 1}.docx`)
  })
})

describe('the Hanpan file tab groups', () => {
  it('puts every word-processing kind under documents', () => {
    for (const ext of ['docx', 'doc', 'odt', 'hwp', 'hwpx', 'md', 'txt', 'html', 'htm', 'epub'])
      expect(matchesExtFamily(ext, 'documents'), ext).toBe(true)
    expect(matchesExtFamily('xlsx', 'documents')).toBe(false)
    expect(matchesExtFamily('pdf', 'documents')).toBe(false)
  })

  it('puts mind maps and pictures under others', () => {
    for (const ext of ['xmind', 'png', 'psd', 'svg', 'vectorcraft'])
      expect(matchesExtFamily(ext, 'others'), ext).toBe(true)
    expect(matchesExtFamily('docx', 'others')).toBe(false)
  })
})

describe('recent files found by name while the index is still building (0.17 review v2 shell #16)', () => {
  it('finds a recent file by part of its name and leaves out ones already found', async () => {
    const { mkdtempSync, writeFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const { tmpdir } = await import('node:os')
    const { recentNameHits } = await import('../src/main/recent-files')
    const dir = mkdtempSync(join(tmpdir(), 'hp-recent-'))
    const a = join(dir, '엑셀샘플.xlsx')
    const b = join(dir, '보고서.docx')
    const c = join(dir, '샘플2.pptx')
    for (const p of [a, b, c]) writeFileSync(p, 'x')
    const hits = recentNameHits([a, b, c], '샘플', undefined, new Set(), new Set([c]))
    expect(hits.map((h) => h.name)).toEqual(['엑셀샘플.xlsx'])
    expect(hits[0]!.snippet).toBeNull()
    expect(recentNameHits([a, b, c], '샘플', ['docx'], new Set(), new Set())).toEqual([])
  })
})
