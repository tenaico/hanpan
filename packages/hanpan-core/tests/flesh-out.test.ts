import { describe, expect, it } from 'vitest'
import { applyBodies, fleshOutJobs, parseFleshOut } from '../src/flesh-out'
import { outlineFromIndentedText } from '../src/outline'

const MAP = `AI 도입 계획
  추진 배경
    업무량 증가
  추진 일정
`

describe('flesh out', () => {
  it('numbers every topic of a branch and maps answers back', () => {
    const outline = outlineFromIndentedText(MAP)
    const jobs = fleshOutJobs(outline)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]!.user).toContain('{#1} 추진 배경')
    expect(jobs[0]!.user).toContain('  {#2} 업무량 증가')
    const answer =
      '여기 결과입니다\n{#1} 행정 수요가 늘어 AI 도입이 필요함\n- {#2}: 민원 처리량이 매년 증가함\n{#9} 없는 번호'
    const bodies = parseFleshOut(answer, jobs[0]!.keys)
    expect([...bodies.values()]).toEqual([
      '행정 수요가 늘어 AI 도입이 필요함',
      '민원 처리량이 매년 증가함',
    ])
    const filled = applyBodies(outline, bodies)
    expect(filled.nodes[0]!.children[0]!.body).toBe('민원 처리량이 매년 증가함')
    expect(filled.nodes[1]!.body).toBeUndefined()
  })

  it('writes the sentences in the UI language', () => {
    const outline = outlineFromIndentedText(MAP)
    expect(fleshOutJobs(outline)[0]!.system).toContain('개조식')
    expect(fleshOutJobs(outline, 'ko')[0]!.system).toContain('개조식')
    const vi = fleshOutJobs(outline, 'vi')[0]!
    expect(vi.system).toContain('Vietnamese')
    expect(vi.system).not.toMatch(/[가-힣]/)
    expect(vi.user).toContain('{#1} 추진 배경')
    expect(vi.user).not.toContain('보고서 제목')
    expect(fleshOutJobs(outline, 'en')[0]!.system).toContain('English')
    expect(fleshOutJobs(outline, 'zh-TW')[0]!.system).toContain('Traditional Chinese')
  })
})
