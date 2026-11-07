import { statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, relative, isAbsolute } from 'node:path'
import type { RecentEntry, RecentPage, RecentQuery } from '../shared/home-api'
import { OPEN_EXTS } from '../../../graphics/src/shared/kinds'
import { HOME_FILTER_GROUPS } from '../shared/home-filter-groups'

/**
 * Scratch folders that tests make under the temp folder. A file in one is never
 * a person's document: the CLI's empty-package test hands
 * `ieumoffice-empty-package-<random>/empty.docx` to a running app through its control
 * endpoint, and 0.16 then kept it in recents and brought it back as an
 * "empty.docx" tab after a restart.
 */
const SCRATCH_DIR_PREFIXES = ['ieumoffice-empty-package-', 'genoffice-test-'] as const

/** A file directly in a test scratch folder under the temp folder (`tmpRoot`). */
export function isScratchDocument(path: string, tmpRoot: string = tmpdir()): boolean {
  if (!path) return false
  const dir = dirname(path)
  const folder = basename(dir)
  if (!SCRATCH_DIR_PREFIXES.some((prefix) => folder.startsWith(prefix))) return false
  const inside = relative(tmpRoot, dir)
  return inside !== '' && !inside.startsWith('..') && !isAbsolute(inside)
}

const RECENT_PAGE_DEFAULT = 50
const RECENT_PAGE_MAX = 200

function toRecentEntry(path: string, starredPaths: ReadonlySet<string>): RecentEntry {
  try {
    const stat = statSync(path)
    return {
      path,
      name: basename(path),
      ext: extname(path).slice(1).toLowerCase(),
      mtimeMs: stat.mtimeMs,
      sizeBytes: stat.size,
      starred: starredPaths.has(path),
    }
  } catch {
    // A failed stat is often transient (disconnected drive, pending mount,
    // cloud placeholder) — dropping the entry made the recents list silently
    // lose files until a later reload (r158). Word keeps unavailable recents
    // listed; the row is flagged so the UI can dim it and offer removal.
    return {
      path,
      name: basename(path),
      ext: extname(path).slice(1).toLowerCase(),
      mtimeMs: 0,
      sizeBytes: 0,
      starred: starredPaths.has(path),
      missing: true,
    }
  }
}

export function statPathEntries(
  paths: readonly string[],
  starredPaths: ReadonlySet<string>,
): RecentEntry[] {
  return paths.map((path) => toRecentEntry(path, starredPaths))
}

export const STAT_PATHS_MAX = RECENT_PAGE_MAX

/** stat is synchronous; a renderer-supplied list is bounded like every recents page */
export function capStatPaths(paths: readonly string[]): string[] {
  return paths.slice(0, STAT_PATHS_MAX)
}

export function normalizeRecentQuery(
  raw: unknown,
): Required<Omit<RecentQuery, 'ext' | 'group'>> & { ext?: string } {
  const query = (raw ?? {}) as RecentQuery
  // offset/limit cross the preload boundary, so an IPC caller may send "10" rather
  // than 10; without coercion every page silently restarted at the first page.
  const rawOffset = Number(query.offset)
  const rawLimit = Number(query.limit)
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0
  const limit = Number.isFinite(rawLimit)
    ? Math.min(RECENT_PAGE_MAX, Math.max(0, Math.floor(rawLimit)))
    : RECENT_PAGE_DEFAULT
  // Sidebar keys are bare extensions ("xlsx"), but IPC callers may send
  // ".xlsx", " XLSX ", or "..." — normalize so openable files cannot hide
  // behind a filter that only differs in dots/case/whitespace.
  const rawExt =
    typeof query.ext === 'string' ? query.ext.trim().toLowerCase().replace(/^\.+/, '') : ''
  const ext = rawExt ? rawExt : undefined
  return { offset, limit, ext }
}

/** sidebar filter keys that stand for a family of extensions, not one exact ext */
export const EXT_FAMILY: Record<string, readonly string[]> = {
  // mirrors Home's FILTER_FAMILY and SEARCH_EXT_FAMILY
  docx: ['docx', 'doc', 'odt'],
  // delimited text belongs to the sheets family: Home's own FILTER_FAMILY and
  // the shell's open routing both treat .csv/.tsv as spreadsheets, so a
  // sidebar filtered on "xlsx" must page them in too (csv was missing here).
  xlsx: ['xlsx', 'xlsm', 'xls', 'csv', 'tsv'],
  pptx: ['pptx', 'ppt'],
  // the text app opens txt/json as source too, so the sidebar "md" filter has
  // to page them in the same way Home's FILTER_FAMILY already does — otherwise
  // the two views disagree about which files the filter means.
  md: ['md', 'markdown', 'txt', 'json'],
  html: ['html', 'htm'],
  hwp: ['hwp', 'hwpx'],
  photo: OPEN_EXTS.photo,
  illust: OPEN_EXTS.illust,
  // Hanpan's grouped Home tabs
  ...HOME_FILTER_GROUPS,
}

/** Family-aware extension match for sidebar filters (recents and starred share it). */
export function matchesExtFamily(entryExt: string, filterExt: string): boolean {
  const family = EXT_FAMILY[filterExt]
  return family ? family.includes(entryExt) : entryExt === filterExt
}

/** Page over the recents paths, preserving the source's newest-first order (unavailable paths stay, flagged missing). */
export function pageRecentPaths(
  paths: readonly string[],
  raw: unknown,
  starredPaths: ReadonlySet<string>,
): RecentPage {
  const { offset, limit, ext } = normalizeRecentQuery(raw)
  const listed = paths.filter((p) => !isScratchDocument(p))
  // stat only the returned page: statting the whole list blocked main on long recents
  const filtered = ext
    ? listed.filter((p) => matchesExtFamily(extname(p).slice(1).toLowerCase(), ext))
    : listed
  const page = limit === 0 ? [] : filtered.slice(offset, offset + limit)
  return {
    entries: statPathEntries(page, starredPaths),
    total: filtered.length,
    totalAll: listed.length,
  }
}

/**
 * Recent files whose name holds the query, as search hits (0.17 리뷰 v2 shell
 * #16): the first search after launch runs while the index is still empty, and
 * a file the person opened yesterday must not come back as "0 results".
 * `exts` narrows to those extensions; paths in `already` are left out.
 */
export function recentNameHits(
  paths: readonly string[],
  q: string,
  exts: readonly string[] | undefined,
  starredPaths: ReadonlySet<string>,
  already: ReadonlySet<string>,
): Array<RecentEntry & { snippet: null; needles: string[] }> {
  const needle = q.normalize('NFC').toLowerCase().trim()
  if (!needle) return []
  const wanted = paths.filter((p) => {
    if (already.has(p) || isScratchDocument(p)) return false
    const ext = extname(p).slice(1).toLowerCase()
    if (exts && !exts.includes(ext)) return false
    return basename(p).normalize('NFC').toLowerCase().includes(needle)
  })
  return statPathEntries(wanted.slice(0, 50), starredPaths).map((entry) => ({
    ...entry,
    snippet: null,
    needles: [needle],
  }))
}
