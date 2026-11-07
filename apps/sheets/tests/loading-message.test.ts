// What the status line says while a large workbook streams in (0.17 #1): plain words, not
// "<file>.xlsx을(를) 스트리밍하는 중" with the backing copy's internal name in it.
import { describe, expect, it } from 'vitest'
import { tFor } from '../src/renderer/i18n/locale'

describe('the streaming status line', () => {
  const params = { name: '새 스프레드시트-1a2b3c4d.xlsx', rows: '1,000 / 50,000' }

  it('reads as opening the file in Korean, without the file name or the word streaming', () => {
    const text = tFor('ko', 'appStreamingRows', params)
    expect(text.startsWith('파일을 여는 중')).toBe(true)
    expect(text).not.toContain('1a2b3c4d')
    expect(text).not.toContain('스트리밍')
  })

  it('reads the same way in English', () => {
    const text = tFor('en', 'appStreamingRows', params)
    expect(text.startsWith('Opening file')).toBe(true)
    expect(text).not.toContain('1a2b3c4d')
    expect(text).not.toMatch(/stream/i)
  })

  it('reads the same while the sheet is still being indexed', () => {
    expect(tFor('ko', 'appIndexing', params).startsWith('파일을 여는 중')).toBe(true)
    expect(tFor('ko', 'appIndexing', params)).not.toContain('인덱스')
    expect(tFor('en', 'appIndexing', params)).not.toMatch(/index/i)
  })
})
