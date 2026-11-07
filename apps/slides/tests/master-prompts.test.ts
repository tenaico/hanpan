// 슬라이드 마스터의 PowerPoint 영문 안내 글("Click to edit Master title style")은 화면 언어로 보인다(0.17 UX v2 #20)
import { describe, expect, it } from 'vitest'
import { localizeMasterPrompts } from '../src/main/master-prompts'

const dict = {
  'Click to edit Master title style': '마스터 제목 스타일 편집',
  'Click to edit Master text styles': '마스터 텍스트 스타일 편집',
  'Second level': '둘째 수준',
}
const el = (texts: string[][]) => ({
  id: 'e',
  type: 'text',
  text: { paragraphs: texts.map((runs) => ({ runs: runs.map((text) => ({ text })) })) },
})

describe('localizeMasterPrompts', () => {
  it('replaces whole-paragraph prompts, also when split across runs, without touching the input', () => {
    const slide = {
      elements: [
        el([['Click to edit Master ', 'title style']]),
        el([['Click to edit Master text styles'], ['Second level'], ['우리 회사']]),
      ],
    }
    const out = localizeMasterPrompts(slide as never, dict)
    const texts = (i: number) =>
      (out.elements[i] as ReturnType<typeof el>).text.paragraphs.map((p) =>
        p.runs.map((r) => r.text).join(''),
      )
    expect(texts(0)).toEqual(['마스터 제목 스타일 편집'])
    expect(texts(1)).toEqual(['마스터 텍스트 스타일 편집', '둘째 수준', '우리 회사'])
    expect((slide.elements[0] as ReturnType<typeof el>).text.paragraphs[0]!.runs[0]!.text).toBe(
      'Click to edit Master ',
    )
  })
  it('returns the same slide when nothing matches', () => {
    const slide = { elements: [el([['hello']])] }
    expect(localizeMasterPrompts(slide as never, dict)).toBe(slide)
  })
})
