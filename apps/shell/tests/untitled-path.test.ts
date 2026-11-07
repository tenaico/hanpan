// 새 PDF 파일 이름은 셸의 새 탭 이름처럼 "제목 없는 PDF", "제목 없는 PDF 2"로 늘어난다
// ("제목 없는 PDF-3.pdf"가 아니라). 0.17 리뷰 #15
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { untitledPathIn } from '../src/main/untitled-path'

describe('untitledPathIn', () => {
  it('numbers with a space, starting at 2', () => {
    const taken = new Set([join('D', '제목 없는 PDF.pdf'), join('D', '제목 없는 PDF 2.pdf')])
    const exists = (p: string) => taken.has(p)
    expect(untitledPathIn('D', '제목 없는 PDF', '.pdf', () => false)).toBe(
      join('D', '제목 없는 PDF.pdf'),
    )
    expect(untitledPathIn('D', '제목 없는 PDF', '.pdf', exists)).toBe(
      join('D', '제목 없는 PDF 3.pdf'),
    )
  })
})
