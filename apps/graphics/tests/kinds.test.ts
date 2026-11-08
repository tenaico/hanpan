// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import {
  EXPORT_FORMATS,
  NEW_DOC_EXT,
  OPEN_EXTS,
  WRITABLE_EXTS,
  appLanguage,
  graphicsKindForPath,
} from '../src/shared/kinds'

describe('graphicsKindForPath', () => {
  it('routes by extension, ignoring case', () => {
    expect(graphicsKindForPath('C:\\p\\a.PSD')).toBe('photo')
    expect(graphicsKindForPath('/p/b.svg')).toBe('illust')
    expect(graphicsKindForPath('/p/c.vectorcraft')).toBe('illust')
    expect(graphicsKindForPath('/p/d.jpeg')).toBe('photo')
    expect(graphicsKindForPath('/p/e.pdf')).toBeUndefined()
    expect(graphicsKindForPath('/p/psd')).toBeUndefined()
  })

  it('lists only the formats the pinned web builds open (checked 2026-11-05: AVIF does not)', () => {
    expect([...OPEN_EXTS.photo]).toEqual([
      'psd',
      'psb',
      'png',
      'jpg',
      'jpeg',
      'webp',
      'gif',
      'bmp',
      'tif',
      'tiff',
      'heic',
      'heif',
    ])
    expect([...OPEN_EXTS.illust]).toEqual(['svg', 'svgz', 'ai', 'vectorcraft'])
    expect(graphicsKindForPath('/p/f.avif')).toBeUndefined()
  })

  it('never opens the same extension in both tabs', () => {
    const both = OPEN_EXTS.photo.filter((ext) => OPEN_EXTS.illust.includes(ext))
    expect(both).toEqual([])
  })

  it('writes the new-document formats and exports only raster or svg', () => {
    expect(WRITABLE_EXTS.photo).toContain(NEW_DOC_EXT.photo)
    expect(WRITABLE_EXTS.illust).toContain(NEW_DOC_EXT.illust)
    expect(EXPORT_FORMATS).toEqual({ photo: ['png', 'jpg'], illust: ['png', 'svg'] })
  })
})

describe('appLanguage', () => {
  it('follows the table', () => {
    expect(appLanguage('photo', 'ko')).toBe('ko')
    expect(appLanguage('illust', 'ko')).toBe('ko')
    expect(appLanguage('photo', 'pt')).toBe('pt-br')
    expect(appLanguage('illust', 'pt')).toBe('pt-br')
    expect(appLanguage('photo', 'ar')).toBe('ar')
    expect(appLanguage('illust', 'ar')).toBe('en')
    expect(appLanguage('illust', 'vi')).toBe('vi')
    for (const lang of ['zh', 'zh-TW', 'he', 'hi', 'th', 'ms'] as const) {
      expect(appLanguage('photo', lang)).toBe('en')
      expect(appLanguage('illust', lang)).toBe('en')
    }
  })

  it('has an answer for every Hanpan language', () => {
    for (const lang of LANGS) {
      expect(appLanguage('photo', lang)).toMatch(/^[a-z]{2}(-[a-z]+)?$/)
      expect(appLanguage('illust', lang)).toMatch(/^[a-z]{2}(-[a-z]+)?$/)
    }
  })
})
