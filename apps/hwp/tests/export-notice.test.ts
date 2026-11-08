/**
 * 0.17 UI/UX review v2, hwp-design #7 and #8: what the tab says after a save or an export.
 * A PDF or Word export no longer opens a tab of its own; the notice names the file and offers
 * to open it or show its folder. Page pictures offer their folder. A manual save says so.
 */
import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { exportNoticeOf, savedNoticeOf } from '../src/renderer/export-notice'
import { strings } from '../src/renderer/i18n/strings'

describe('the notice after an export', () => {
  it('names the PDF and offers to open it or show its folder', () => {
    expect(exportNoticeOf('pdf', { ok: true, path: 'C:\\docs\\보고서.pdf' }, 3)).toEqual({
      key: 'exportedPdf',
      params: { name: '보고서.pdf' },
      path: 'C:\\docs\\보고서.pdf',
      actions: ['open', 'folder'],
    })
  })

  it('names the Word file the same way', () => {
    expect(exportNoticeOf('docx', { ok: true, path: '/home/u/a.docx' }, 0)?.key).toBe(
      'exportedDocx',
    )
    expect(exportNoticeOf('docx', { ok: true, path: '/home/u/a.docx' }, 0)?.actions).toEqual([
      'open',
      'folder',
    ])
  })

  it('counts the page pictures and offers their folder only', () => {
    expect(exportNoticeOf('png', { ok: true, path: 'D:/p/a-1.png' }, 4)).toEqual({
      key: 'exportedPng',
      params: { count: 4 },
      path: 'D:/p/a-1.png',
      actions: ['folder'],
    })
    expect(exportNoticeOf('pngPage', { ok: true, path: 'D:/p/a.png' }, 1)?.params).toEqual({
      count: 1,
    })
  })

  it('says nothing for a cancel, a failure or a print', () => {
    expect(exportNoticeOf('pdf', { ok: true, canceled: true }, 1)).toBeNull()
    expect(exportNoticeOf('pdf', { ok: false, error: 'x' }, 1)).toBeNull()
    expect(exportNoticeOf('print', { ok: true }, 1)).toBeNull()
  })
})

describe('the notice after a save', () => {
  it('names the file and offers its folder', () => {
    expect(savedNoticeOf('C:\\docs\\계획서.hwp')).toEqual({
      key: 'savedNotice',
      params: { name: '계획서.hwp' },
      path: 'C:\\docs\\계획서.hwp',
      actions: ['folder'],
    })
  })
})

describe('the words of those notices', () => {
  it('are in every UI language, with their placeholders', () => {
    for (const lang of LANGS) {
      const t = strings[lang]
      expect(t.savedNotice, lang).toContain('{name}')
      expect(t.exportedPdf, lang).toContain('{name}')
      expect(t.exportedDocx, lang).toContain('{name}')
      expect(t.exportedPng, lang).toContain('{count}')
      expect(t.noticeOpen, lang).toBeTruthy()
      expect(t.noticeOpenFolder, lang).toBeTruthy()
    }
    expect(strings.ko.noticeOpenFolder).toBe('폴더 열기')
  })
})
