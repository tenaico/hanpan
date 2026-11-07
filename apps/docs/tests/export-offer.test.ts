import { describe, expect, it, vi } from 'vitest'
import { exportedFileLabel, reportExported } from '../src/renderer/export-offer'
import { ExportedFiles } from '../src/main/exported-files'

describe('exportedFileLabel', () => {
  it('shows the file name instead of the full path', () => {
    expect(exportedFileLabel(String.raw`C:\Users\ten\scratch\long\사업계획서.pdf`)).toBe(
      '사업계획서.pdf',
    )
    expect(exportedFileLabel('/tmp/a/b.md')).toBe('b.md')
    expect(exportedFileLabel(undefined)).toBe('')
  })
})

describe('reportExported', () => {
  it('sets the status and offers Open / Open folder for the written file', () => {
    const setStatus = vi.fn()
    const offerExported = vi.fn()
    reportExported({ setStatus, offerExported }, 'PDF를 내보냈습니다: a.pdf', '/x/a.pdf')
    expect(setStatus).toHaveBeenCalledWith('PDF를 내보냈습니다: a.pdf')
    expect(offerExported).toHaveBeenCalledWith({
      path: '/x/a.pdf',
      folder: false,
      message: 'PDF를 내보냈습니다: a.pdf',
    })
  })
  it('works without an offer sink (headless export)', () => {
    const setStatus = vi.fn()
    reportExported({ setStatus }, 'done', '/x/a.pdf')
    expect(setStatus).toHaveBeenCalledWith('done')
  })
})

describe('ExportedFiles', () => {
  it('only lets a tab open what it exported itself', () => {
    const files = new ExportedFiles()
    files.remember(1, '/x/a.pdf')
    expect(files.allows(1, '/x/a.pdf')).toBe(true)
    expect(files.allows(2, '/x/a.pdf')).toBe(false)
    expect(files.allows(1, '/x/other.pdf')).toBe(false)
    expect(files.allows(1, 42)).toBe(false)
    files.remember(1, '/x/images', true)
    expect(files.isFolder('/x/images')).toBe(true)
    expect(files.isFolder('/x/a.pdf')).toBe(false)
    files.forget(1)
    expect(files.allows(1, '/x/a.pdf')).toBe(false)
  })
})
