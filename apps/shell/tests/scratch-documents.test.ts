import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { isScratchDocument, pageRecentPaths } from '../src/main/recent-files'
import { parseSessionRecord, sessionSnapshotFrom } from '../src/main/session-record'

// 0.16 bug: a zero-byte `ieumoffice-empty-package-*/empty.docx` (the CLI test
// scratch file, handed to a live app through its control endpoint) came back
// as an "empty.docx" tab after a restart and stayed in the recents list.
const dirs: string[] = []
function scratch(prefix = 'ieumoffice-empty-package-', name = 'empty.docx'): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(dir)
  const path = join(dir, name)
  writeFileSync(path, '')
  return path
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('scratch documents in the temp folder', () => {
  it('recognises the empty-package and test scratch folders under the temp folder', () => {
    expect(isScratchDocument(scratch())).toBe(true)
    expect(isScratchDocument(scratch('genoffice-test-', 'a.xlsx'))).toBe(true)
  })

  it('leaves real documents and other temp files alone', () => {
    expect(isScratchDocument('C:\\Users\\me\\Documents\\empty.docx')).toBe(false)
    expect(isScratchDocument('/home/me/ieumoffice-empty-package-x/empty.docx')).toBe(false)
    expect(isScratchDocument(join(tmpdir(), 'ieumoffice-template-copies', 'id', 'a.docx'))).toBe(
      false,
    )
    expect(isScratchDocument('')).toBe(false)
  })
})

describe('recents never list a scratch document', () => {
  it('drops it from the page and from both totals', () => {
    const junk = scratch()
    const page = pageRecentPaths(['/docs/a.docx', junk, '/docs/b.xlsx'], {}, new Set())
    expect(page.entries.map((e) => e.path)).toEqual(['/docs/a.docx', '/docs/b.xlsx'])
    expect(page.total).toBe(2)
    expect(page.totalAll).toBe(2)
  })
})

describe('the session record never brings a scratch document back', () => {
  it('does not record a tab on a scratch file', () => {
    const junk = scratch()
    const snapshot = sessionSnapshotFrom({
      strip: {
        tabs: [
          { id: 't1', kind: 'docs', title: 'empty.docx', filePath: junk },
          { id: 't2', kind: 'docs', title: 'real.docx', filePath: '/docs/real.docx' },
        ],
        activeId: 't2',
        split: null,
      },
    })
    expect(snapshot.tabs.map((t) => t.filePath)).toEqual(['/docs/real.docx'])
    expect(snapshot.active).toBe(0)
  })

  it('drops one stored by an older version and keeps the front tab right', () => {
    const junk = scratch()
    const parsed = parseSessionRecord({
      version: 1,
      cleanExit: false,
      startedAt: 1,
      restoreRun: false,
      tabs: [
        { kind: 'docs', title: 'empty.docx', filePath: junk },
        { kind: 'sheets', title: 'b.xlsx', filePath: '/docs/b.xlsx' },
      ],
      active: 1,
    })
    expect(parsed?.tabs).toEqual([{ kind: 'sheets', title: 'b.xlsx', filePath: '/docs/b.xlsx' }])
    expect(parsed?.active).toBe(0)
  })
})
